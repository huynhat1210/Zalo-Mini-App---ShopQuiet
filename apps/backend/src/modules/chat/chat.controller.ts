import { Controller, Get, Post, Body, Query, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

@ApiTags('Chat Support')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

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
    const savedMsg = await this.chatService.saveMessage(zaloUserId, sender, content);
    try {
      if (this.chatGateway?.server) {
        this.chatGateway.server.to(zaloUserId).to('admin').emit('message', savedMsg);
        const updatedSessions = await this.chatService.getSessions();
        this.chatGateway.server.to('admin').emit('sessions_list', updatedSessions);
      }
    } catch (e) {
      console.error('Socket broadcast error in ChatController:', e);
    }
    return savedMsg;
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
