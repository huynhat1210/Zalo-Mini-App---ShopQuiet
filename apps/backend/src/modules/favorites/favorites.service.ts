import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(zaloUserId: string) {
    const favs = await this.prisma.favorite.findMany({
      where: { zaloUserId },
      include: { product: true },
    });
    return favs.map((f) => f.product);
  }

  async add(zaloUserId: string, productId: number) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Check if already favorited
    const existing = await this.prisma.favorite.findUnique({
      where: {
        zaloUserId_productId: { zaloUserId, productId },
      },
    });

    if (!existing) {
      // Increment likeCount on Product and create Favorite
      await this.prisma.$transaction([
        this.prisma.favorite.create({
          data: { zaloUserId, productId },
        }),
        this.prisma.product.update({
          where: { id: productId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
    }

    return { success: true };
  }

  async remove(zaloUserId: string, productId: number) {
    try {
      // Check if favorited
      const existing = await this.prisma.favorite.findUnique({
        where: {
          zaloUserId_productId: { zaloUserId, productId },
        },
      });

      if (existing) {
        // Decrement likeCount on Product and delete Favorite
        await this.prisma.$transaction([
          this.prisma.favorite.delete({
            where: {
              zaloUserId_productId: { zaloUserId, productId },
            },
          }),
          this.prisma.product.update({
            where: { id: productId },
            data: { likeCount: { decrement: 1 } },
          }),
        ]);
      }
      return { success: true };
    } catch {
      // If it doesn't exist, ignore error or return success
      return { success: true };
    }
  }
}
