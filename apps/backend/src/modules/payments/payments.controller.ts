import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { PaymentsService, BankConfig } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

export class UpdateBankConfigDto {
  @ApiProperty({ example: 'ACB', description: 'Mã ngân hàng (ACB, VCB, MB...)' })
  bankCode: string;

  @ApiProperty({ example: '123456789', description: 'Số tài khoản ngân hàng' })
  accountNo: string;

  @ApiProperty({ example: 'SHOPQUIET STORE', description: 'Tên chủ tài khoản' })
  accountName: string;
}

export class GenerateVietQrDto {
  @ApiProperty({ example: 'SQ-44050', description: 'Mã đơn hàng' })
  orderId: string;

  @ApiProperty({ example: 100000, description: 'Số tiền thanh toán' })
  amount: number;
}

@ApiTags('Pay2S Payment')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'Lấy thông tin tài khoản ngân hàng nhận tiền' })
  @Get('bank-config')
  async getBankConfig() {
    return this.paymentsService.getBankConfig();
  }

  @ApiOperation({ summary: 'Cập nhật tài khoản ngân hàng nhận tiền (Admin CMS)' })
  @Post('bank-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateBankConfig(@Body() body: UpdateBankConfigDto) {
    return this.paymentsService.updateBankConfig(body as any);
  }

  @ApiOperation({ summary: 'Tạo mã ảnh VietQR thanh toán cho đơn hàng' })
  @Get('vietqr/:orderId')
  async generateVietQR(
    @Param('orderId') orderId: string,
    @Query('amount') amountStr?: string,
  ) {
    const amount = amountStr ? parseFloat(amountStr) : 0;
    return this.paymentsService.generateVietQR(orderId, amount);
  }

  @ApiOperation({ summary: 'Tạo dữ liệu mã VietQR thanh toán (POST)' })
  @Post('vietqr/gen')
  async generateVietQRPost(@Body() dto: GenerateVietQrDto) {
    return this.paymentsService.generateVietQR(dto.orderId, dto.amount);
  }

  @ApiOperation({ summary: 'Webhook nhận thông báo biến động số dư ngân hàng' })
  @Post('webhook')
  async handleBankWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }
}
