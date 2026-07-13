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

    // Upsert favorite
    return this.prisma.favorite.upsert({
      where: {
        zaloUserId_productId: { zaloUserId, productId },
      },
      update: {},
      create: { zaloUserId, productId },
    });
  }

  async remove(zaloUserId: string, productId: number) {
    try {
      await this.prisma.favorite.delete({
        where: {
          zaloUserId_productId: { zaloUserId, productId },
        },
      });
      return { success: true };
    } catch {
      // If it doesn't exist, ignore error or return success
      return { success: true };
    }
  }
}
