import { Controller, Get, Query } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

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
  async getSimilarProducts(
    @Query('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getSimilarProducts(
      parseInt(productId, 10),
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
  async getFrequentlyBoughtTogether(
    @Query('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getFrequentlyBoughtTogether(
      parseInt(productId, 10),
      limit ? parseInt(limit, 10) : 4,
    );
  }
}
