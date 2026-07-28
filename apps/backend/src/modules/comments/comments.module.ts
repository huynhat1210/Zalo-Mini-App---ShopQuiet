import { Module } from '@nestjs/common';
import { CommentsController, CmsCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommentsController, CmsCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
