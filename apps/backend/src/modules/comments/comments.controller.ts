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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { Comment } from '@prisma/client';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';

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
  async createComment(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: CreateCommentDto,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ): Promise<Comment> {
    const userId = zaloUserId || 'cust-zalo-id-1';
    return this.commentsService.create(productId, userId, body.content, body.rating, body.orderId, body.images);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReviewImage(@UploadedFile() file: any) {
    if (!file) return { success: false, message: 'No file uploaded' };
    
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return { success: false, message: 'Chỉ chấp nhận các file ảnh!' };
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `review-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const fileUrl = `/uploads/${fileName}`;
    return { success: true, url: fileUrl };
  }
}

