import { Controller, Get, Head, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return { status: 'ok', message: 'Server is running' };
  }

  @Head()
  @HttpCode(HttpStatus.OK)
  headHello() {
    return;
  }
}
