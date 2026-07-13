import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  private getRequiredZaloUserId(zaloUserId?: string): string {
    if (!zaloUserId) {
      throw new BadRequestException('x-zalo-user-id header is required');
    }
    return zaloUserId;
  }

  @Get()
  async getFavorites(@Headers('x-zalo-user-id') zaloUserId?: string) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.favoritesService.findAll(userId);
  }

  @Post()
  async addFavorite(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Body('productId', ParseIntPipe) productId: number,
  ) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.favoritesService.add(userId, productId);
  }

  @Delete(':productId')
  async removeFavorite(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.favoritesService.remove(userId, productId);
  }
}
