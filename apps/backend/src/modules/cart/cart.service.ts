import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(zaloUserId?: string) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);

    return this.prisma.cartItem.findMany({
      where: { zaloUserId: userId },
      include: {
        product: {
          include: {
            variants: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addToCart(
    productId: number,
    quantity: number,
    size?: string,
    zaloUserId?: string,
  ) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);
    const itemSize = size || 'DEFAULT';

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        zaloUserId_productId_size: {
          zaloUserId: userId,
          productId,
          size: itemSize,
        },
      },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
        include: {
          product: {
            include: {
              variants: true,
            },
          },
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        zaloUserId: userId,
        productId,
        size: itemSize,
        quantity,
      },
      include: {
        product: {
          include: {
            variants: true,
          },
        },
      },
    });
  }

  async updateQuantity(
    productId: number,
    quantity: number,
    size?: string,
    zaloUserId?: string,
  ) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);
    const itemSize = size || 'DEFAULT';

    if (quantity <= 0) {
      await this.removeFromCart(productId, itemSize, userId);
      return null;
    }

    return this.prisma.cartItem.upsert({
      where: {
        zaloUserId_productId_size: {
          zaloUserId: userId,
          productId,
          size: itemSize,
        },
      },
      update: { quantity },
      create: {
        zaloUserId: userId,
        productId,
        size: itemSize,
        quantity,
      },
      include: {
        product: {
          include: {
            variants: true,
          },
        },
      },
    });
  }

  async updateItemSize(
    productId: number,
    oldSize?: string,
    newSize?: string,
    zaloUserId?: string,
  ) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);

    const fromSize = oldSize || 'DEFAULT';
    const toSize = newSize || 'DEFAULT';

    if (fromSize === toSize) {
      return this.getCart(userId);
    }

    const targetVariant = await this.prisma.productVariant.findUnique({
      where: {
        productId_size: {
          productId,
          size: toSize,
        },
      },
    });

    if (!targetVariant) {
      throw new BadRequestException('Size mới không tồn tại cho sản phẩm này.');
    }

    if (targetVariant.stock <= 0) {
      throw new BadRequestException('Size mới đã hết hàng.');
    }

    await this.prisma.$transaction(async (tx) => {
      const oldItem = await tx.cartItem.findUnique({
        where: {
          zaloUserId_productId_size: {
            zaloUserId: userId,
            productId,
            size: fromSize,
          },
        },
      });

      if (!oldItem) {
        throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng.');
      }

      const existingNewSize = await tx.cartItem.findUnique({
        where: {
          zaloUserId_productId_size: {
            zaloUserId: userId,
            productId,
            size: toSize,
          },
        },
      });

      if (existingNewSize) {
        await tx.cartItem.update({
          where: { id: existingNewSize.id },
          data: { quantity: existingNewSize.quantity + oldItem.quantity },
        });
        await tx.cartItem.delete({ where: { id: oldItem.id } });
        return;
      }

      await tx.cartItem.update({
        where: { id: oldItem.id },
        data: { size: toSize },
      });
    });

    return this.getCart(userId);
  }

  async removeFromCart(productId: number, size?: string, zaloUserId?: string) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);
    const itemSize = size || 'DEFAULT';

    return this.prisma.cartItem.delete({
      where: {
        zaloUserId_productId_size: {
          zaloUserId: userId,
          productId,
          size: itemSize,
        },
      },
    });
  }

  async clearCart(zaloUserId?: string) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);

    return this.prisma.cartItem.deleteMany({
      where: { zaloUserId: userId },
    });
  }

  private async ensureUserExists(zaloId: string) {
    const user = await this.prisma.user.findUnique({ where: { zaloId } });
    if (!user) {
      await this.prisma.user.create({
        data: {
          zaloId,
          name: zaloId === 'cust-zalo-id-1' ? 'Alex Johnson' : `Zalo User`,
        },
      });
    }
  }
}
