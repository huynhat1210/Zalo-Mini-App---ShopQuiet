import { Controller, Get, Post, Body, Query, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

export class SendChatMessageDto {
  @ApiProperty({ example: 'zalo_user_12345', description: 'ID người dùng Zalo' })
  zaloUserId: string;

  @ApiProperty({ example: 'user', description: 'Người gửi (user hoặc admin)' })
  sender: string;

  @ApiProperty({ example: 'Xin chào Shop, tôi cần tư vấn kích thước áo!', description: 'Nội dung tin nhắn' })
  content: string;
}

export class MarkReadChatDto {
  @ApiProperty({ example: 'zalo_user_12345', description: 'ID người dùng Zalo' })
  zaloUserId: string;

  @ApiProperty({ example: 'admin', description: 'Đánh dấu đọc tin nhắn từ người gửi này' })
  sender: string;
}

@ApiTags('Chat Support')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn tư vấn CSKH của người dùng' })
  @Get('messages')
  async getMessages(@Query('zaloUserId') zaloUserId: string) {
    return this.chatService.getMessages(zaloUserId);
  }

  @ApiOperation({ summary: 'Gửi tin nhắn tư vấn mới (Realtime Socket.IO Sync)' })
  @Post('messages')
  async sendMessage(@Body() dto: SendChatMessageDto) {
    return this.chatService.saveMessage(dto.zaloUserId, dto.sender, dto.content);
  }

  @ApiOperation({ summary: 'Đánh dấu tất cả tin nhắn trong hội thoại là đã đọc' })
  @Post('messages/read')
  async markRead(@Body() dto: MarkReadChatDto) {
    return this.chatService.markAsRead(dto.zaloUserId, dto.sender);
  }

  @ApiOperation({ summary: 'Lấy danh sách tất cả các cuộc hội thoại CSKH (Admin CMS)' })
  @Get('sessions')
  async getSessions() {
    return this.chatService.getSessions();
  }
}
