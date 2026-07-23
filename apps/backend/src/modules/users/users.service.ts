import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async syncUser(
    zaloId: string,
    name: string,
    avatar?: string,
    phone?: string,
    birthday?: string,
    email?: string,
    gender?: string,
    membershipTier?: string,
  ) {
    if (!zaloId) return null;

    console.log('[syncUser Debug] Received parameters:', {
      zaloId,
      name,
      avatar,
      phone,
      birthday,
      email,
      gender,
    });

    // Check if the user already exists in the database
    const existingUser = await this.prisma.user.findUnique({
      where: { zaloId },
    });

    const role = existingUser?.role
      ? existingUser.role
      : zaloId.toLowerCase() === 'admin' ||
          zaloId.toLowerCase() === 'admin-zalo-id-1'
        ? 'admin'
        : 'user';

    // If they already have a name/avatar in the DB, preserve it unless the incoming name/avatar is a real Zalo profile (not default guest)
    const finalName =
      name && name !== '' && name !== 'Người dùng Zalo' && name !== 'Khách'
        ? name
        : existingUser?.name || name || 'Người dùng Zalo';

    const finalAvatar =
      avatar && avatar !== '' && !avatar.includes('emoticon/avatar')
        ? avatar
        : existingUser?.avatar ||
          avatar ||
          'https://zalo-api.zdn.vn/api/emoticon/avatar';

    const isNewUser = !existingUser;

    // First upsert to make sure user exists in DB
    const user = await this.prisma.user.upsert({
      where: { zaloId },
      update: {
        name: finalName,
        avatar: finalAvatar,
        role,
        ...(phone !== undefined && { phone }),
        ...(birthday !== undefined && { birthday }),
        ...(email !== undefined && { email }),
        ...(gender !== undefined && { gender }),
      },
      create: {
        zaloId,
        name,
        avatar: finalAvatar,
        phone,
        birthday,
        email,
        gender,
        role,
      },
    });

    // Sum totalAmount of all COMPLETED and DELIVERED orders
    // Annual Tier Rule: Calculate completed orders within the last 365 days (annual rolling window)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const completedOrders = await this.prisma.order.findMany({
      where: {
        zaloUserId: zaloId,
        status: { in: ['COMPLETED', 'DELIVERED'] },
        createdAt: { gte: oneYearAgo },
      },
      select: { totalAmount: true },
    });

    const totalSpent = completedOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    // Calculate tier or respect client-provided dev test tier
    let finalMembershipTier = membershipTier;
    let finalTotalSpent = totalSpent;

    if (
      membershipTier &&
      ['Đồng', 'Bạc', 'Vàng', 'Kim cương'].includes(membershipTier)
    ) {
      finalMembershipTier = membershipTier;
      if (membershipTier === 'Đồng' && totalSpent >= 2000000) {
        finalTotalSpent = 0;
      } else if (
        membershipTier === 'Bạc' &&
        (totalSpent < 2000000 || totalSpent >= 10000000)
      ) {
        finalTotalSpent = 2500000;
      } else if (
        membershipTier === 'Vàng' &&
        (totalSpent < 10000000 || totalSpent >= 50000000)
      ) {
        finalTotalSpent = 12000000;
      } else if (membershipTier === 'Kim cương' && totalSpent < 50000000) {
        finalTotalSpent = 55000000;
      }
    } else {
      finalMembershipTier = 'Đồng';
      if (totalSpent >= 50000000) {
        finalMembershipTier = 'Kim cương';
      } else if (totalSpent >= 10000000) {
        finalMembershipTier = 'Vàng';
      } else if (totalSpent >= 2000000) {
        finalMembershipTier = 'Bạc';
      }
    }

    // Trigger System Notifications
    if (isNewUser) {
      try {
        const welcomeTitle = 'Chào mừng bạn đến với ShopQuiet! 🎉';
        const existingWelcome = await this.prisma.notification.findFirst({
          where: {
            zaloUserId: zaloId,
            title: welcomeTitle,
          },
        });

        if (!existingWelcome) {
          await this.prisma.notification.create({
            data: {
              zaloUserId: zaloId,
              title: welcomeTitle,
              content:
                'Cảm ơn bạn đã lựa chọn trải nghiệm mua sắm sản phẩm tối giản cùng chúng tôi. Nhận ngay các đặc quyền thành viên trong thẻ Membership nhé!',
              type: 'SYSTEM',
              date: new Date().toLocaleDateString('vi-VN'),
              read: false,
            },
          });
        }
      } catch (err) {
        console.error('Welcome notification create failed:', err);
      }
    } else if (
      existingUser &&
      existingUser.membershipTier !== finalMembershipTier
    ) {
      try {
        const upgradeTitle = `Chúc mừng bạn được thăng hạng ${finalMembershipTier.toUpperCase()}! 🌟`;
        const existingUpgrade = await this.prisma.notification.findFirst({
          where: {
            zaloUserId: zaloId,
            title: upgradeTitle,
          },
        });

        if (!existingUpgrade) {
          await this.prisma.notification.create({
            data: {
              zaloUserId: zaloId,
              title: upgradeTitle,
              content: `Hạng thành viên của bạn đã được nâng cấp lên ${finalMembershipTier}. Nhiều ưu đãi đặc quyền mới đã được kích hoạt trong ví thành viên của bạn!`,
              type: 'SYSTEM',
              date: new Date().toLocaleDateString('vi-VN'),
              read: false,
            },
          });
        }
      } catch (err) {
        console.error('Tier upgrade notification create failed:', err);
      }
    }

    // Update with fresh stats and return
    return this.prisma.user.update({
      where: { zaloId },
      data: {
        totalSpent: finalTotalSpent,
        membershipTier: finalMembershipTier,
      },
    });
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });
  }

  async getMembershipPrivileges(tier: string) {
    const privileges = await this.prisma.membershipPrivilege.findMany({
      where: {
        tier,
        active: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    return privileges;
  }

  async seedMembershipPrivileges() {
    const privileges = [
      // Đồng tier
      {
        tier: 'Đồng',
        title: 'Miễn phí vận chuyển',
        description: 'Miễn phí vận chuyển cho đơn từ 200K',
        icon: '🚚',
        sortOrder: 1,
      },
      {
        tier: 'Đồng',
        title: 'Điểm danh hàng ngày',
        description: 'Nhận 10 điểm thưởng mỗi ngày',
        icon: '📍',
        sortOrder: 2,
      },
      {
        tier: 'Đồng',
        title: 'Chương trình tích điểm',
        description: 'Tích điểm đổi voucher',
        icon: '🎁',
        sortOrder: 3,
      },
      // Bạc tier
      {
        tier: 'Bạc',
        title: 'Miễn phí vận chuyển',
        description: 'Miễn phí vận chuyển cho đơn từ 150K',
        icon: '🚚',
        sortOrder: 1,
      },
      {
        tier: 'Bạc',
        title: 'Giảm 5% đơn hàng',
        description: 'Giảm 5% cho tất cả đơn hàng',
        icon: '💰',
        sortOrder: 2,
      },
      {
        tier: 'Bạc',
        title: 'Điểm danh hàng ngày',
        description: 'Nhận 15 điểm thưởng mỗi ngày',
        icon: '📍',
        sortOrder: 3,
      },
      {
        tier: 'Bạc',
        title: 'Ưu tiên hỗ trợ',
        description: 'Hỗ trợ khách hàng ưu tiên',
        icon: '⭐',
        sortOrder: 4,
      },
      // Vàng tier
      {
        tier: 'Vàng',
        title: 'Miễn phí vận chuyển',
        description: 'Miễn phí vận chuyển cho đơn từ 100K',
        icon: '🚚',
        sortOrder: 1,
      },
      {
        tier: 'Vàng',
        title: 'Giảm 10% đơn hàng',
        description: 'Giảm 10% cho tất cả đơn hàng',
        icon: '💰',
        sortOrder: 2,
      },
      {
        tier: 'Vàng',
        title: 'Điểm danh hàng ngày',
        description: 'Nhận 20 điểm thưởng mỗi ngày',
        icon: '📍',
        sortOrder: 3,
      },
      {
        tier: 'Vàng',
        title: 'Voucher sinh nhật',
        description: 'Voucher giảm 20% sinh nhật',
        icon: '🎂',
        sortOrder: 4,
      },
      {
        tier: 'Vàng',
        title: 'Ưu tiên hỗ trợ',
        description: 'Hỗ trợ khách hàng 24/7',
        icon: '⭐',
        sortOrder: 5,
      },
      // Kim cương tier
      {
        tier: 'Kim cương',
        title: 'Miễn phí vận chuyển',
        description: 'Miễn phí vận chuyển tất cả đơn hàng',
        icon: '🚚',
        sortOrder: 1,
      },
      {
        tier: 'Kim cương',
        title: 'Giảm 15% đơn hàng',
        description: 'Giảm 15% cho tất cả đơn hàng',
        icon: '💰',
        sortOrder: 2,
      },
      {
        tier: 'Kim cương',
        title: 'Điểm danh hàng ngày',
        description: 'Nhận 30 điểm thưởng mỗi ngày',
        icon: '📍',
        sortOrder: 3,
      },
      {
        tier: 'Kim cương',
        title: 'Voucher sinh nhật',
        description: 'Voucher giảm 30% sinh nhật',
        icon: '🎂',
        sortOrder: 4,
      },
      {
        tier: 'Kim cương',
        title: 'Quà tặng độc quyền',
        description: 'Quà tặng đặc quyền hàng tháng',
        icon: '🎁',
        sortOrder: 5,
      },
      {
        tier: 'Kim cương',
        title: 'Hỗ trợ VIP',
        description: 'Manager hỗ trợ trực tiếp',
        icon: '👑',
        sortOrder: 6,
      },
    ];

    for (const privilege of privileges) {
      await this.prisma.membershipPrivilege.upsert({
        where: {
          tier_title: {
            tier: privilege.tier,
            title: privilege.title,
          },
        },
        update: {
          description: privilege.description,
          icon: privilege.icon,
          sortOrder: privilege.sortOrder,
          active: true,
        },
        create: privilege,
      });
    }

    return { success: true, count: privileges.length };
  }

  getTierDiscountPercentage(tier: string): number {
    const discountMap: Record<string, number> = {
      Đồng: 0,
      Bạc: 5,
      Vàng: 10,
      'Kim cương': 15,
    };
    return discountMap[tier] || 0;
  }

  getTierFreeShippingThreshold(tier: string): number {
    const thresholdMap: Record<string, number> = {
      Đồng: 200000,
      Bạc: 150000,
      Vàng: 100000,
      'Kim cương': 0,
    };
    return thresholdMap[tier] || 200000;
  }

  getTierDailyPointsMultiplier(tier: string): number {
    const multiplierMap: Record<string, number> = {
      Đồng: 1,
      Bạc: 1.5,
      Vàng: 2,
      'Kim cương': 3,
    };
    return multiplierMap[tier] || 1;
  }

  async getUserTierBenefits(zaloUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { zaloId: zaloUserId },
      select: { membershipTier: true },
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    const tier = user.membershipTier || 'Đồng';

    const [discountPercentage, freeShippingThreshold, pointsMultiplier] =
      await Promise.all([
        this.getTierDiscountPercentage(tier),
        this.getTierFreeShippingThreshold(tier),
        this.getTierDailyPointsMultiplier(tier),
      ]);

    return {
      tier,
      discountPercentage,
      freeShippingThreshold,
      pointsMultiplier,
    };
  }

  async getSizeProfile(zaloId: string) {
    if (!zaloId) return null;
    const user = await this.prisma.user.findUnique({
      where: { zaloId },
      select: {
        height: true,
        weight: true,
        footLength: true,
        clothingSize: true,
        shoeSize: true,
      },
    });
    return user || { height: null, weight: null, footLength: null, clothingSize: null, shoeSize: null };
  }

  async updateSizeProfile(
    zaloId: string,
    data: {
      height?: number;
      weight?: number;
      footLength?: number;
      clothingSize?: string;
      shoeSize?: string;
    },
  ) {
    if (!zaloId) return null;
    return this.prisma.user.update({
      where: { zaloId },
      data: {
        ...(data.height !== undefined && { height: data.height }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.footLength !== undefined && { footLength: data.footLength }),
        ...(data.clothingSize !== undefined && { clothingSize: data.clothingSize }),
        ...(data.shoeSize !== undefined && { shoeSize: data.shoeSize }),
      },
      select: {
        zaloId: true,
        height: true,
        weight: true,
        footLength: true,
        clothingSize: true,
        shoeSize: true,
      },
    });
  }
}

