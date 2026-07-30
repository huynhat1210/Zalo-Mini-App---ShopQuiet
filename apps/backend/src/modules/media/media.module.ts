import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, CloudinaryService],
  exports: [CloudinaryService], // Export so CommentsModule and CmsModule can use it
})
export class MediaModule {}
