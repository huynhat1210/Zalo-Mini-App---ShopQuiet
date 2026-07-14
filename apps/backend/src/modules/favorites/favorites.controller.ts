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
  UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddFavoriteDto } from './dto/favorite.dto';

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
  @UseGuards(JwtAuthGuard)
  async getFavorites(@Headers('x-zalo-user-id') zaloUserId?: string) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.favoritesService.findAll(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async addFavorite(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Body() body: AddFavoriteDto,
  ) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.favoritesService.add(userId, body.productId);
  }

  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  async removeFavorite(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.favoritesService.remove(userId, productId);
  }
}
