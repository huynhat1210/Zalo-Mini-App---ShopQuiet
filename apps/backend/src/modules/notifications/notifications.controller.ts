import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  ParseIntPipe,
} from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationsService } from './notifications.service';

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
  async getAllNotificationsAdmin(): Promise<Notification[]> {
    return this.notificationsService.findAllAdmin();
  }

  @Patch('mark-all-read')
  async markAllRead(@Headers('x-zalo-user-id') zaloUserId?: string) {
    return this.notificationsService.markAllRead(zaloUserId);
  }

  @Patch(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markRead(id);
  }

  @Post()
  async createNotification(
    @Body()
    body: {
      title: string;
      content: string;
      type: string;
      zaloUserId?: string;
    },
  ) {
    return this.notificationsService.create(body);
  }
}
