import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import type { CreateOrderDto } from './orders.service';
import type { Order } from '@prisma/client';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @Body() body: CreateOrderDto,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ): Promise<Order> {
    return this.ordersService.create(body, zaloUserId);
  }

  @Get()
  async getOrders(@Headers('x-zalo-user-id') zaloUserId?: string) {
    return this.ordersService.findAll(zaloUserId);
  }

  // Admin: returns ALL orders across all users — MUST be before ':id' route
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllOrdersAdmin() {
    return this.ordersService.findAllAdmin();
  }

  @Get('zns-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getZnsLogs() {
    return this.ordersService.getZnsLogs();
  }

  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.ordersService.findOne(id, zaloUserId);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }

  @Post('zalopay-checkout')
  async createZaloPayCheckout(
    @Body() body: CreateOrderDto,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.ordersService.createZaloPayCheckout(body, zaloUserId);
  }

  @Post(':id/zalopay-mac')
  async getZaloPayMacForExistingOrder(
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod?: string,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.ordersService.getZaloPayMacForExistingOrder(
      id,
      paymentMethod,
      zaloUserId,
    );
  }

  @Post('zalopay-callback')
  async handleZaloPayCallback(@Body() body: unknown) {
    return this.ordersService.handleZaloPayCallback(body);
  }
}
