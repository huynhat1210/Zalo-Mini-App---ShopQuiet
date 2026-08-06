import { Controller, Get, Post, Body, Query, UseGuards, ForbiddenException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiProperty, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatGateway } from './chat.gateway';
import { CloudinaryService } from '../media/cloudinary.service';

import { IsString } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({ example: 'zalo_user_12345', description: 'ID người dùng Zalo' })
  @IsString()
  zaloUserId: string;

  @ApiProperty({ example: 'user', description: 'Người gửi (user hoặc admin)' })
  @IsString()
  sender: string;

  @ApiProperty({ example: 'Xin chào Shop, tôi cần tư vấn kích thước áo!', description: 'Nội dung tin nhắn' })
  @IsString()
  content: string;
}

export class MarkReadChatDto {
  @ApiProperty({ example: 'zalo_user_12345', description: 'ID người dùng Zalo' })
  @IsString()
  zaloUserId: string;

  @ApiProperty({ example: 'admin', description: 'Đánh dấu đọc tin nhắn từ người gửi này' })
  @IsString()
  sender: string;
}

@ApiTags('Chat Support')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @ApiOperation({ summary: 'Tải ảnh đính kèm tin nhắn CSKH' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req: any, file: any, cb: any) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(new Error('Chỉ chấp nhận các tệp hình ảnh.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadChatImage(@UploadedFile() file: any) {
    if (!file) return { success: false, message: 'Không có tệp hình ảnh.' };
    const url = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      file.mimetype,
      file.originalname,
      'chat',
    );
    return { success: true, url };
  }

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
    const sender = user.role === 'admin' ? 'ADMIN' : 'USER';
    const message = await this.chatService.saveMessage(
      dto.zaloUserId || user.zaloId,
      sender,
      dto.content,
    );
    this.chatGateway.publishMessage(message);
    await this.chatGateway.publishSessions();
    return message;
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

  @ApiOperation({ summary: 'Lấy trạng thái hoạt động CSKH của Shop' })
  @Get('shop-status')
  async getShopStatus() {
    return this.chatService.getShopStatus();
  }

  @ApiOperation({ summary: 'Lấy đơn hàng mới nhất của người dùng để hỗ trợ CSKH' })
  @Get('latest-order')
  @UseGuards(JwtAuthGuard)
  async getLatestOrder(@Query('zaloUserId') zaloUserId: string, @CurrentUser() user: any) {
    const targetUserId = zaloUserId || user.zaloId;
    if (user.role !== 'admin' && targetUserId !== user.zaloId) {
      throw new ForbiddenException('Không có quyền xem thông tin đơn hàng này.');
    }
    return this.chatService.getLatestUserOrder(targetUserId);
  }
}
