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
  ) {
    if (!zaloId) return null;
    
    console.log('[syncUser Debug] Received parameters:', { zaloId, name, avatar, phone, birthday, email, gender });
    
    // Check if the user already exists in the database
    const existingUser = await this.prisma.user.findUnique({
      where: { zaloId }
    });

    const role = existingUser?.role 
      ? existingUser.role 
      : (zaloId.toLowerCase() === 'admin' || zaloId.toLowerCase() === 'admin-zalo-id-1' ? 'admin' : 'user');

    // If they already have a name/avatar in the DB, preserve it unless the incoming name/avatar is a real Zalo profile (not default guest)
    const finalName = (name && name !== '' && name !== 'Người dùng Zalo' && name !== 'Khách')
      ? name 
      : (existingUser?.name || name || 'Người dùng Zalo');

    const finalAvatar = (avatar && avatar !== '' && !avatar.includes('emoticon/avatar')) 
      ? avatar 
      : (existingUser?.avatar || avatar || 'https://zalo-api.zdn.vn/api/emoticon/avatar');

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
      create: { zaloId, name, avatar: finalAvatar, phone, birthday, email, gender, role },
    });

    // Sum totalAmount of all COMPLETED and DELIVERED orders
    const completedOrders = await this.prisma.order.findMany({
      where: {
        zaloUserId: zaloId,
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      select: { totalAmount: true }
    });

    const totalSpent = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Calculate tier
    let membershipTier = 'Đồng';
    if (totalSpent >= 50000000) {
      membershipTier = 'Kim cương';
    } else if (totalSpent >= 10000000) {
      membershipTier = 'Vàng';
    } else if (totalSpent >= 2000000) {
      membershipTier = 'Bạc';
    }

    // Update with fresh stats and return
    return this.prisma.user.update({
      where: { zaloId },
      data: {
        totalSpent,
        membershipTier
      }
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
}
