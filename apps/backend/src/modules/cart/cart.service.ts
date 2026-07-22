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
    color?: string,
    zaloUserId?: string,
  ) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);
    const itemSize = size || 'DEFAULT';
    const itemColor = color || 'DEFAULT';

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        zaloUserId_productId_color_size: {
          zaloUserId: userId,
          productId,
          color: itemColor,
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
        color: itemColor,
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
    color?: string,
    zaloUserId?: string,
  ) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);
    const itemSize = size || 'DEFAULT';
    const itemColor = color || 'DEFAULT';

    if (quantity <= 0) {
      await this.removeFromCart(productId, itemSize, itemColor, userId);
      return null;
    }

    return this.prisma.cartItem.upsert({
      where: {
        zaloUserId_productId_color_size: {
          zaloUserId: userId,
          productId,
          color: itemColor,
          size: itemSize,
        },
      },
      update: { quantity },
      create: {
        zaloUserId: userId,
        productId,
        color: itemColor,
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

  async updateItemVariant(
    productId: number,
    oldSize?: string,
    newSize?: string,
    oldColor?: string,
    newColor?: string,
    zaloUserId?: string,
  ) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);

    const fromSize = oldSize || 'DEFAULT';
    const toSize = newSize || 'DEFAULT';
    const fromColor = oldColor || 'DEFAULT';
    const toColor = newColor || 'DEFAULT';

    if (fromSize === toSize && fromColor === toColor) {
      return this.getCart(userId);
    }

    const targetVariant = await this.prisma.productVariant.findUnique({
      where: {
        productId_color_size: {
          productId,
          color: toColor,
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
          zaloUserId_productId_color_size: {
            zaloUserId: userId,
            productId,
            color: fromColor,
            size: fromSize,
          },
        },
      });

      if (!oldItem) {
        throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng.');
      }

      const existingNewVariant = await tx.cartItem.findUnique({
        where: {
          zaloUserId_productId_color_size: {
            zaloUserId: userId,
            productId,
            color: toColor,
            size: toSize,
          },
        },
      });

      if (existingNewVariant) {
        await tx.cartItem.update({
          where: { id: existingNewVariant.id },
          data: { quantity: existingNewVariant.quantity + oldItem.quantity },
        });
        await tx.cartItem.delete({ where: { id: oldItem.id } });
        return;
      }

      await tx.cartItem.update({
        where: { id: oldItem.id },
        data: { size: toSize, color: toColor },
      });
    });

    return this.getCart(userId);
  }

  async removeFromCart(
    productId: number,
    size?: string,
    color?: string,
    zaloUserId?: string,
  ) {
    const userId = zaloUserId || 'cust-zalo-id-1';
    await this.ensureUserExists(userId);
    const itemSize = size || 'DEFAULT';
    const itemColor = color || 'DEFAULT';

    return this.prisma.cartItem.delete({
      where: {
        zaloUserId_productId_color_size: {
          zaloUserId: userId,
          productId,
          color: itemColor,
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
