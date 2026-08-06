import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Post('generate-ai')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  generateAiContent(@Body() body: { topic?: string; targetSegment?: string }) {
    return this.campaignsService.generateAiCampaignContent(body.topic || '', body.targetSegment || 'ALL');
  }

  @Post('predict-ai')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  predictAi(@Body() body: any) {
    return this.campaignsService.predictAiCampaign(body);
  }

  @Post('preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  preview(@Body() body: { targetSegment?: string }) {
    return this.campaignsService.previewTargetAudience(body.targetSegment || 'ALL');
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listTemplates() {
    return this.campaignsService.listTemplates();
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createTemplate(@Body() body: any) {
    return this.campaignsService.createTemplate(body);
  }

  @Post('referral/claim')
  @UseGuards(JwtAuthGuard)
  claimReferral(@Body() body: { inviterZaloId: string }, @CurrentUser() user: any) {
    return this.campaignsService.processReferralReward(body.inviterZaloId, user.zaloId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get('user/active')
  @UseGuards(JwtAuthGuard)
  getActiveForUser(@CurrentUser() user: any) {
    return this.campaignsService.getActiveForUser(user.zaloId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.findOne(id);
  }

  @Post(':id/launch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  launchCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.launchCampaign(id);
  }

  @Post(':id/request-approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  requestApproval(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.campaignsService.requestApproval(id, user?.sub || user?.id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.campaignsService.approve(id, user?.sub || user?.id);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  history(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.getHistory(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status?: string }) {
    return this.campaignsService.updateStatus(id, body.status || 'PAUSED');
  }

  @Post(':id/open')
  @UseGuards(JwtAuthGuard)
  trackOpen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.campaignsService.trackOpen(id, user.zaloId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.remove(id);
  }
}
