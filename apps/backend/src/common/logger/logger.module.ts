import { Module, Global } from '@nestjs/common';
import { PinoLogger } from './logger.service';

@Global()
@Module({
  providers: [PinoLogger],
  exports: [PinoLogger],
})
export class LoggerModule {}
