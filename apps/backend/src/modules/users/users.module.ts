import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AutomationModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
