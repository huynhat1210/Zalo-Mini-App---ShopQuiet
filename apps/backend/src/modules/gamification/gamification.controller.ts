import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Gamification & Rewards')
@Controller('gamification')
export class GamificationController {
  constructor(private gamificationService: GamificationService) {}

  @Post('claim-daily-reward')
  @UseGuards(JwtAuthGuard)
  async claimDailyReward(@CurrentUser() user: any) {
    return this.gamificationService.claimDailyReward(user.zaloId);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserGamification(@CurrentUser() user: any) {
    return this.gamificationService.getUserGamification(user.zaloId);
  }

  @Post('add-points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async addPoints(
    @CurrentUser() user: any,
    @Body() body: { points: number; reason: string },
  ) {
    return this.gamificationService.addPoints(
      user.zaloId,
      body.points,
      body.reason,
    );
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.gamificationService.getLeaderboard(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Post('exchange-voucher')
  @UseGuards(JwtAuthGuard)
  async exchangeVoucher(
    @CurrentUser() user: any,
    @Body() body: { voucherCode: string; pointsCost: number },
  ) {
    return this.gamificationService.exchangeVoucher(
      user.zaloId,
      body.voucherCode,
      body.pointsCost,
    );
  }
}
