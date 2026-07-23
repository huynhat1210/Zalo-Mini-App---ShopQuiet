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
    if (!zaloUserId) {
      return [];
    }
    await this.ensureUserExists(zaloUserId);

    return this.prisma.cartItem.findMany({
      where: { zaloUserId },
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
    if (!zaloUserId) {
      throw new BadRequestException('Vui lòng đăng nhập tài khoản Zalo!');
    }
    await this.ensureUserExists(zaloUserId);
    const itemSize = size || 'DEFAULT';
    const itemColor = color || 'DEFAULT';

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        zaloUserId_productId_color_size: {
          zaloUserId,
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
        zaloUserId,
        productId,
        quantity,
        size: itemSize,
        color: itemColor,
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
    if (!zaloUserId) return { count: 0 };
    const itemSize = size || 'DEFAULT';
    const itemColor = color || 'DEFAULT';

    const item = await this.prisma.cartItem.findUnique({
      where: {
        zaloUserId_productId_color_size: {
          zaloUserId,
          productId,
          color: itemColor,
          size: itemSize,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
      return { id: item.id, quantity: 0 };
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
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
    if (!zaloUserId) return null;
    const oSize = oldSize || 'DEFAULT';
    const nSize = newSize || 'DEFAULT';
    const oColor = oldColor || 'DEFAULT';
    const nColor = newColor || 'DEFAULT';

    const existingOld = await this.prisma.cartItem.findUnique({
      where: {
        zaloUserId_productId_color_size: {
          zaloUserId,
          productId,
          color: oColor,
          size: oSize,
        },
      },
    });

    if (!existingOld) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    const existingNew = await this.prisma.cartItem.findUnique({
      where: {
        zaloUserId_productId_color_size: {
          zaloUserId,
          productId,
          color: nColor,
          size: nSize,
        },
      },
    });

    if (existingNew && existingNew.id !== existingOld.id) {
      await this.prisma.cartItem.update({
        where: { id: existingNew.id },
        data: { quantity: existingNew.quantity + existingOld.quantity },
      });
      await this.prisma.cartItem.delete({ where: { id: existingOld.id } });
      return existingNew;
    }

    return this.prisma.cartItem.update({
      where: { id: existingOld.id },
      data: { size: nSize, color: nColor },
      include: {
        product: {
          include: { variants: true },
        },
      },
    });
  }

  async removeFromCart(
    productId: number,
    size?: string,
    color?: string,
    zaloUserId?: string,
  ) {
    if (!zaloUserId) return { count: 0 };
    const itemSize = size || 'DEFAULT';
    const itemColor = color || 'DEFAULT';

    return this.prisma.cartItem.deleteMany({
      where: {
        zaloUserId,
        productId,
        color: itemColor,
        size: itemSize,
      },
    });
  }

  async clearCart(zaloUserId?: string) {
    if (!zaloUserId) return { count: 0 };
    await this.ensureUserExists(zaloUserId);

    return this.prisma.cartItem.deleteMany({
      where: { zaloUserId },
    });
  }

  private async ensureUserExists(zaloId: string) {
    if (!zaloId) return;
    const user = await this.prisma.user.findUnique({ where: { zaloId } });
    if (!user) {
      await this.prisma.user.create({
        data: {
          zaloId,
          name: 'Khách hàng Zalo',
        },
      });
    }
  }
}
