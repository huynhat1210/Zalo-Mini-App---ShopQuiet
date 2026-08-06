import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';

@ApiTags('AI Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  @Get('personalized')
  async getPersonalizedRecommendations(
    @Query('zaloUserId') zaloUserId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getPersonalizedRecommendations(
      zaloUserId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('similar')
  @ApiQuery({ name: 'productId', required: true, type: Number, example: 7 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  async getSimilarProducts(
    @Query('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedProductId = Number(productId);
    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      throw new BadRequestException('productId phải là số nguyên dương.');
    }
    return this.recommendationsService.getSimilarProducts(
      parsedProductId,
      limit ? parseInt(limit, 10) : 6,
    );
  }

  @Get('trending')
  async getTrendingProducts(@Query('limit') limit?: string) {
    return this.recommendationsService.getTrendingProducts(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('recently-viewed')
  async getRecentlyViewedRecommendations(
    @Query('zaloUserId') zaloUserId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getRecentlyViewedRecommendations(
      zaloUserId,
      limit ? parseInt(limit, 10) : 8,
    );
  }

  @Get('frequently-bought-together')
  @ApiQuery({ name: 'productId', required: true, type: Number, example: 7 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 4 })
  async getFrequentlyBoughtTogether(
    @Query('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedProductId = Number(productId);
    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      throw new BadRequestException('productId phải là số nguyên dương.');
    }
    return this.recommendationsService.getFrequentlyBoughtTogether(
      parsedProductId,
      limit ? parseInt(limit, 10) : 4,
    );
  }
}
