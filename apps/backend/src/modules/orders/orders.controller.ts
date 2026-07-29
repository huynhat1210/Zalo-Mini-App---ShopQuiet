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

import { ApiTags } from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Body() body: CreateOrderDto,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ): Promise<Order> {
    return this.ordersService.create(body, zaloUserId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
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


  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrderById(
    @Param('id') id: string,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.ordersService.findOne(id, zaloUserId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('trackingNumber') trackingNumber?: string,
  ) {
    return this.ordersService.updateStatus(id, status, trackingNumber);
  }

  @Post(':id/return')
  @UseGuards(JwtAuthGuard)
  async requestReturn(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('description') description: string,
    @Body('images') images?: string[],
  ) {
    return this.ordersService.requestReturn(id, reason, description, images);
  }
}
