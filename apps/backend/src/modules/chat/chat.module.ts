import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { GeminiAiOpsService } from './gemini-ai-ops.service';
import { GeminiAiOpsController } from './gemini-ai-ops.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    PrismaModule,
    MediaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  controllers: [ChatController, GeminiAiOpsController],
  providers: [ChatService, ChatGateway, GeminiAiOpsService],
  exports: [ChatService, GeminiAiOpsService],
})
export class ChatModule {}
