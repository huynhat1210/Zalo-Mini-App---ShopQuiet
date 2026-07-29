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

    // Calculate reward based on real-time day of week in Vietnam time (UTC+7)
    const vnDateStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnDateStr);
    const dayOfWeek = vnDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Weekly day-of-week rewards:
    // T2: +100, T3: +150, T4: +200, T5: +250, T6: +300, T7: +400, CN: +500
    const dayRewardMap: Record<number, { name: string; points: number }> = {
      1: { name: 'Thứ 2', points: 100 },
      2: { name: 'Thứ 3', points: 150 },
      3: { name: 'Thứ 4', points: 200 },
      4: { name: 'Thứ 5', points: 250 },
      5: { name: 'Thứ 6', points: 300 },
      6: { name: 'Thứ 7', points: 400 },
      0: { name: 'Chủ Nhật', points: 500 },
    };

    const currentDayConfig = dayRewardMap[dayOfWeek] || { name: 'Ngày', points: 200 };
    const rewardPoints = currentDayConfig.points;

    // Create claim record
    await this.prisma.dailyRewardClaim.create({
      data: {
        zaloUserId,
        points: rewardPoints,
        consecutiveDays,
      },
    });

    // Add xu points to user balance
    await this.addPoints(zaloUserId, rewardPoints, `Điểm danh ngày ${currentDayConfig.name}`);

    // Create Notification
    try {
      await this.prisma.notification.create({
        data: {
          zaloUserId,
          type: 'system',
          title: `📍 Điểm danh ${currentDayConfig.name} thành công`,
          content: `Chúc mừng! Bạn nhận được +${rewardPoints} xu từ điểm danh ${currentDayConfig.name}.`,
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
      message: `Điểm danh ${currentDayConfig.name} thành công! +${rewardPoints} Xu`,
      rewardPoints,
      consecutiveDays,
      dayName: currentDayConfig.name,
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
    const [user, todayClaim, pointsHistory] = await Promise.all([
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
      achievements: [],
      pointsHistory,
    };
  }

  async checkAchievements(_zaloUserId: string) {
    // Deprecated: Achievements system removed in favor of direct Xu Coin Rewards
    return;
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
    const exchangeCosts: Record<string, number> = {
      DISCOUNT10: 100,
      DISCOUNT20: 250,
      DISCOUNT50: 500,
    };
    const expectedCost = exchangeCosts[voucherCode.toUpperCase()];
    if (!expectedCost || pointsCost !== expectedCost) {
      return { success: false, message: 'Chi phí đổi voucher không hợp lệ.' };
    }

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

  async processReferral(zaloUserId: string, referrerCode: string) {
    if (!zaloUserId || !referrerCode) return { success: false, message: 'Thiếu thông tin giới thiệu' };

    const cleanCode = referrerCode.replace('REF-', '').trim();
    const referrer = await this.prisma.user.findFirst({
      where: {
        OR: [
          { zaloId: cleanCode },
          { zaloId: { startsWith: cleanCode } },
        ],
      },
    });

    if (!referrer) {
      return { success: false, message: 'Mã giới thiệu không tồn tại!' };
    }

    if (referrer.zaloId === zaloUserId) {
      return { success: false, message: 'Không thể tự giới thiệu chính mình!' };
    }

    const existingBonus = await this.prisma.pointsHistory.findFirst({
      where: {
        zaloUserId: referrer.zaloId,
        reason: { contains: `Giới thiệu người dùng ${zaloUserId}` },
      },
    });

    if (existingBonus) {
      return { success: false, message: 'Đã nhận thưởng giới thiệu trước đó!' };
    }

    const bonusPoints = 50;
    await this.addPoints(referrer.zaloId, bonusPoints, `Giới thiệu người dùng ${zaloUserId} qua Zalo`);
    await this.addPoints(zaloUserId, 20, `Nhập mã giới thiệu từ ${referrer.name || referrer.zaloId}`);

    return {
      success: true,
      message: `Đã cộng +${bonusPoints} điểm thưởng giới thiệu thành công!`,
      referrerName: referrer.name,
    };
  }
}
