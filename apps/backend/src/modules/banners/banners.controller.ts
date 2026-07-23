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
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async getBanners() {
    return this.bannersService.findAll();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  async getAllBannersAdmin() {
    return this.bannersService.findAllAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createBanner(
    @Body()
    body: {
      imageUrl: string;
      title?: string;
      description?: string;
      link?: string;
    },
  ) {
    return this.bannersService.create(body);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleBanner(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { active?: boolean },
  ) {
    return this.bannersService.toggleActive(id, body.active);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteBanner(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.remove(id);
  }
}
