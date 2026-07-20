import { Module } from '@nestjs/common';
import { OrderTrackingGateway } from './websocket.gateway';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OrderTrackingGateway],
  exports: [OrderTrackingGateway],
})
export class WebsocketModule {}
