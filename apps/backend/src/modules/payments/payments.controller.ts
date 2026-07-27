import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PaymentsService, BankConfig } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('bank-config')
  async getBankConfig() {
    return this.paymentsService.getBankConfig();
  }

  @Post('bank-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateBankConfig(@Body() body: BankConfig) {
    return this.paymentsService.updateBankConfig(body);
  }

  @Get('vietqr/:orderId')
  async generateVietQR(
    @Param('orderId') orderId: string,
    @Query('amount') amountStr?: string,
  ) {
    const amount = amountStr ? parseFloat(amountStr) : 0;
    return this.paymentsService.generateVietQR(orderId, amount);
  }

  @Post('vietqr/gen')
  async generateVietQRPost(@Body() body: { orderId: string; amount: number }) {
    return this.paymentsService.generateVietQR(body.orderId, body.amount);
  }

  // Webhook from SePAY / PayOS / Cassette for auto bank transfer matching
  @Post('webhook')
  async handleBankWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }
}
