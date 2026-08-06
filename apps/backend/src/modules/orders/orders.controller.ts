import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { CreateOrderDto } from './orders.service';
import type { Order } from '@prisma/client';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng quản trị có phân trang' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, example: 'SQ-12345' })
  @ApiQuery({ name: 'status', required: false, example: 'PROCESSING' })
  async getAllOrdersAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAllAdmin({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      status,
    });
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
