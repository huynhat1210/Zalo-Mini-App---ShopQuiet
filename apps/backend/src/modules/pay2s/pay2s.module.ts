import { Module } from '@nestjs/common';
import { Pay2sController } from './pay2s.controller';
import { Pay2sService } from './pay2s.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, WebsocketModule],
  controllers: [Pay2sController],
  providers: [Pay2sService],
  exports: [Pay2sService],
})
export class Pay2sModule {}
