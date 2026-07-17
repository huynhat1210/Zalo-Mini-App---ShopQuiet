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
    return this.prisma.chatMessage.create({
      data: {
        zaloUserId,
        sender,
        content,
      },
    });
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
        userAvatar: session.userAvatar || 'https://zalo-api.zdn.vn/api/emoticon/avatar',
        lastMessage: lastMsg ? lastMsg.content : '',
        lastMessageTime: lastMsg ? lastMsg.createdAt : session.latestMessageTime,
        unreadCount,
      });
    }

    return sessions;
  }
}
