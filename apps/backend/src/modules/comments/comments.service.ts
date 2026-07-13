import { Injectable } from '@nestjs/common';
import { Comment, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type CommentWithUser = Comment & { user: User };

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async findByProduct(productId: number): Promise<CommentWithUser[]> {
    return this.prisma.comment.findMany({
      where: { productId },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    productId: number,
    zaloUserId: string,
    content: string,
    rating: number,
  ): Promise<CommentWithUser> {
    // Ensure user exists (safety fallback)
    const userExists = await this.prisma.user.findUnique({
      where: { zaloId: zaloUserId },
    });

    if (!userExists) {
      await this.prisma.user.create({
        data: {
          zaloId: zaloUserId,
          name: 'Khách hàng Zalo',
          avatar: '',
        },
      });
    }

    return this.prisma.comment.create({
      data: {
        productId,
        zaloUserId,
        content,
        rating: rating || 5,
      },
      include: {
        user: true,
      },
    });
  }
}
