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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: path.join(__dirname, '..', '..', '..', 'public', 'uploads'),
        filename: (req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `review-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req: any, file: any, cb: any) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(new Error('Chỉ chấp nhận các file ảnh!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadReviewImage(@UploadedFile() file: any) {
    if (!file) return { success: false, message: 'No file' };
    return {
      success: true,
      url: `/uploads/${file.filename}`,
    };
  }
}

