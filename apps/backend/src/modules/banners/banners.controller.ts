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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('Banners & Media')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async getBanners() {
    return this.bannersService.findAll();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllBannersAdmin() {
    return this.bannersService.findAllAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async toggleBanner(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { active?: boolean },
  ) {
    return this.bannersService.toggleActive(id, body.active);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteBanner(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.remove(id);
  }
}
