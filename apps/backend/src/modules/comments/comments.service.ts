import { Injectable, Inject } from '@nestjs/common';
import { Comment, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

type CommentWithUser = Comment & { user: User; product?: { id: number; name: string; images: string } };

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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

  async findByUser(zaloUserId: string): Promise<CommentWithUser[]> {
    return (this.prisma.comment as any).findMany({
      where: { zaloUserId },
      include: {
        user: true,
        product: {
          select: { id: true, name: true, images: true },
        },
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
    orderId?: string,
    images?: string,
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

    const comment = await this.prisma.comment.create({
      data: {
        productId,
        zaloUserId,
        content,
        rating: rating || 5,
        orderId: orderId || null,
        images: images || null,
      },
      include: {
        user: true,
      },
    });

    try {
      await this.cacheManager.del(`product_${productId}`);
    } catch (e) {
      console.error('Failed to clear product cache:', e);
    }

    return comment;
  }
}
