import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

export interface ClaimDailyRewardDto {
  zaloUserId: string;
}

export interface AddPointsDto {
  zaloUserId: string;
  points: number;
  reason: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class GamificationService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async claimDailyReward(zaloUserId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already claimed today
    const existingClaim = await this.prisma.dailyRewardClaim.findFirst({
      where: {
        zaloUserId,
        claimedAt: { gte: today },
      },
    });

    if (existingClaim) {
      return {
        success: false,
        message: 'Hôm nay bạn đã điểm danh rồi!',
      };
    }

    // Calculate reward based on consecutive days
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayClaim = await this.prisma.dailyRewardClaim.findFirst({
      where: {
        zaloUserId,
        claimedAt: { gte: yesterday, lt: today },
      },
    });

    let consecutiveDays = 1;
    if (yesterdayClaim) {
      consecutiveDays = (yesterdayClaim.consecutiveDays || 0) + 1;
    }

    // Get user's membership tier for points multiplier
    const user = await this.prisma.user.findUnique({
      where: { zaloId: zaloUserId },
      select: { membershipTier: true },
    });

    const tierMultiplier = await this.usersService.getTierDailyPointsMultiplier(
      user?.membershipTier || 'Đồng',
    );

    // Reward formula: base 10 points + 5 points per consecutive day (max 7 days), then apply tier multiplier
    const basePoints = Math.min(10 + (consecutiveDays - 1) * 5, 45);
    const rewardPoints = Math.round(basePoints * tierMultiplier);

    // Create claim record
    await this.prisma.dailyRewardClaim.create({
      data: {
        zaloUserId,
        points: rewardPoints,
        consecutiveDays,
      },
    });

    // Add points to user
    await this.addPoints(zaloUserId, rewardPoints, 'Đăng nhập hàng ngày');

    // Check for achievements
    await this.checkAchievements(zaloUserId);

    // Create Notification
    try {
      await this.prisma.notification.create({
        data: {
          zaloUserId,
          type: 'promotion',
          title: `📍 Điểm danh thành công`,
          content: `Chúc mừng! Bạn đã nhận được +${rewardPoints} điểm thưởng (chuỗi điểm danh liên tục: ${consecutiveDays} ngày).`,
          date:
            new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }) +
            ' - ' +
            new Date().toLocaleDateString('vi-VN'),
          read: false,
        },
      });
    } catch (e) {
      console.error('Failed to create gamification notification:', e);
    }

    return {
      success: true,
      points: rewardPoints,
      consecutiveDays,
      message: `Nhận ${rewardPoints} điểm!`,
    };
  }

  async addPoints(
    zaloUserId: string,
    points: number,
    reason: string,
    metadata?: Record<string, any>,
  ) {
    // Update user gamification points
    const user = await this.prisma.user.findUnique({
      where: { zaloId: zaloUserId },
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    const newTotalPoints = (user.gamificationPoints || 0) + points;

    await this.prisma.user.update({
      where: { zaloId: zaloUserId },
      data: { gamificationPoints: newTotalPoints },
    });

    // Create points history record
    await this.prisma.pointsHistory.create({
      data: {
        zaloUserId,
        points,
        reason,
        metadata: metadata || {},
      },
    });

    return { success: true, newTotalPoints };
  }

  async getUserGamification(zaloUserId: string) {
    try {
      await this.checkAchievements(zaloUserId);
    } catch (e) {
      console.error(
        'Error pre-checking achievements in getUserGamification:',
        e,
      );
    }

    const [user, todayClaim, achievements, pointsHistory] = await Promise.all([
      this.prisma.user.findUnique({
        where: { zaloId: zaloUserId },
        select: {
          totalSpent: true,
          membershipTier: true,
          gamificationPoints: true,
        },
      }),
      this.prisma.dailyRewardClaim.findFirst({
        where: {
          zaloUserId,
          claimedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.userAchievement.findMany({
        where: { zaloUserId },
        include: { achievement: true },
      }),
      this.prisma.pointsHistory.findMany({
        where: { zaloUserId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      points: user?.gamificationPoints || 0,
      membershipTier: user?.membershipTier || 'Đồng',
      hasClaimedToday: !!todayClaim,
      achievements: achievements.map((ua) => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        unlockedAt: ua.unlockedAt,
      })),
      pointsHistory,
    };
  }

  async checkAchievements(zaloUserId: string) {
    // 1. Seed static achievements dynamically if not exists
    const achievementsToSeed = [
      {
        id: 1,
        name: 'Khách hàng mới',
        description: 'Đặt đơn hàng đầu tiên',
        icon: '🎉',
        condition: 'orders >= 1',
      },
      {
        id: 2,
        name: 'Người mua sắm',
        description: 'Đặt 5 đơn hàng',
        icon: '🛍️',
        condition: 'orders >= 5',
      },
      {
        id: 3,
        name: 'Sành điệu',
        description: 'Lưu 10 sản phẩm',
        icon: '❤️',
        condition: 'favorites >= 10',
      },
      {
        id: 4,
        name: 'Người đánh giá',
        description: 'Viết 5 đánh giá',
        icon: '⭐',
        condition: 'comments >= 5',
      },
      {
        id: 5,
        name: 'VIP',
        description: 'Chi tiêu trên 1 triệu',
        icon: '👑',
        condition: 'points >= 1000000',
      },
    ];

    for (const ach of achievementsToSeed) {
      await this.prisma.achievement.upsert({
        where: { id: ach.id },
        update: {
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          condition: ach.condition,
        },
        create: {
          id: ach.id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          condition: ach.condition,
        },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { zaloId: zaloUserId },
      include: {
        orders: true,
        comments: true,
        favorites: true,
      },
    });

    if (!user) return;

    const unlockedAchievementIds = (
      await this.prisma.userAchievement.findMany({
        where: { zaloUserId },
        select: { achievementId: true },
      })
    ).map((ua) => ua.achievementId);

    // Define achievements check
    const achievements = [
      {
        id: 1,
        name: 'Khách hàng mới',
        description: 'Đặt đơn hàng đầu tiên',
        condition: user.orders.length >= 1,
        icon: '🎉',
      },
      {
        id: 2,
        name: 'Người mua sắm',
        description: 'Đặt 5 đơn hàng',
        condition: user.orders.length >= 5,
        icon: '🛍️',
      },
      {
        id: 3,
        name: 'Sành điệu',
        description: 'Lưu 10 sản phẩm',
        condition: user.favorites.length >= 10,
        icon: '❤️',
      },
      {
        id: 4,
        name: 'Người đánh giá',
        description: 'Viết 5 đánh giá',
        condition: user.comments.length >= 5,
        icon: '⭐',
      },
      {
        id: 5,
        name: 'VIP',
        description: 'Chi tiêu trên 1 triệu',
        condition: (user.totalSpent || 0) >= 1000000,
        icon: '👑',
      },
    ];

    for (const achievement of achievements) {
      if (
        achievement.condition &&
        !unlockedAchievementIds.includes(achievement.id)
      ) {
        await this.prisma.userAchievement.create({
          data: {
            zaloUserId,
            achievementId: achievement.id,
          },
        });

        // Auto create notification log for unlocking achievement
        try {
          await this.prisma.notification.create({
            data: {
              zaloUserId,
              type: 'promotion',
              title: `🏆 Đạt huy hiệu mới: ${achievement.name}`,
              content: `Chúc mừng bạn đã đạt được thành tựu "${achievement.name}" (${achievement.description})!`,
              date:
                new Date().toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                }) +
                ' - ' +
                new Date().toLocaleDateString('vi-VN'),
              read: false,
            },
          });
        } catch (e) {
          console.error(
            `Failed to create notification for achievement ${achievement.name}:`,
            e,
          );
        }
      } else if (
        !achievement.condition &&
        unlockedAchievementIds.includes(achievement.id)
      ) {
        // Remove achievement if condition is no longer met
        await this.prisma.userAchievement.delete({
          where: {
            zaloUserId_achievementId: {
              zaloUserId,
              achievementId: achievement.id,
            },
          },
        });
      }
    }
  }

  async getLeaderboard(limit = 10) {
    const topUsers = await this.prisma.user.findMany({
      orderBy: { totalSpent: 'desc' },
      take: limit,
      select: {
        zaloId: true,
        name: true,
        avatar: true,
        totalSpent: true,
        membershipTier: true,
      },
    });

    return topUsers.map((user, index) => ({
      rank: index + 1,
      zaloId: user.zaloId,
      name: user.name,
      avatar: user.avatar,
      points: user.totalSpent || 0,
      membershipTier: user.membershipTier,
    }));
  }

  async exchangeVoucher(
    zaloUserId: string,
    voucherCode: string,
    pointsCost: number,
  ) {
    // 1. Ensure the voucher exists (seed/upsert statically if not in DB to prevent failure)
    const vouchersToSeed = [
      {
        code: 'DISCOUNT10',
        type: 'fixed',
        value: 10000,
        minOrderVal: 50000,
        maxDiscount: 10000,
      },
      {
        code: 'DISCOUNT20',
        type: 'fixed',
        value: 20000,
        minOrderVal: 100000,
        maxDiscount: 20000,
      },
      {
        code: 'DISCOUNT50',
        type: 'fixed',
        value: 50000,
        minOrderVal: 200000,
        maxDiscount: 50000,
      },
    ];

    for (const v of vouchersToSeed) {
      await this.prisma.voucher.upsert({
        where: { code: v.code },
        update: {
          type: v.type,
          value: v.value,
          minOrderVal: v.minOrderVal,
          maxDiscount: v.maxDiscount,
        },
        create: {
          code: v.code,
          type: v.type,
          value: v.value,
          minOrderVal: v.minOrderVal,
          maxDiscount: v.maxDiscount,
          stock: 999,
        },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { zaloId: zaloUserId },
    });

    if (!user) {
      return { success: false, message: 'Không tìm thấy người dùng!' };
    }

    if ((user.gamificationPoints || 0) < pointsCost) {
      return { success: false, message: 'Bạn không đủ điểm tích lũy!' };
    }

    const voucher = await this.prisma.voucher.findUnique({
      where: { code: voucherCode },
    });

    if (!voucher) {
      return { success: false, message: 'Mã voucher không tồn tại!' };
    }

    if (voucher.stock <= 0) {
      return { success: false, message: 'Voucher này đã hết lượt đổi!' };
    }

    // Execute exchange
    await this.prisma.$transaction(async (tx) => {
      // Deduct user gamification points
      await tx.user.update({
        where: { zaloId: zaloUserId },
        data: {
          gamificationPoints: { decrement: pointsCost },
        },
      });

      // Decrement voucher stock
      await tx.voucher.update({
        where: { code: voucherCode },
        data: {
          stock: { decrement: 1 },
        },
      });

      // Create PointsHistory log
      await tx.pointsHistory.create({
        data: {
          zaloUserId,
          points: -pointsCost,
          reason: `Đổi mã voucher ${voucherCode}`,
        },
      });

      // Create Notification
      await tx.notification.create({
        data: {
          zaloUserId,
          type: 'promotion',
          title: `🎁 Đổi quà thành công`,
          content: `Chúc mừng bạn đã đổi thành công mã voucher: ${voucherCode} (-${voucher.value.toLocaleString('vi-VN')}đ) bằng ${pointsCost} điểm tích lũy. Áp dụng ngay khi thanh toán!`,
          date:
            new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }) +
            ' - ' +
            new Date().toLocaleDateString('vi-VN'),
          read: false,
        },
      });
    });

    return {
      success: true,
      message: `Đổi voucher ${voucherCode} thành công!`,
      voucherCode,
    };
  }
}
