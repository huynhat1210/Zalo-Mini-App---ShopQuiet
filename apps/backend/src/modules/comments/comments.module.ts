import { Module } from '@nestjs/common';
import { CommentsController, CmsCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [CommentsController, CmsCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
