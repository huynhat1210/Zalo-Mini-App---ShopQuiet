import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async getBanners() {
    return this.bannersService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createBanner(
    @Body() body: { imageUrl: string; title?: string; description?: string; link?: string },
  ) {
    return this.bannersService.create(body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteBanner(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.remove(id);
  }
}
