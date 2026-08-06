import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private scheduler?: ReturnType<typeof setInterval>;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.scheduler = setInterval(() => void this.publishScheduled(), 30000);
    void this.publishScheduled();
  }

  onModuleDestroy() {
    if (this.scheduler) clearInterval(this.scheduler);
  }

  private async publishScheduled() {
    await this.prisma.notification.updateMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
      data: { status: 'SENT' },
    });
  }

  async findAll(zaloUserId?: string) {
    const whereCondition = zaloUserId
      ? { OR: [{ zaloUserId }, { zaloUserId: null }] }
      : {};
    return this.prisma.notification.findMany({
      where: { ...whereCondition, status: 'SENT' },
      orderBy: {
        createdAt: 'desc',
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

  async deleteAll(zaloUserId?: string) {
    if (!zaloUserId) return { count: 0 };
    return this.prisma.notification.deleteMany({
      where: { zaloUserId },
    });
  }

  async markRead(id: number, zaloUserId?: string) {
    return this.prisma.notification.updateMany({
      where: zaloUserId
        ? { id, OR: [{ zaloUserId }, { zaloUserId: null }] }
        : { id: -1 },
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
    scheduledAt?: string;
  }) {
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : undefined;
    const isScheduled = Boolean(scheduledAt && scheduledAt.getTime() > Date.now());
    return this.prisma.notification.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
        zaloUserId: data.zaloUserId || null,
        status: isScheduled ? 'SCHEDULED' : 'SENT',
        scheduledAt: scheduledAt || null,
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
