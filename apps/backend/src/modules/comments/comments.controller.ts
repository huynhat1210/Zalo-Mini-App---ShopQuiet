import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  Headers,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Comment } from '@prisma/client';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CloudinaryService } from '../media/cloudinary.service';

import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Comments & Reviews')
@Controller('products/:productId/comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req: any, file: any, cb: any) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(new Error('Chỉ chấp nhận các file ảnh!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadReviewImage(@UploadedFile() file: any) {
    if (!file) return { success: false, message: 'No file uploaded' };

    try {
      const url = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        file.mimetype,
        file.originalname,
        'reviews',
      );
      return { success: true, url };
    } catch (error: any) {
      console.error('Cloudinary upload failed:', error.message);
      return { success: false, message: error.message || 'Không thể tải ảnh lên!' };
    }
  }
}

@ApiTags('Comments & Reviews')
@Controller('cms/comments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CmsCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async getAllComments(
    @Query('search') search?: string,
    @Query('rating') rating?: number,
  ) {
    return this.commentsService.findAllCMS(search, rating);
  }

  @Delete(':id')
  async deleteComment(@Param('id', ParseIntPipe) id: number) {
    return this.commentsService.deleteComment(id);
  }
}
