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
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { IsString, IsNumber, IsOptional } from 'class-validator';

export class ApplyVoucherDto {
  @ApiProperty({ example: 'SUMMER2026', description: 'Mã giảm giá áp dụng' })
  @IsString()
  code: string;

  @ApiProperty({ example: 500000, description: 'Tổng giá trị tạm tính của đơn hàng' })
  @IsNumber()
  orderTotal: number;
}

export class GenerateLuckyVoucherDto {
  @ApiProperty({ example: 'PERCENT', description: 'Loại phần thưởng (PERCENT hoặc FIXED)' })
  @IsString()
  rewardType: string;

  @ApiProperty({ example: 10, description: 'Giá trị giảm (% hoặc VNĐ)' })
  @IsNumber()
  rewardValue: number;

  @ApiProperty({ example: 200000, required: false, description: 'Giá trị đơn hàng tối thiểu' })
  @IsOptional()
  @IsNumber()
  minOrderVal?: number;
}

export class CreateVoucherDto {
  @ApiProperty({ example: 'WELCOME50', description: 'Mã voucher' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'FIXED', description: 'Loại voucher (FIXED hoặc PERCENT)' })
  @IsString()
  type: string;

  @ApiProperty({ example: 50000, description: 'Giá trị giảm' })
  @IsNumber()
  value: number;

  @ApiProperty({ example: 100000, required: false, description: 'Giá trị đơn hàng tối thiểu' })
  @IsOptional()
  @IsNumber()
  minOrderVal?: number;

  @ApiProperty({ example: 100, required: false, description: 'Số lượng voucher khả dụng' })
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiProperty({ example: '2026-12-31T23:59:59Z', required: false, description: 'Thời hạn sử dụng' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiProperty({ example: 100000, required: false, description: 'Mức giảm tối đa' })
  @IsOptional()
  @IsNumber()
  maxDiscount?: number;
}

export class DistributeVoucherDto {
  @ApiProperty({ example: 'VIP', description: 'Phân khúc khách hàng áp dụng (ALL, VIP, NEW)' })
  @IsString()
  segment: string;
}

@ApiTags('Vouchers & Discounts')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @ApiOperation({ summary: 'Lấy danh sách tất cả các voucher khả dụng' })
  @Get()
  async getVouchers() {
    return this.vouchersService.findAll();
  }

  @ApiOperation({ summary: 'Áp dụng mã giảm giá cho đơn hàng' })
  @Post('apply')
  @UseGuards(JwtAuthGuard)
  async applyVoucher(
    @CurrentUser() user: any,
    @Body() dto: ApplyVoucherDto,
  ) {
    if (!dto.code) {
      throw new BadRequestException('Mã giảm giá là bắt buộc');
    }
    return this.vouchersService.validateAndApply(dto.code, dto.orderTotal, user.zaloId);
  }

  @ApiOperation({ summary: 'Tạo voucher phần thưởng quay số may mắn Vòng Quay' })
  @Post('lucky-draw/generate')
  @UseGuards(JwtAuthGuard)
  async generateLuckyVoucher(
    @CurrentUser() user: any,
    @Body() dto: GenerateLuckyVoucherDto,
  ) {
    if (!dto.rewardType || dto.rewardValue === undefined) {
      throw new BadRequestException('rewardType và rewardValue là bắt buộc');
    }
    return this.vouchersService.generateLuckyVoucher({
      zaloUserId: user.zaloId,
      rewardType: dto.rewardType,
      rewardValue: dto.rewardValue,
      minOrderVal: dto.minOrderVal,
    });
  }

  @ApiOperation({ summary: 'Tạo mã voucher mới (Admin CMS)' })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createVoucher(@Body() body: CreateVoucherDto) {
    if (!body.code || !body.type || body.value === undefined) {
      throw new BadRequestException('Mã, loại voucher và giá trị là bắt buộc');
    }
    return this.vouchersService.create(body);
  }

  @ApiOperation({ summary: 'Xóa mã voucher theo code (Admin CMS)' })
  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteVoucher(@Param('code') code: string) {
    return this.vouchersService.delete(code);
  }

  @ApiOperation({ summary: 'Phân phối mã voucher tới nhóm khách hàng (Admin CMS)' })
  @Post(':code/distribute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async distributeVoucher(
    @Param('code') code: string,
    @Body() dto: DistributeVoucherDto,
  ) {
    if (!dto.segment) {
      throw new BadRequestException('Phân khúc khách hàng là bắt buộc');
    }
    return this.vouchersService.distributeVoucher(code, dto.segment);
  }
}
