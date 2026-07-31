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

@Injectable()
export class CampaignsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignsService.name);
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('Starting Campaign Scheduler Worker (checks every 30 seconds)...');
    this.schedulerInterval = setInterval(() => {
      this.checkAndExecuteScheduledCampaigns().catch((err) => {
        this.logger.error('Error executing scheduled campaigns runner:', err);
      });
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  /**
   * Background runner that automatically launches campaigns scheduled for execution.
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
            title: `🎁 Chiến dịch mới: ${campaign.title}`,
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
      // Find candidate campaign for this user or voucher
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
