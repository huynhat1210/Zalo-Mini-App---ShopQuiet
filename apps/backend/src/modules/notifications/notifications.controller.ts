import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateNotificationDto } from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ): Promise<Notification[]> {
    return this.notificationsService.findAll(zaloUserId);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllNotificationsAdmin(): Promise<Notification[]> {
    return this.notificationsService.findAllAdmin();
  }

  @Patch('mark-all-read')
  @UseGuards(JwtAuthGuard)
  async markAllRead(@Headers('x-zalo-user-id') zaloUserId?: string) {
    return this.notificationsService.markAllRead(zaloUserId);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markRead(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createNotification(@Body() body: CreateNotificationDto) {
    return this.notificationsService.create(body);
  }
}
