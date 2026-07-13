import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';

type CreateVoucherDto = {
  code: string;
  type: string;
  value: number;
  minOrderVal?: number;
  stock?: number;
  expiresAt?: string;
};

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  async getVouchers() {
    return this.vouchersService.findAll();
  }

  @Post('apply')
  async applyVoucher(
    @Body('code') code: string,
    @Body('orderTotal') orderTotal: number,
  ) {
    if (!code) {
      throw new BadRequestException('Mã giảm giá là bắt buộc');
    }
    return this.vouchersService.validateAndApply(code, orderTotal);
  }

  @Post()
  async createVoucher(@Body() body: CreateVoucherDto) {
    if (!body.code || !body.type || body.value === undefined) {
      throw new BadRequestException('Mã, loại voucher và giá trị là bắt buộc');
    }
    return this.vouchersService.create(body);
  }

  @Delete(':code')
  async deleteVoucher(@Param('code') code: string) {
    return this.vouchersService.delete(code);
  }
}
