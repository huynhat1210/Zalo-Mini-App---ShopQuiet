import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async syncUser(zaloId: string, name: string, avatar?: string, phone?: string, birthday?: string) {
    if (!zaloId) return null;
    return this.prisma.user.upsert({
      where: { zaloId },
      update: { name, avatar, ...(phone !== undefined && { phone }), ...(birthday !== undefined && { birthday }) },
      create: { zaloId, name, avatar, phone, birthday },
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
