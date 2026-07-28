import { Controller, Post, Param, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
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

  @Post('pay2s/ipn')
  @HttpCode(HttpStatus.OK)
  async handleIPN(@Body() body: any) {
    return this.pay2sService.handleIPN(body);
  }

  @Post('api/pay2s/ipn')
  @HttpCode(HttpStatus.OK)
  async handleIPNApi(@Body() body: any) {
    return this.pay2sService.handleIPN(body);
  }

  @Post('pay2s/hook')
  @HttpCode(HttpStatus.OK)
  async handleHook(@Headers('authorization') auth: string, @Body() body: any) {
    return this.pay2sService.handleHook(auth, body);
  }

  @Post('api/pay2s/hook')
  @HttpCode(HttpStatus.OK)
  async handleHookApi(@Headers('authorization') auth: string, @Body() body: any) {
    return this.pay2sService.handleHook(auth, body);
  }
}
