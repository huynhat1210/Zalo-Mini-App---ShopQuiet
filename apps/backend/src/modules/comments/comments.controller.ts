import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { Comment } from '@prisma/client';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products/:productId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async getComments(
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<Comment[]> {
    return this.commentsService.findByProduct(productId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: CreateCommentDto,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ): Promise<Comment> {
    const userId = zaloUserId || (body as any).zaloUserId || 'guest_user';
    return this.commentsService.create(
      productId,
      userId,
      body.content,
      body.rating,
      body.orderId,
      body.images,
    );
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReviewImage(@UploadedFile() file: any) {
    if (!file) return { success: false, message: 'No file uploaded' };

    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return { success: false, message: 'Chỉ chấp nhận các file ảnh!' };
    }

    try {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');

      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('fileToUpload', blob, file.originalname);

      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Catbox error: ${res.statusText}`);
      }

      const fileUrl = await res.text();
      if (!fileUrl || !fileUrl.startsWith('http')) {
        throw new Error(`Invalid Catbox response: ${fileUrl}`);
      }

      return { success: true, url: fileUrl };
    } catch (error: any) {
      console.error(
        'Failed to upload image to Catbox, falling back to local file storage:',
        error,
      );

      try {
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const fileExtension = path.extname(file.originalname);
        const fileName = `review-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        return { success: true, url: `/uploads/${fileName}` };
      } catch (localError) {
        return { success: false, message: 'Không thể lưu trữ hình ảnh!' };
      }
    }
  }
}
