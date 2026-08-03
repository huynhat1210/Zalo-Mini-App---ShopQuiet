import { Module } from '@nestjs/common';
import { GeminiAiOpsService } from './gemini-ai-ops.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GeminiAiOpsService],
  exports: [GeminiAiOpsService],
})
export class ChatModule {}
