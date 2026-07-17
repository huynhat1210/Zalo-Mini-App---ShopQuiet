import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CmsService, CmsContentType } from './cms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getDatabaseSummary() {
    return this.cmsService.getDatabaseSummary();
  }

  @Get('database/models/:modelName')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getRecords(@Param('modelName') modelName: string) {
    return this.cmsService.getRecords(modelName);
  }

  @Post('database/models/:modelName')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createRecord(
    @Param('modelName') modelName: string,
    @Body() body: any,
  ) {
    return this.cmsService.createRecord(modelName, body);
  }

  @Patch('database/models/:modelName/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateRecord(
    @Param('modelName') modelName: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.cmsService.updateRecord(modelName, id, body);
  }

  @Delete('database/models/:modelName/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteRecord(
    @Param('modelName') modelName: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.deleteRecord(modelName, id);
  }

  @Get('analytics/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getDashboardAnalytics() {
    return this.cmsService.getDashboardAnalytics();
  }

  @Get('settings/shop-status')
  async getShopStatus() {
    return this.cmsService.getShopStatus();
  }

  @Post('settings/shop-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateShopStatus(@Body('status') status: 'ONLINE' | 'OFFLINE') {
    return this.cmsService.updateShopStatus(status);
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAdminNotifications() {
    return this.cmsService.getAdminNotifications();
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      return { success: false, message: 'No file uploaded' };
    }
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const fileUrl = `/uploads/${fileName}`;
    return { success: true, url: fileUrl };
  }
}
