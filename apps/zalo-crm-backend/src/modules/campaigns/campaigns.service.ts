import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { GeminiAiOpsService } from '../chat/gemini-ai-ops.service';

@Injectable()
export class CampaignsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignsService.name);
  private schedulerInterval: NodeJS.Timeout | null = null;
  private abandonedCartInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiAiOpsService: GeminiAiOpsService,
  ) {}

  onModuleInit() {
    this.logger.log('Starting Campaign Scheduler & Automation Workers...');
    
    // Check scheduled campaigns every 30 seconds
    this.schedulerInterval = setInterval(() => {
      this.checkAndExecuteScheduledCampaigns().catch((err) => {
        this.logger.error('Error executing scheduled campaigns runner:', err);
      });
    }, 30_000);

    // Check abandoned carts & birthdays every 5 minutes
    this.abandonedCartInterval = setInterval(() => {
      this.checkAbandonedCartCampaigns().catch((err) => {
        this.logger.error('Error checking abandoned carts:', err);
      });
      this.checkBirthdayCampaigns().catch((err) => {
        this.logger.error('Error checking birthday campaigns:', err);
      });
    }, 300_000);
  }

  onModuleDestroy() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    if (this.abandonedCartInterval) {
      clearInterval(this.abandonedCartInterval);
      this.abandonedCartInterval = null;
    }
  }

  private async resolveTargetedUsers(targetSegment: string) {
    const segment = (targetSegment || 'ALL').toUpperCase();
    const tierMap: Record<string, string> = {
      SILVER: 'Báº¡c',
      GOLD: 'VÃ ng',
      DIAMOND: 'Kim cÆ°Æ¡ng',
    };
    let userWhere: any = {};

    if (tierMap[segment]) {
      userWhere.membershipTier = tierMap[segment];
    } else if (segment === 'INACTIVE_30_DAYS') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      userWhere.updatedAt = { lte: cutoff };
    } else if (segment === 'NEW_USERS_30_DAYS') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      userWhere.createdAt = { gte: cutoff };
    } else if (segment === 'RECENT_BUYERS_30_DAYS') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      userWhere.orders = {
        some: { createdAt: { gte: cutoff }, status: { in: ['COMPLETED', 'DELIVERED'] } },
      };
    } else if (segment === 'VIP' || segment === 'SPENT_1M_PLUS') {
      userWhere.totalSpent = { gte: 1000000 };
    } else if (segment === 'BIRTHDAY_THIS_MONTH') {
      userWhere.birthday = { not: null };
    } else if (segment === 'ORDER_COUNT_3_PLUS') {
      const orders = await this.prisma.order.groupBy({
        by: ['zaloUserId'],
        where: { status: { in: ['COMPLETED', 'DELIVERED'] }, zaloUserId: { not: null } },
        _count: { _all: true },
      });
      const userIds = orders
        .filter((order) => order._count._all >= 3)
        .map((order) => order.zaloUserId)
        .filter(Boolean) as string[];
      userWhere.zaloId = { in: userIds };
    } else if (segment.startsWith('LIST_')) {
      const listId = Number.parseInt(segment.slice(5), 10);
      if (!Number.isInteger(listId)) return [];
      const entries = await this.prisma.marketingListEntry.findMany({
        where: { listId, status: 'VERIFIED', hasZalo: true },
        select: { phone: true, zaloUid: true },
      });
      userWhere = {
        OR: [
          { phone: { in: entries.map((entry) => entry.phone).filter(Boolean) } },
          { zaloId: { in: entries.map((entry) => entry.zaloUid).filter(Boolean) } },
        ],
      };
    }

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: { zaloId: true, name: true, phone: true, membershipTier: true, birthday: true },
    });
    if (segment === 'BIRTHDAY_THIS_MONTH') {
      const month = new Date().getMonth();
      return users.filter((user) => user.birthday?.getMonth() === month);
    }
    return users;
  }

  private async removeRecentlyContactedUsers<T extends { zaloId: string }>(users: T[], dailyLimit = 1): Promise<T[]> {
    if (!users.length) return users;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.notification.findMany({
      where: {
        zaloUserId: { in: users.map((user) => user.zaloId) },
        type: 'PROMO',
        createdAt: { gte: since },
      },
      select: { zaloUserId: true },
    });
    const sentCount = new Map<string, number>();
    for (const notification of recent) {
      if (notification.zaloUserId) sentCount.set(notification.zaloUserId, (sentCount.get(notification.zaloUserId) || 0) + 1);
    }
    return users.filter((user) => (sentCount.get(user.zaloId) || 0) < Math.max(1, dailyLimit));
  }

  async previewTargetAudience(targetSegment: string) {
    const users = await this.resolveTargetedUsers(targetSegment);
    const eligibleUsers = await this.removeRecentlyContactedUsers(users);
    return {
      segment: (targetSegment || 'ALL').toUpperCase(),
      targetCount: eligibleUsers.length,
      suppressedCount: users.length - eligibleUsers.length,
      sample: eligibleUsers.slice(0, 8).map((user) => ({
        zaloId: user.zaloId,
        name: user.name,
        phone: user.phone,
        membershipTier: user.membershipTier,
      })),
    };
  }

  /**
   * AI-Powered Campaign Content Generator using Gemini AI
   */
  async generateAiCampaignContent(topic: string, targetSegment: string) {
    const prompt = `Viết tiêu đề chiến dịch tiếp thị và mô tả khuyến mãi ngắn gọn (dưới 40 từ) bằng tiếng Việt cho cửa hàng thời trang ShopQuiet Zalo Mini App. 
Chủ đề: "${topic || 'Khuyến mãi đặc biệt'}". 
Phân tập khách hàng: "${targetSegment || 'Tất cả'}". 
Yêu cầu trả về JSON có dạng {"title": "...", "description": "...", "suggestedVoucherValue": "10%"} không bọc markdown.`;

    try {
      const rawResult = await this.geminiAiOpsService.askGemini(prompt, { topic, targetSegment });
      let cleanJson = rawResult.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(cleanJson);
    } catch (e) {
      return {
        title: `ƯU ĐÃI ĐẶC BIỆT: ${topic || 'Siêu Sale ShopQuiet'}`,
        description: `Dành riêng cho khách hàng ${targetSegment || 'thân thiết'}! Nhận ngay voucher giảm giá cực sốc hôm nay.`,
        suggestedVoucherValue: '15%',
      };
    }
  }

  /**
   * Gemini AI ROI & Budget Predictor for Campaigns
   */
  async predictAiCampaign(dto: any) {
    const { type, targetSegment, bonusCoins, discountPercent, discountValue } = dto;
    const segment = targetSegment || 'ALL';

    // 1. Use the same audience rules as preview and real delivery.
    const totalUsersCount = (await this.resolveTargetedUsers(segment)).length;
    const targetCount = totalUsersCount || 10;

    // 2. Average Order Value
    const completedOrders = await this.prisma.order.findMany({
      where: { status: { in: ['COMPLETED', 'DELIVERED'] } },
      select: { totalAmount: true },
      take: 50,
    });
    const avgOrderVal = completedOrders.length > 0
      ? completedOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0) / completedOrders.length
      : 180000;

    // 3. Unit cost calculation
    let unitCost = 0;
    if (type === 'BONUS_COINS') unitCost = Number(bonusCoins) || 100;
    else if (type === 'VOUCHER') unitCost = Number(discountValue) || 30000;
    else if (type === 'FLASH_SALE') unitCost = (avgOrderVal * (Number(discountPercent) || 10)) / 100;
    else unitCost = 500;

    const openRatePct = 68;
    const convRatePct = type === 'VOUCHER' ? 22 : type === 'BONUS_COINS' ? 18 : 12;

    const estConvertedCount = Math.max(1, Math.round(targetCount * (convRatePct / 100)));
    const estBudget = Math.round(targetCount * unitCost);
    const estRevenue = Math.round(estConvertedCount * avgOrderVal);
    const estRoi = estBudget > 0 ? Math.round(((estRevenue - estBudget) / estBudget) * 100) : 100;

    return {
      targetAudienceCount: targetCount,
      estimatedBudget: estBudget,
      estimatedRevenue: estRevenue,
      estimatedRoi: estRoi,
      estimatedOpenRate: `${openRatePct}%`,
      estimatedConversionRate: `${convRatePct}%`,
      aiAdvice: `Dự đoán: Phát tới ${targetCount} khách hàng với mức giảm ${unitCost.toLocaleString('vi-VN')}đ có thể thu về ~${estRevenue.toLocaleString('vi-VN')}đ doanh thu với ROI ước tính ${estRoi}%.`,
    };
  }

  /**
   * Automatically trigger Welcome Campaign when a new user registers
   */
  async triggerWelcomeCampaign(zaloUserId: string) {
    try {
      const activeWelcomeCampaign = await this.prisma.campaign.findFirst({
        where: {
          targetSegment: 'NEW_USER_WELCOME',
          status: { in: ['RUNNING', 'COMPLETED'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeWelcomeCampaign) {
        await this.prisma.campaignUser.upsert({
          where: {
            campaignId_zaloUserId: { campaignId: activeWelcomeCampaign.id, zaloUserId },
          },
          update: {},
          create: { campaignId: activeWelcomeCampaign.id, zaloUserId },
        });

        const todayStr = new Date().toISOString().split('T')[0];
        await this.prisma.notification.create({
          data: {
            zaloUserId,
            title: `Chào mừng bạn đến với ShopQuiet!`,
            content: activeWelcomeCampaign.description || `Nhận ngay ưu đãi chào mừng thành viên mới từ chiến dịch ${activeWelcomeCampaign.title}!`,
            type: 'WELCOME',
            date: todayStr,
          },
        });

        this.logger.log(`[Auto-Trigger Welcome] Triggered welcome campaign #${activeWelcomeCampaign.id} for new user ${zaloUserId}`);
      }
    } catch (e) {
      this.logger.error('Failed to trigger welcome campaign:', e);
    }
  }

  /**
   * Automated Background Runner for Scheduled Campaigns
   */
  async checkAndExecuteScheduledCampaigns() {
    const now = new Date();
    const dueCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
    });

    // Do not send promotional notifications during the quiet window.
    for (const campaign of dueCampaigns) {
      const currentHour = now.getHours();
      const inQuietHours = campaign.quietHoursStart > campaign.quietHoursEnd
        ? currentHour >= campaign.quietHoursStart || currentHour < campaign.quietHoursEnd
        : currentHour >= campaign.quietHoursStart && currentHour < campaign.quietHoursEnd;
      if (inQuietHours) continue;
      this.logger.log(`[Auto-Scheduler] Auto-launching due campaign #${campaign.id}: "${campaign.title}"`);
      try {
        await this.launchCampaign(campaign.id);
      } catch (err) {
        this.logger.error(`[Auto-Scheduler] Failed to launch campaign #${campaign.id}:`, err);
      }
    }
  }

  /**
   * Automated Abandoned Cart Recovery Campaign Runner
   */
  async checkAbandonedCartCampaigns() {
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const abandonedCarts = await this.prisma.cartItem.findMany({
      where: {
        createdAt: { lte: twoHoursAgo },
      },
      include: {
        product: true,
        user: true,
      },
      take: 20,
    });

    const userCartMap = new Map<string, any[]>();
    for (const item of abandonedCarts) {
      if (!userCartMap.has(item.zaloUserId)) {
        userCartMap.set(item.zaloUserId, []);
      }
      userCartMap.get(item.zaloUserId)!.push(item);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (const [zaloUserId, items] of userCartMap.entries()) {
      const firstProduct = items[0]?.product?.name || 'Sản phẩm yêu thích';
      const count = items.length;

      // Check if user already got notified today
      const existingNotif = await this.prisma.notification.findFirst({
        where: {
          zaloUserId,
          type: 'ABANDONED_CART',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });

      if (!existingNotif) {
        await this.prisma.notification.create({
          data: {
            zaloUserId,
            title: `Giỏ hàng của bạn đang chờ!`,
            content: `Bạn có ${count} sản phẩm [${firstProduct}] trong giỏ hàng. Nhấn để chốt đơn ngay trước khi hết hàng!`,
            type: 'ABANDONED_CART',
            date: todayStr,
          },
        });
        this.logger.log(`[Abandoned Cart] Sent reminder notification to user ${zaloUserId}`);
      }
    }
  }

  /**
   * Automated Birthday Auto-Campaign Runner
   */
  async checkBirthdayCampaigns() {
    const today = new Date();
    const usersWithBirthday = await this.prisma.user.findMany({
      where: { birthday: { not: null } },
    });
    const users = usersWithBirthday.filter(
      (user) => user.birthday &&
        user.birthday.getMonth() === today.getMonth() &&
        user.birthday.getDate() === today.getDate(),
    );

    const todayFullStr = new Date().toISOString().split('T')[0];

    for (const u of users) {
      const existingBirthdayNotif = await this.prisma.notification.findFirst({
        where: {
          zaloUserId: u.zaloId,
          type: 'BIRTHDAY',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });

      if (!existingBirthdayNotif) {
        // Award 100,000 Xu birthday bonus
        await this.prisma.user.update({
          where: { zaloId: u.zaloId },
          data: { gamificationPoints: { increment: 100000 } },
        });

        await this.prisma.pointsHistory.create({
          data: {
            zaloUserId: u.zaloId,
            points: 100000,
            reason: `Quà tặng sinh nhật: +100.000 Xu từ ShopQuiet!`,
            metadata: { type: 'BIRTHDAY_BONUS' },
          },
        });

        await this.prisma.notification.create({
          data: {
            zaloUserId: u.zaloId,
            title: `Chúc Mừng Sinh Nhật ${u.name}!`,
            content: `ShopQuiet tặng bạn 100.000 Xu quà tặng mừng sinh nhật. Chúc bạn một ngày thật tuyệt vời!`,
            type: 'BIRTHDAY',
            date: todayFullStr,
          },
        });
        this.logger.log(`[Birthday Campaign] Awarded 100k coins birthday bonus to ${u.name} (${u.zaloId})`);
      }
    }
  }

  /**
   * Process Viral Referral Link Share Rewards
   */
  async processReferralReward(inviterZaloId: string, invitedZaloId: string) {
    if (inviterZaloId === invitedZaloId) return { success: false, message: 'Cannot refer self' };

    try {
      // Reward 10,000 Xu to inviter
      await this.prisma.user.update({
        where: { zaloId: inviterZaloId },
        data: { gamificationPoints: { increment: 10000 } },
      });

      await this.prisma.pointsHistory.create({
        data: {
          zaloUserId: inviterZaloId,
          points: 10000,
          reason: `Thưởng giới thiệu bạn bè tham gia Zalo Mini App: +10.000 Xu`,
          metadata: { invitedZaloId },
        },
      });

      const todayStr = new Date().toISOString().split('T')[0];
      await this.prisma.notification.create({
        data: {
          zaloUserId: inviterZaloId,
          title: `Nhận 10.000 Xu giới thiệu thành công!`,
          content: `Bạn bè của bạn đã tham gia ShopQuiet từ link chiến dịch của bạn. Bạn nhận được +10.000 Xu!`,
          type: 'REFERRAL',
          date: todayStr,
        },
      });

      return { success: true, rewardPoints: 10000 };
    } catch (e) {
      return { success: false };
    }
  }

  async create(dto: CreateCampaignDto) {
    const status = dto.scheduledAt ? 'SCHEDULED' : 'DRAFT';
    const campaign = await this.prisma.campaign.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        type: dto.type.toUpperCase(),
        targetSegment: dto.targetSegment ? dto.targetSegment.toUpperCase() : 'ALL',
        voucherCode: dto.voucherCode ? dto.voucherCode.trim().toUpperCase() : null,
        bonusCoins: dto.bonusCoins || 0,
        discountPercent: dto.discountPercent || 0,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status,
        approvalStatus: dto.approvalRequired ? 'PENDING' : 'NOT_REQUIRED',
        dailyLimit: dto.dailyLimit || 1,
        quietHoursStart: dto.quietHoursStart ?? 22,
        quietHoursEnd: dto.quietHoursEnd ?? 7,
        experimentKey: dto.experimentKey?.trim() || null,
        variantLabel: dto.variantLabel?.trim() || null,
      },
    });
    await this.prisma.campaignHistory.create({
      data: { campaignId: campaign.id, action: 'CREATED', details: { status, approvalRequired: Boolean(dto.approvalRequired) } },
    });
    return campaign;
  }

  async findAll() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        users: {
          take: 50,
          include: {
            user: {
              select: {
                zaloId: true,
                name: true,
                avatar: true,
                membershipTier: true,
              },
            },
          },
        },
      },
    });
    if (!campaign) {
      throw new NotFoundException('Không tìm thấy chiến dịch.');
    }
    return campaign;
  }

  async launchCampaign(id: number) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new NotFoundException('Không tìm thấy chiến dịch.');
    }
    if (campaign.status === 'COMPLETED') {
      throw new BadRequestException('Chiến dịch này đã hoàn thành trước đó.');
    }

    if (campaign.status === 'PAUSED') {
      throw new BadRequestException('Campaign is paused. Resume it before launching.');
    }
    if (campaign.approvalStatus === 'PENDING') {
      throw new BadRequestException('Campaign approval is required before launching.');
    }

    const segment = campaign.targetSegment;

    const targetedUsers = await this.removeRecentlyContactedUsers(
      await this.resolveTargetedUsers(segment),
      campaign.dailyLimit,
    );

    if (targetedUsers.length === 0) {
      throw new BadRequestException('Không tìm thấy người dùng phù hợp với phân tập khách hàng này.');
    }

    // Process campaign rewards / notifications inside transaction
    await this.prisma.$transaction(async (tx) => {
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Create CampaignUser records
      for (const u of targetedUsers) {
        await tx.campaignUser.upsert({
          where: {
            campaignId_zaloUserId: {
              campaignId: id,
              zaloUserId: u.zaloId,
            },
          },
          update: {},
          create: {
            campaignId: id,
            zaloUserId: u.zaloId,
          },
        });

        // 2. If campaign is BONUS_COINS, award points directly to targeted users
        if (campaign.type === 'BONUS_COINS' && campaign.bonusCoins > 0) {
          await tx.user.update({
            where: { zaloId: u.zaloId },
            data: {
              gamificationPoints: { increment: campaign.bonusCoins },
            },
          });

          await tx.pointsHistory.create({
            data: {
              zaloUserId: u.zaloId,
              points: campaign.bonusCoins,
              reason: `Nhận ${campaign.bonusCoins} Xu từ chiến dịch: ${campaign.title}`,
              metadata: { campaignId: id },
            },
          });
        }

        // 3. Create Notification for user
        await tx.notification.create({
          data: {
            zaloUserId: u.zaloId,
            title: `Chiến dịch mới: ${campaign.title}`,
            content: campaign.description || `Bạn nhận được ưu đãi từ chiến dịch ${campaign.title}!`,
            type: 'PROMO',
            date: todayStr,
          },
        });
      }

      // Update campaign status
      await tx.campaign.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          startedAt: new Date(),
          endedAt: new Date(),
          totalTargeted: targetedUsers.length,
        },
      });
    });

    this.logger.log(`Campaign #${id} "${campaign.title}" launched successfully to ${targetedUsers.length} users.`);
    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    const nextStatus = status.toUpperCase();
    if (!['PAUSED', 'RESUME'].includes(nextStatus)) {
      throw new BadRequestException('Status must be PAUSED or RESUME.');
    }
    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      throw new BadRequestException('Finished campaigns cannot be changed.');
    }
    const resumedStatus = campaign.scheduledAt && campaign.scheduledAt > new Date() ? 'SCHEDULED' : 'DRAFT';
    return this.prisma.campaign.update({
      where: { id },
      data: { status: nextStatus === 'PAUSED' ? 'PAUSED' : resumedStatus },
    });
  }

  async requestApproval(id: number, actorId?: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      throw new BadRequestException('Finished campaigns cannot be submitted.');
    }
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { approvalStatus: 'PENDING' },
    });
    await this.prisma.campaignHistory.create({
      data: { campaignId: id, action: 'SUBMITTED_FOR_APPROVAL', actorId: actorId || null },
    });
    return updated;
  }

  async approve(id: number, actorId?: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { approvalStatus: 'APPROVED', approvedAt: new Date(), approvedBy: actorId || 'admin' },
    });
    await this.prisma.campaignHistory.create({
      data: { campaignId: id, action: 'APPROVED', actorId: actorId || null },
    });
    return updated;
  }

  async getHistory(id: number) {
    await this.findOne(id);
    return this.prisma.campaignHistory.findMany({ where: { campaignId: id }, orderBy: { createdAt: 'desc' } });
  }

  async listTemplates() {
    return this.prisma.campaignTemplate.findMany({ where: { active: true }, orderBy: { updatedAt: 'desc' } });
  }

  async createTemplate(data: { name: string; description?: string; type: string; targetSegment?: string; content: string; voucherCode?: string; bonusCoins?: number; discountPercent?: number }) {
    if (!data.name?.trim() || !data.content?.trim()) throw new BadRequestException('Template name and content are required.');
    return this.prisma.campaignTemplate.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        type: data.type.toUpperCase(),
        targetSegment: data.targetSegment?.toUpperCase() || 'ALL',
        content: data.content.trim(),
        voucherCode: data.voucherCode?.trim().toUpperCase() || null,
        bonusCoins: data.bonusCoins || 0,
        discountPercent: data.discountPercent || 0,
      },
    });
  }

  async getActiveForUser(zaloUserId: string) {
    const campaignUsers = await this.prisma.campaignUser.findMany({
      where: { zaloUserId },
      include: {
        campaign: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return campaignUsers.map((cu) => ({
      id: cu.campaign.id,
      title: cu.campaign.title,
      description: cu.campaign.description,
      type: cu.campaign.type,
      voucherCode: cu.campaign.voucherCode,
      bonusCoins: cu.campaign.bonusCoins,
      isOpened: cu.isOpened,
      createdAt: cu.createdAt,
    }));
  }

  async trackOpen(campaignId: number, zaloUserId: string) {
    const cu = await this.prisma.campaignUser.findUnique({
      where: {
        campaignId_zaloUserId: {
          campaignId,
          zaloUserId,
        },
      },
    });

    if (cu && !cu.isOpened) {
      await this.prisma.campaignUser.update({
        where: { id: cu.id },
        data: { isOpened: true, openedAt: new Date() },
      });

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { totalOpened: { increment: 1 } },
      });
    }

    return { success: true };
  }

  /**
   * Called by OrdersService when an order is created to track conversion & ROI.
   */
  async recordConversion(zaloUserId: string, totalAmount: number, voucherCode?: string) {
    try {
      const campaignUser = await this.prisma.campaignUser.findFirst({
        where: {
          zaloUserId,
          isConverted: false,
          campaign: voucherCode
            ? { voucherCode: voucherCode.trim().toUpperCase() }
            : { status: 'COMPLETED' },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (campaignUser) {
        await this.prisma.campaignUser.update({
          where: { id: campaignUser.id },
          data: { isConverted: true },
        });

        await this.prisma.campaign.update({
          where: { id: campaignUser.campaignId },
          data: {
            totalConverted: { increment: 1 },
            revenueGenerated: { increment: totalAmount },
          },
        });

        this.logger.log(
          `[ROI Tracking] Recorded conversion for Campaign #${campaignUser.campaignId}: +1 Order (${totalAmount} VND) from user ${zaloUserId}`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to record campaign conversion:', err);
    }
  }

  async remove(id: number) {
    return this.prisma.campaign.delete({ where: { id } });
  }
}
