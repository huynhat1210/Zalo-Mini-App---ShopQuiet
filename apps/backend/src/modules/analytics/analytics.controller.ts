import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { TrackEventDto } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('track')
  async trackEvent(@Body() dto: TrackEventDto) {
    return this.analyticsService.trackEvent(dto);
  }

  @Get('funnel')
  async getConversionFunnel(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getConversionFunnel(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('top-products')
  async getTopProducts(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getTopProducts(
      limit ? parseInt(limit, 10) : 10,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('user-behavior')
  async getUserBehavior(
    @Query('zaloUserId') zaloUserId: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getUserBehavior(
      zaloUserId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('daily-stats')
  async getDailyStats(@Query('days') days?: string) {
    return this.analyticsService.getDailyStats(days ? parseInt(days, 10) : 30);
  }
}
