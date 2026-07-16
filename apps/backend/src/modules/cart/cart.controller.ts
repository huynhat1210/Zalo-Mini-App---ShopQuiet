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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddToCartDto, UpdateQuantityDto, UpdateItemVariantDto } from './dto/cart.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved' })
  async getCart(@Headers('x-zalo-user-id') zaloUserId?: string) {
    return this.cartService.getCart(zaloUserId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async addToCart(
    @Body() body: AddToCartDto,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.cartService.addToCart(body.productId, body.quantity, body.size, body.color, zaloUserId);
  }

  @Put('quantity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Quantity updated' })
  async updateQuantity(
    @Body() body: UpdateQuantityDto,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.cartService.updateQuantity(
      body.productId,
      body.quantity,
      body.size,
      body.color,
      zaloUserId,
    );
  }

  @Put('variant')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart item variant' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  async updateItemVariant(
    @Body() body: UpdateItemVariantDto,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.cartService.updateItemVariant(
      body.productId,
      body.oldSize,
      body.newSize,
      body.oldColor,
      body.newColor,
      zaloUserId,
    );
  }

  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  async removeFromCart(
    @Param('productId') productId: string,
    @Query('size') size?: string,
    @Query('color') color?: string,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ) {
    return this.cartService.removeFromCart(
      parseInt(productId),
      size,
      color,
      zaloUserId,
    );
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@Headers('x-zalo-user-id') zaloUserId?: string) {
    return this.cartService.clearCart(zaloUserId);
  }
}
