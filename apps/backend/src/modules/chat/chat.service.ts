import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(zaloUserId: string) {
    return this.prisma.chatMessage.findMany({
      where: { zaloUserId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async saveMessage(zaloUserId: string, sender: string, content: string) {
    const userMsg = await this.prisma.chatMessage.create({
      data: {
        zaloUserId,
        sender,
        content,
      },
    });

    // Feature 5: Auto-Responder for Off-Hours / OFFLINE Status
    if (sender === 'USER') {
      try {
        const shopStatusSetting = await this.prisma.siteSetting.findUnique({
          where: { key: 'shop.status' },
        });
        const isOfflineSetting = shopStatusSetting?.value === 'OFFLINE';

        // Check if current hour in Vietnam (UTC+7) is outside business hours (22:00 to 07:00)
        const now = new Date();
        const vnHour = (now.getUTCHours() + 7) % 24;
        const isOffHours = vnHour >= 22 || vnHour < 7;

        if (isOfflineSetting || isOffHours) {
          // Check if we already sent an auto-response to this user in the last 30 minutes to prevent spam
          const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
          const recentAutoReply = await this.prisma.chatMessage.findFirst({
            where: {
              zaloUserId,
              sender: 'ADMIN',
              content: { startsWith: '[Tự động]' },
              createdAt: { gte: thirtyMinsAgo },
            },
          });

          if (!recentAutoReply) {
            const replyText = isOfflineSetting
              ? '[Tự động] Chào bạn! Cửa hàng hiện đang tạm dừng nhận tư vấn trực tiếp. Tin nhắn của bạn đã được ghi nhận, CSKH sẽ hồi đáp ngay khi hoạt động trở lại!'
              : '[Tự động] Cảm ơn bạn đã liên hệ ShopQuiet! Hiện tại đang ngoài giờ làm việc (8:00 - 22:00). Chúng tôi đã nhận được tin nhắn và sẽ phản hồi bạn vào đầu giờ sáng mai nhé! 🌙';

            // Create auto reply from ADMIN after a tiny delay
            setTimeout(async () => {
              try {
                await this.prisma.chatMessage.create({
                  data: {
                    zaloUserId,
                    sender: 'ADMIN',
                    content: replyText,
                  },
                });
              } catch (e) {
                console.error('Auto reply creation error:', e);
              }
            }, 1000);
          }
        }
      } catch (err) {
        console.error('Auto-responder error:', err);
      }
    }

    return userMsg;
  }

  async markAsRead(zaloUserId: string, senderToMarkRead: string) {
    return this.prisma.chatMessage.updateMany({
      where: {
        zaloUserId,
        sender: senderToMarkRead,
        read: false,
      },
      data: { read: true },
    });
  }

  async getSessions() {
    // Aggregates distinct users who have chat messages, sorted by latest message
    const rawSessions = await this.prisma.$queryRaw<any[]>`
      SELECT 
        m."zaloUserId" as "zaloUserId",
        u."name" as "userName",
        u."avatar" as "userAvatar",
        MAX(m."createdAt") as "latestMessageTime"
      FROM "ChatMessage" m
      LEFT JOIN "User" u ON m."zaloUserId" = u."zaloId"
      GROUP BY m."zaloUserId", u."name", u."avatar"
      ORDER BY "latestMessageTime" DESC
    `;

    const sessions = [];
    for (const session of rawSessions) {
      const zaloUserId = session.zaloUserId;

      // Get the last message content
      const lastMsg = await this.prisma.chatMessage.findFirst({
        where: { zaloUserId },
        orderBy: { createdAt: 'desc' },
      });

      // Count unread messages from USER
      const unreadCount = await this.prisma.chatMessage.count({
        where: {
          zaloUserId,
          sender: 'USER',
          read: false,
        },
      });

      sessions.push({
        zaloUserId,
        userName: session.userName || 'Người dùng Zalo',
        userAvatar:
          session.userAvatar || 'https://zalo-api.zdn.vn/api/emoticon/avatar',
        lastMessage: lastMsg ? lastMsg.content : '',
        lastMessageTime: lastMsg
          ? lastMsg.createdAt
          : session.latestMessageTime,
        unreadCount,
      });
    }

    return sessions;
  }

  async getUnreadSessionsCount() {
    const unreadUsers = await this.prisma.chatMessage.findMany({
      where: {
        sender: 'USER',
        read: false,
      },
      distinct: ['zaloUserId'],
      select: { zaloUserId: true },
    });
    return { unreadCount: unreadUsers.length };
  }

  async getUserUnreadCount(zaloUserId: string) {
    const count = await this.prisma.chatMessage.count({
      where: {
        zaloUserId,
        sender: 'ADMIN',
        read: false,
      },
    });
    return { unreadCount: count };
  }

  async getShopStatus() {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: 'shop.status' },
    });
    return { status: setting?.value || 'ONLINE' };
  }

  async getLatestUserOrder(zaloUserId: string) {
    const order = await this.prisma.order.findFirst({
      where: { zaloUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
    return order;
  }
}
