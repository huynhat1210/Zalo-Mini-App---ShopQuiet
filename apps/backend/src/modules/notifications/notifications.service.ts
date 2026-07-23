import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(zaloUserId?: string) {
    const whereCondition = zaloUserId
      ? { OR: [{ zaloUserId }, { zaloUserId: null }] }
      : {};
    return this.prisma.notification.findMany({
      where: whereCondition,
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.notification.findMany({
      orderBy: {
        id: 'desc',
      },
    });
  }

  async markAllRead(zaloUserId?: string) {
    const whereCondition = zaloUserId
      ? { OR: [{ zaloUserId }, { zaloUserId: null }], read: false }
      : { read: false };
    return this.prisma.notification.updateMany({
      where: whereCondition,
      data: {
        read: true,
      },
    });
  }

  async markRead(id: number) {
    return this.prisma.notification.update({
      where: {
        id,
      },
      data: {
        read: true,
      },
    });
  }

  async create(data: {
    title: string;
    content: string;
    type: string;
    zaloUserId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
        zaloUserId: data.zaloUserId || null,
        date:
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }) +
          ' - ' +
          new Date().toLocaleDateString('vi-VN'),
        read: false,
      },
    });
  }
}
