import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateVoucherDto) {
    const code = data.code.trim().toUpperCase();
    const existing = await this.prisma.voucher.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('Mã giảm giá đã tồn tại');
    }

    return this.prisma.voucher.create({
      data: {
        code,
        type: data.type.toUpperCase(),
        value: data.value,
        minOrderVal: data.minOrderVal || 0,
        stock: data.stock !== undefined ? data.stock : 999,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async delete(code: string) {
    await this.prisma.voucher.delete({ where: { code: code.toUpperCase() } });
    return { success: true };
  }

  async validateAndApply(code: string, orderTotal: number) {
    const formattedCode = code.trim().toUpperCase();
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: formattedCode },
    });

    if (!voucher) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    if (voucher.stock <= 0) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }

    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }

    if (orderTotal < voucher.minOrderVal) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu phải từ $${voucher.minOrderVal.toFixed(2)} để sử dụng mã này`,
      );
    }

    return {
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      minOrderVal: voucher.minOrderVal,
    };
  }

  async decrementStock(code: string) {
    try {
      const formattedCode = code.trim().toUpperCase();
      await this.prisma.voucher.update({
        where: { code: formattedCode },
        data: { stock: { decrement: 1 } },
      });
    } catch (e) {
      console.error('Failed to decrement voucher stock:', e);
    }
  }
}
