import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

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
      throw new Error('Đã nhận thưởng đăng nhập hôm nay!');
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

    // Reward formula: base 10 points + 5 points per consecutive day (max 7 days)
    const rewardPoints = Math.min(10 + (consecutiveDays - 1) * 5, 45);

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

    return {
      success: true,
      points: rewardPoints,
      consecutiveDays,
      message: `Nhận ${rewardPoints} điểm!`,
    };
  }

  async addPoints(zaloUserId: string, points: number, reason: string, metadata?: Record<string, any>) {
    // Update user points
    const user = await this.prisma.user.findUnique({
      where: { zaloId: zaloUserId },
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    const newTotalPoints = (user.totalSpent || 0) + points;

    await this.prisma.user.update({
      where: { zaloId: zaloUserId },
      data: { totalSpent: newTotalPoints },
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
    const [user, todayClaim, achievements, pointsHistory] = await Promise.all([
      this.prisma.user.findUnique({
        where: { zaloId: zaloUserId },
        select: { totalSpent: true, membershipTier: true },
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
      points: user?.totalSpent || 0,
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

    // Define achievements
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
      if (achievement.condition && !unlockedAchievementIds.includes(achievement.id)) {
        await this.prisma.userAchievement.create({
          data: {
            zaloUserId,
            achievementId: achievement.id,
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
}
