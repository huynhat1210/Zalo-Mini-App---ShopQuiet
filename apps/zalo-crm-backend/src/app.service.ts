import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Zalo CRM Campaign Service is running successfully!';
  }
}
