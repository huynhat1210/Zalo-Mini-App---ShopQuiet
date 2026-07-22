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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  @UseGuards(JwtAuthGuard)
  async applyVoucher(
    @CurrentUser() user: any,
    @Body('code') code: string,
    @Body('orderTotal') orderTotal: number,
  ) {
    if (!code) {
      throw new BadRequestException('Mã giảm giá là bắt buộc');
    }
    return this.vouchersService.validateAndApply(code, orderTotal, user.zaloId);
  }

  @Post('lucky-draw/generate')
  @UseGuards(JwtAuthGuard)
  async generateLuckyVoucher(
    @CurrentUser() user: any,
    @Body('rewardType') rewardType: string,
    @Body('rewardValue') rewardValue: number,
    @Body('minOrderVal') minOrderVal?: number,
  ) {
    if (!rewardType || rewardValue === undefined) {
      throw new BadRequestException('rewardType và rewardValue là bắt buộc');
    }
    return this.vouchersService.generateLuckyVoucher({
      zaloUserId: user.zaloId,
      rewardType,
      rewardValue,
      minOrderVal,
    });
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

  @Post(':code/distribute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async distributeVoucher(
    @Param('code') code: string,
    @Body('segment') segment: string,
  ) {
    if (!segment) {
      throw new BadRequestException('Phân khúc khách hàng là bắt buộc');
    }
    return this.vouchersService.distributeVoucher(code, segment);
  }
}
