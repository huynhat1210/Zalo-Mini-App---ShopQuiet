import { Controller, Get, Param, Query } from '@nestjs/common';
import { CmsService, CmsContentType } from './cms.service';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('bootstrap')
  async getBootstrap() {
    return this.cmsService.getBootstrap();
  }

  @Get('content/:type')
  async getContent(@Param('type') type: string, @Query('limit') limit?: string) {
    // Cast incoming string to CmsContentType; the service will handle unknown types gracefully.
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
}
