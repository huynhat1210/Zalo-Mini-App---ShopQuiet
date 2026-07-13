import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  ParseIntPipe,
} from '@nestjs/common';
import { Comment } from '@prisma/client';
import { CommentsService } from './comments.service';

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
    @Body('content') content: string,
    @Body('rating') rating: number,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ): Promise<Comment> {
    const userId = zaloUserId || 'cust-zalo-id-1';
    return this.commentsService.create(productId, userId, content, rating);
  }
}
