import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { GeminiAiOpsService } from './gemini-ai-ops.service';
import { GeminiAiOpsController } from './gemini-ai-ops.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController, GeminiAiOpsController],
  providers: [ChatService, ChatGateway, GeminiAiOpsService],
  exports: [ChatService, GeminiAiOpsService],
})
export class ChatModule {}
