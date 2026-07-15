import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async syncUser(zaloId: string, name: string, avatar?: string, phone?: string, birthday?: string) {
    if (!zaloId) return null;
    const role = zaloId.toLowerCase().includes('admin') ? 'admin' : 'user';
    
    // Check if the user already exists in the database
    const existingUser = await this.prisma.user.findUnique({
      where: { zaloId }
    });

    // If they already have a name in the DB, preserve it (don't let auto-sync overwrite it)
    const finalName = existingUser?.name ? existingUser.name : name;

    return this.prisma.user.upsert({
      where: { zaloId },
      update: { 
        name: finalName, 
        avatar, 
        role, 
        ...(phone !== undefined && { phone }), 
        ...(birthday !== undefined && { birthday }) 
      },
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
