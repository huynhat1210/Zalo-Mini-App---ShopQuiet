import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { GamificationService } from './gamification.service';

@Controller('gamification')
export class GamificationController {
  constructor(private gamificationService: GamificationService) {}

  @Post('claim-daily-reward')
  async claimDailyReward(@Body() body: { zaloUserId: string }) {
    return this.gamificationService.claimDailyReward(body.zaloUserId);
  }

  @Get('user')
  async getUserGamification(@Query('zaloUserId') zaloUserId: string) {
    return this.gamificationService.getUserGamification(zaloUserId);
  }

  @Post('add-points')
  async addPoints(@Body() body: { zaloUserId: string; points: number; reason: string }) {
    return this.gamificationService.addPoints(body.zaloUserId, body.points, body.reason);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.gamificationService.getLeaderboard(limit ? parseInt(limit, 10) : 10);
  }
}
