import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createVoucher(@Body() body: CreateVoucherDto) {
    if (!body.code || !body.type || body.value === undefined) {
      throw new BadRequestException('Mã, loại voucher và giá trị là bắt buộc');
    }
    return this.vouchersService.create(body);
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteVoucher(@Param('code') code: string) {
    return this.vouchersService.delete(code);
  }
}
