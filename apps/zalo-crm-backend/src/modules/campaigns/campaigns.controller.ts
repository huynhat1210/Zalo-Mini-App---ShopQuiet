import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Post('generate-ai')
  generateAiContent(@Body() body: { topic?: string; targetSegment?: string }) {
    return this.campaignsService.generateAiCampaignContent(body.topic || '', body.targetSegment || 'ALL');
  }

  @Post('predict-ai')
  predictAi(@Body() body: any) {
    return this.campaignsService.predictAiCampaign(body);
  }

  @Post('referral/claim')
  @UseGuards(JwtAuthGuard)
  claimReferral(@Body() body: { inviterZaloId: string }, @CurrentUser() user: any) {
    return this.campaignsService.processReferralReward(body.inviterZaloId, user.zaloId);
  }

  @Get()
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get('user/active')
  @UseGuards(JwtAuthGuard)
  getActiveForUser(@CurrentUser() user: any) {
    return this.campaignsService.getActiveForUser(user.zaloId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.findOne(id);
  }

  @Post(':id/launch')
  launchCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.launchCampaign(id);
  }

  @Post(':id/open')
  @UseGuards(JwtAuthGuard)
  trackOpen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.campaignsService.trackOpen(id, user.zaloId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.remove(id);
  }
}
