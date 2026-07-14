import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async syncUser(zaloId: string, name: string, avatar?: string, phone?: string, birthday?: string) {
    if (!zaloId) return null;
    const role = zaloId.toLowerCase().includes('admin') ? 'admin' : 'user';
    return this.prisma.user.upsert({
      where: { zaloId },
      update: { name, avatar, role, ...(phone !== undefined && { phone }), ...(birthday !== undefined && { birthday }) },
      create: { zaloId, name, avatar, phone, birthday, role },
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
