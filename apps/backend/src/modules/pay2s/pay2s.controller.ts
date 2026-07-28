import { Controller, Post, Get, Param, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { Pay2sService } from './pay2s.service';

@Controller()
export class Pay2sController {
  constructor(private readonly pay2sService: Pay2sService) {}

  @Post('orders/:id/pay2s')
  async createPay2sUrl(@Param('id') id: string) {
    return this.pay2sService.createPaymentUrl(id);
  }

  @Post('api/orders/:id/pay2s')
  async createPay2sUrlApi(@Param('id') id: string) {
    return this.pay2sService.createPaymentUrl(id);
  }

  @Get('pay2s/ipn')
  @Get('api/pay2s/ipn')
  @Get('api/v1/pay2s/ipn')
  async checkIPNGet() {
    return {
      status: 'active',
      message: 'Pay2S IPN endpoint is online (expects POST requests from Pay2S gateway)',
    };
  }

  @Post('pay2s/ipn')
  @Post('api/pay2s/ipn')
  @Post('api/v1/pay2s/ipn')
  @HttpCode(HttpStatus.OK)
  async handleIPN(@Body() body: any) {
    return this.pay2sService.handleIPN(body);
  }

  @Get('pay2s/hook')
  @Get('api/pay2s/hook')
  @Get('api/v1/pay2s/hook')
  async checkHookGet() {
    return {
      status: 'active',
      message: 'Pay2S Webhook endpoint is online (expects POST requests with Bearer token)',
    };
  }

  @Post('pay2s/hook')
  @Post('api/pay2s/hook')
  @Post('api/v1/pay2s/hook')
  @HttpCode(HttpStatus.OK)
  async handleHook(@Headers('authorization') auth: string, @Body() body: any) {
    return this.pay2sService.handleHook(auth, body);
  }
}
