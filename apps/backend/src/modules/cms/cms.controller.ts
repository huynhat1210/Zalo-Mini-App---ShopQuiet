import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CmsService, CmsContentType } from './cms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('bootstrap')
  async getBootstrap() {
    return this.cmsService.getBootstrap();
  }

  @Get('content/:type')
  async getContent(@Param('type') type: string, @Query('limit') limit?: string) {
    return this.cmsService.getContent(type as CmsContentType, limit);
  }

  @Get('settings')
  async getSettings() {
    return this.cmsService.getSettings();
  }

  @Get('menu-items')
  async getMenuItems(@Query('section') section?: string) {
    return this.cmsService.getMenuItems(section);
  }

  @Get('static-pages')
  async getStaticPages() {
    return this.cmsService.getStaticPages();
  }

  @Get('static-pages/:slug')
  async getStaticPage(@Param('slug') slug: string) {
    return this.cmsService.getStaticPage(slug);
  }

  @Get('shipping-methods')
  async getShippingMethods() {
    return this.cmsService.getShippingMethods();
  }

  @Get('payment-methods')
  async getPaymentMethods() {
    return this.cmsService.getPaymentMethods();
  }

  // --- Dynamic Database Manager CRUD ---

  @Get('database/summary')
  @UseGuards(JwtAuthGuard)
  async getDatabaseSummary() {
    return this.cmsService.getDatabaseSummary();
  }

  @Get('database/models/:modelName')
  @UseGuards(JwtAuthGuard)
  async getRecords(@Param('modelName') modelName: string) {
    return this.cmsService.getRecords(modelName);
  }

  @Post('database/models/:modelName')
  @UseGuards(JwtAuthGuard)
  async createRecord(
    @Param('modelName') modelName: string,
    @Body() body: any,
  ) {
    return this.cmsService.createRecord(modelName, body);
  }

  @Patch('database/models/:modelName/:id')
  @UseGuards(JwtAuthGuard)
  async updateRecord(
    @Param('modelName') modelName: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.cmsService.updateRecord(modelName, id, body);
  }

  @Delete('database/models/:modelName/:id')
  @UseGuards(JwtAuthGuard)
  async deleteRecord(
    @Param('modelName') modelName: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.deleteRecord(modelName, id);
  }
}
