import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async getMessages(@Query('zaloUserId') zaloUserId: string) {
    return this.chatService.getMessages(zaloUserId);
  }

  @Post('messages')
  async sendMessage(
    @Body('zaloUserId') zaloUserId: string,
    @Body('sender') sender: string,
    @Body('content') content: string,
  ) {
    return this.chatService.saveMessage(zaloUserId, sender, content);
  }

  @Post('messages/read')
  async markRead(
    @Body('zaloUserId') zaloUserId: string,
    @Body('sender') sender: string,
  ) {
    return this.chatService.markAsRead(zaloUserId, sender);
  }

  @Get('sessions')
  async getSessions() {
    return this.chatService.getSessions();
  }
}
