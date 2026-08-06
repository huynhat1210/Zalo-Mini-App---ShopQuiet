import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { CmsService, CmsContentType } from './cms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '../media/cloudinary.service';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('CMS Admin')
@Controller('cms')
export class CmsController {
  constructor(
    private readonly cmsService: CmsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('bootstrap')
  async getBootstrap() {
    return this.cmsService.getBootstrap();
  }

  @Get('content/:type')
  async getContent(
    @Param('type') type: string,
    @Query('limit') limit?: string,
  ) {
    return this.cmsService.getContent(type as CmsContentType, limit);
  }

  @Get('settings')
  async getSettings() {
    return this.cmsService.getSettings();
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateSettings(@Body() settings: Record<string, string>) {
    return this.cmsService.updateSettings(settings);
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

  @Patch('shipping-methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateShippingMethod(
    @Param('id', ParseIntPipe) id: number,
    @Body('active') active: boolean,
  ) {
    return this.cmsService.setShippingMethodActive(id, active);
  }

  @Get('payment-methods')
  async getPaymentMethods() {
    return this.cmsService.getPaymentMethods();
  }

  @Patch('payment-methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updatePaymentMethod(
    @Param('id', ParseIntPipe) id: number,
    @Body('active') active: boolean,
  ) {
    return this.cmsService.setPaymentMethodActive(id, active);
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
  async createRecord(@Param('modelName') modelName: string, @Body() body: any) {
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

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tra cứu lịch sử thao tác quản trị' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  @ApiQuery({ name: 'action', required: false, example: 'ORDER_STATUS_UPDATED' })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    return this.cmsService.getAuditLogs({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
      action,
    });
  }

  @Get('system-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tra cứu lỗi API và nhật ký hệ thống' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  @ApiQuery({ name: 'level', required: false, enum: ['WARN', 'ERROR'] })
  @ApiQuery({ name: 'statusCode', required: false, example: 401 })
  async getSystemLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('level') level?: string,
    @Query('statusCode') statusCode?: string,
  ) {
    return this.cmsService.getSystemLogs({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
      level,
      statusCode: statusCode ? Number(statusCode) : undefined,
    });
  }

  @Patch('approvals/:type/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duyệt hoặc từ chối nội dung CMS' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái duyệt' })
  async updateApproval(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.cmsService.updateApproval(type, id, status);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for CMS
      fileFilter: (_req: any, file: any, cb: any) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          return cb(new Error('Chỉ chấp nhận các file ảnh!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      return { success: false, message: 'No file uploaded' };
    }

    try {
      const url = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        file.mimetype,
        file.originalname,
        'cms',
      );
      return { success: true, url };
    } catch (error: any) {
      console.error('Cloudinary CMS upload failed:', error.message);
      return { success: false, message: error.message || 'Không thể tải ảnh lên!' };
    }
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getTransactions(
    @Query('search') search?: string,
    @Query('gateway') gateway?: string,
    @Query('status') status?: string,
  ) {
    return this.cmsService.getTransactions(search, gateway, status);
  }

  @Post('transactions/:orderId/manual-confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async manualConfirmTransaction(@Param('orderId') orderId: string) {
    return this.cmsService.manualConfirmTransaction(orderId);
  }
}
