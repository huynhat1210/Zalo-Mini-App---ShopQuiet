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

    // 1. Calculate target audience count in DB
    let userWhere: any = {};
    if (['SILVER', 'GOLD', 'DIAMOND'].includes(segment)) {
      const tierMap: Record<string, string> = { SILVER: 'Bạc', GOLD: 'Vàng', DIAMOND: 'Kim cương' };
      userWhere.membershipTier = tierMap[segment] || segment;
    } else if (segment === 'INACTIVE_30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      userWhere.updatedAt = { lte: thirtyDaysAgo };
    } else if (segment === 'VIP') {
      userWhere.totalSpent = { gte: 1000000 };
    }

    const totalUsersCount = await this.prisma.user.count({ where: userWhere });
    const targetCount = totalUsersCount || 10;

    // 2. Average Order Value
    const completedOrders = await this.prisma.order.findMany({
      where: { status: { in: ['COMPLETED', 'DELIVERED'] } },
      select: { totalAmount: true },
      take: 50,
    });
    const avgOrderVal = completedOrders.length > 0
      ? completedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0) / completedOrders.length
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

    for (const campaign of dueCampaigns) {
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
    const todayStr = new Date().toISOString().slice(5, 10); // MM-DD
    const users = await this.prisma.user.findMany({
      where: {
        birthday: { contains: todayStr },
      },
    });

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
    return this.prisma.campaign.create({
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
      },
    });
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

    // Segment targeted users
    let userWhere: any = {};
    const segment = campaign.targetSegment;

    if (['SILVER', 'GOLD', 'DIAMOND'].includes(segment)) {
      const tierMap: Record<string, string> = {
        SILVER: 'Bạc',
        GOLD: 'Vàng',
        DIAMOND: 'Kim cương',
      };
      userWhere.membershipTier = tierMap[segment] || segment;
    } else if (segment === 'INACTIVE_30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      userWhere.updatedAt = { lte: thirtyDaysAgo };
    } else if (segment === 'VIP') {
      userWhere.totalSpent = { gte: 1000000 };
    }

    const targetedUsers = await this.prisma.user.findMany({
      where: userWhere,
      select: { zaloId: true, name: true, phone: true },
    });

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
