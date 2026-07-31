import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [PrismaModule, WebsocketModule, CampaignsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
