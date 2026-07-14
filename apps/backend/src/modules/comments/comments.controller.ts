import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Comment } from '@prisma/client';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: CreateCommentDto,
    @Headers('x-zalo-user-id') zaloUserId?: string,
  ): Promise<Comment> {
    const userId = zaloUserId || 'cust-zalo-id-1';
    return this.commentsService.create(productId, userId, body.content, body.rating);
  }
}
