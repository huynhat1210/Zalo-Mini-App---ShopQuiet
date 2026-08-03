import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createAutomation(@Body() data: any) {
    return this.automationService.createAutomation(data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAllAutomations() {
    return this.automationService.getAllAutomations();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAutomationById(@Param('id') id: string) {
    return this.automationService.getAutomationById(+id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateAutomation(@Param('id') id: string, @Body() data: any) {
    return this.automationService.updateAutomation(+id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteAutomation(@Param('id') id: string) {
    return this.automationService.deleteAutomation(+id);
  }

  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  toggleAutomation(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.automationService.toggleAutomation(+id, enabled);
  }

  @Post('trigger')
  @UseGuards(JwtAuthGuard)
  triggerAutomation(@Body() data: { trigger: string; zaloUserId: string; context?: any }) {
    return this.automationService.triggerAutomation(data.trigger, data.zaloUserId, data.context);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAutomationStats(@Param('id') id: string) {
    return this.automationService.getAutomationStats(+id);
  }

  @Get(':id/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAutomationLogs(@Param('id') id: string, @Param('limit') limit?: string) {
    return this.automationService.getAutomationLogs(+id, limit ? +limit : 50);
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createTemplate(@Body() data: any) {
    return this.automationService.createTemplate(data);
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getTemplates(@Param('category') category?: string) {
    return this.automationService.getTemplates(category);
  }

  @Post('templates/:id/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createFromTemplate(@Param('id') id: string, @Body('name') name: string) {
    return this.automationService.createFromTemplate(+id, name);
  }

  @Post('seed-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  seedTemplates() {
    return this.automationService.seedDefaultTemplates();
  }
}