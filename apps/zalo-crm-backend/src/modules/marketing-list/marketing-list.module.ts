import { Module } from '@nestjs/common';
import { MarketingListController } from './marketing-list.controller';
import { MarketingListService } from './marketing-list.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MarketingListController],
  providers: [MarketingListService],
  exports: [MarketingListService],
})
export class MarketingListModule {}
