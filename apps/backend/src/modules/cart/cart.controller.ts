import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Headers,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Headers('x-zalo-user-id') zaloUserId?: string) {
    return this.cartService.getCart(zaloUserId);
  }

  @Post()
  async addToCart(
    @Body('productId') productId: number,
    @Body('quantity') quantity: number,
    @Body('size') size?: string,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.cartService.addToCart(productId, quantity, size, zaloUserId);
  }

  @Put('quantity')
  async updateQuantity(
    @Body('productId') productId: number,
    @Body('quantity') quantity: number,
    @Body('size') size?: string,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.cartService.updateQuantity(
      productId,
      quantity,
      size,
      zaloUserId,
    );
  }

  @Put('size')
  async updateItemSize(
    @Body('productId') productId: number,
    @Body('oldSize') oldSize?: string,
    @Body('newSize') newSize?: string,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.cartService.updateItemSize(
      productId,
      oldSize,
      newSize,
      zaloUserId,
    );
  }

  @Delete(':productId')
  async removeFromCart(
    @Param('productId') productId: string,
    @Query('size') size?: string,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.cartService.removeFromCart(
      parseInt(productId),
      size,
      zaloUserId,
    );
  }

  @Delete()
  async clearCart(@Headers('x-zalo-user-id') zaloUserId?: string) {
    return this.cartService.clearCart(zaloUserId);
  }
}
