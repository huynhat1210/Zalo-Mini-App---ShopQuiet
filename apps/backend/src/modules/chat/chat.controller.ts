import { Controller, Get, Post, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  @UseGuards(JwtAuthGuard)
  async getMessages(
    @Query('zaloUserId') zaloUserId: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'admin' && zaloUserId !== user.zaloId) {
      throw new ForbiddenException('Không có quyền xem cuộc hội thoại này.');
    }
    return this.chatService.getMessages(zaloUserId || user.zaloId);
  }

  @ApiOperation({ summary: 'Gửi tin nhắn tư vấn mới (Realtime Socket.IO Sync)' })
  @Post('messages')
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Body() dto: SendChatMessageDto, @CurrentUser() user: any) {
    if (user.role !== 'admin' && dto.zaloUserId !== user.zaloId) {
      throw new ForbiddenException('Không có quyền gửi tin nhắn cho người dùng khác.');
    }
    if (dto.sender === 'ADMIN' && user.role !== 'admin') {
      throw new ForbiddenException('Chỉ quản trị viên có thể gửi tin nhắn hỗ trợ.');
    }
    return this.chatService.saveMessage(dto.zaloUserId || user.zaloId, dto.sender, dto.content);
  }

  @ApiOperation({ summary: 'Đánh dấu tất cả tin nhắn trong hội thoại là đã đọc' })
  @Post('messages/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@Body() dto: MarkReadChatDto, @CurrentUser() user: any) {
    if (user.role !== 'admin' && dto.zaloUserId !== user.zaloId) {
      throw new ForbiddenException('Không có quyền cập nhật cuộc hội thoại này.');
    }
    return this.chatService.markAsRead(dto.zaloUserId, dto.sender);
  }

  @ApiOperation({ summary: 'Lấy danh sách tất cả các cuộc hội thoại CSKH (Admin CMS)' })
  @Get('sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getSessions() {
    return this.chatService.getSessions();
  }

  @ApiOperation({ summary: 'Lấy số lượng cuộc hội thoại chưa trả lời (Unread Badge Count)' })
  @Get('unread-count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getUnreadCount() {
    return this.chatService.getUnreadSessionsCount();
  }

  @ApiOperation({ summary: 'Lấy số lượng tin nhắn CSKH chưa đọc của User' })
  @Get('user-unread-count')
  @UseGuards(JwtAuthGuard)
  async getUserUnreadCount(@Query('zaloUserId') zaloUserId: string, @CurrentUser() user: any) {
    const targetUserId = zaloUserId || user.zaloId;
    if (user.role !== 'admin' && targetUserId !== user.zaloId) {
      throw new ForbiddenException('Không có quyền xem thông tin này.');
    }
    return this.chatService.getUserUnreadCount(targetUserId);
  }
}
