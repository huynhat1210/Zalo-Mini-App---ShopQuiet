import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

type CreateVoucherDto = {
  code: string;
  type: string;
  value: number;
  minOrderVal?: number;
  stock?: number;
  expiresAt?: string;
};

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll() {
    const cacheKey = 'vouchers_all';
    const cachedData = await this.cacheManager.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    const vouchers = await this.prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Cache for 10 minutes - vouchers change moderately
    await this.cacheManager.set(cacheKey, vouchers, 600000);
    return vouchers;
  }

  async create(data: CreateVoucherDto) {
    const code = data.code.trim().toUpperCase();
    const existing = await this.prisma.voucher.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('Mã giảm giá đã tồn tại');
    }

    const voucher = await this.prisma.voucher.create({
      data: {
        code,
        type: data.type.toUpperCase(),
        value: data.value,
        minOrderVal: data.minOrderVal || 0,
        stock: data.stock !== undefined ? data.stock : 999,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    // Invalidate cache after creation
    await this.invalidateVouchersCache();
    
    return voucher;
  }

  async delete(code: string) {
    await this.prisma.voucher.delete({ where: { code: code.toUpperCase() } });
    
    // Invalidate cache after deletion
    await this.invalidateVouchersCache();
    
    return { success: true };
  }

  async validateAndApply(code: string, orderTotal: number, zaloUserId?: string) {
    const formattedCode = code.trim().toUpperCase();
    const cacheKey = `voucher_${formattedCode}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    
    let voucher: any;
    if (cachedData) {
      voucher = cachedData;
    } else {
      voucher = await this.prisma.voucher.findUnique({
        where: { code: formattedCode },
      });
      
      // Cache for 5 minutes
      if (voucher) {
        await this.cacheManager.set(cacheKey, voucher, 300000);
      }
    }

    if (!voucher) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    // Logic to protect Lucky Wheel vouchers (LKY-)
    if (formattedCode.startsWith('LKY')) {
      if (!zaloUserId) {
        throw new BadRequestException('Mã giảm giá này yêu cầu xác thực người dùng');
      }
      
      // Expected format: LKY[6_chars_user_suffix]-[4_chars_rand]
      const match = formattedCode.match(/^LKY([A-Z0-9]{6})-/);
      if (!match) {
        throw new BadRequestException('Mã giảm giá Vòng quay may mắn không đúng định dạng');
      }

      const codeUserSuffix = match[1];
      const targetUserSuffix = zaloUserId.slice(-6).toUpperCase();

      if (codeUserSuffix !== targetUserSuffix) {
        throw new BadRequestException('Mã giảm giá này dành riêng cho người dùng khác');
      }
    }

    if (voucher.stock <= 0) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }

    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }

    if (orderTotal < voucher.minOrderVal) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu phải từ ${voucher.minOrderVal.toLocaleString('vi-VN')} đ để sử dụng mã này`,
      );
    }

    return {
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      minOrderVal: voucher.minOrderVal,
    };
  }

  async generateLuckyVoucher(body: {
    zaloUserId: string;
    rewardType: string;
    rewardValue: number;
    minOrderVal?: number;
  }) {
    const { zaloUserId, rewardType, rewardValue, minOrderVal = 0 } = body;
    const userSuffix = zaloUserId.slice(-6).toUpperCase();
    
    // Generate 4 random characters
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `LKY${userSuffix}-${randomChars}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    const voucher = await this.prisma.voucher.create({
      data: {
        code,
        type: rewardType.toUpperCase(),
        value: rewardValue,
        minOrderVal,
        stock: 1, // One-time use
        expiresAt,
      },
    });

    // Invalidate cache
    await this.invalidateVouchersCache();

    // Create notification in database for the specific user
    const discountStr = rewardType.toUpperCase() === 'PERCENT'
      ? `${rewardValue}%`
      : (rewardType.toUpperCase() === 'FREESHIP' ? 'Miễn phí vận chuyển' : `${rewardValue.toLocaleString('vi-VN')}đ`);

    await this.prisma.notification.create({
      data: {
        zaloUserId,
        title: 'Chúc mừng bạn trúng giải Vòng quay may mắn! 🎡',
        content: `Bạn đã quay trúng voucher ${discountStr} mã: ${code}. Hạn sử dụng đến ${expiresAt.toLocaleDateString('vi-VN')}. Hãy copy mã và đặt hàng ngay nhé!`,
        type: 'PROMO',
        date: new Date().toLocaleDateString('vi-VN'),
        read: false
      }
    });

    return voucher;
  }

  async decrementStock(code: string) {
    try {
      const formattedCode = code.trim().toUpperCase();
      await this.prisma.voucher.update({
        where: { code: formattedCode },
        data: { stock: { decrement: 1 } },
      });
      
      // Invalidate cache after stock update
      await this.cacheManager.del(`voucher_${formattedCode}`);
      await this.invalidateVouchersCache();
    } catch (e) {
      console.error('Failed to decrement voucher stock:', e);
    }
  }

  async invalidateVouchersCache() {
    await this.cacheManager.del('vouchers_all');
  }

  async distributeVoucher(code: string, segment: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: code.toUpperCase() }
    });
    if (!voucher) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    // 1. Determine target users
    let users: any[] = [];
    if (segment === 'ALL') {
      users = await this.prisma.user.findMany({ select: { zaloId: true } });
    } else if (segment === 'NEW_USERS') {
      // Users with 0 orders
      users = await this.prisma.user.findMany({
        where: {
          orders: { none: {} }
        },
        select: { zaloId: true }
      });
    } else {
      // Member tiers: DIAMOND, GOLD, SILVER, BRONZE
      // Map to Vietnamese display tiers: Kim cương, Vàng, Bạc, Đồng
      let tierName = 'Đồng';
      if (segment === 'DIAMOND') tierName = 'Kim cương';
      else if (segment === 'GOLD') tierName = 'Vàng';
      else if (segment === 'SILVER') tierName = 'Bạc';

      users = await this.prisma.user.findMany({
        where: { membershipTier: tierName },
        select: { zaloId: true }
      });
    }

    if (users.length === 0) {
      return { success: true, count: 0, message: 'Không có khách hàng nào thuộc phân khúc này.' };
    }

    // 2. Create notification entries for all target users
    const expiryStr = voucher.expiresAt 
      ? ` Hạn sử dụng đến ${new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}.`
      : '';
    const discountStr = voucher.type === 'PERCENT' ? `${voucher.value}%` : `${voucher.value.toLocaleString('vi-VN')}đ`;

    const notificationsData = users.map(user => ({
      zaloUserId: user.zaloId,
      title: 'Quà tặng Voucher độc quyền từ ShopQuiet 🎁',
      content: `Chúc mừng bạn! ShopQuiet tặng bạn mã giảm giá ${voucher.code} giảm trực tiếp ${discountStr} cho đơn hàng từ ${voucher.minOrderVal.toLocaleString('vi-VN')}đ.${expiryStr} Hãy copy mã và mua sắm ngay nhé!`,
      type: 'PROMOTION',
      date: new Date().toLocaleDateString('vi-VN'),
      read: false
    }));

    await this.prisma.notification.createMany({
      data: notificationsData
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: 'admin-zalo-id-1',
          action: 'Phân phối Voucher',
          details: `Đã phân phối mã giảm giá ${voucher.code} tới ${users.length} khách hàng thuộc phân khúc: ${segment}`
        }
      });
    } catch (e) {
      console.error('AuditLog error in voucher distribution:', e);
    }

    return {
      success: true,
      count: users.length,
      message: `Đã phân phối thành công mã ${voucher.code} tới ${users.length} khách hàng!`
    };
  }
}
