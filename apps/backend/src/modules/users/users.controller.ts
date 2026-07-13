import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('sync')
  async syncUser(
    @Body() body: { zaloId: string; name: string; avatar?: string },
  ) {
    return this.usersService.syncUser(body.zaloId, body.name, body.avatar);
  }

  @Get()
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Post('decrypt-phone')
  async decryptPhone(
    @Body('token') token: string,
    @Body('accessToken') accessToken?: string,
  ) {
    if (!token) {
      return { phoneNumber: '0987654321' };
    }

    const appSecret =
      process.env.ZALO_APP_SECRET || 'your_zalo_app_secret_placeholder';

    try {
      const response = await fetch('https://graph.zalo.me/v2.0/me/info', {
        method: 'GET',
        headers: {
          access_token: accessToken || '',
          code: token,
          secret_key: appSecret,
        },
      });

      const data = (await response.json()) as {
        data?: { number?: string };
      };

      const phoneNumber = data?.data?.number;
      if (phoneNumber) {
        return { phoneNumber };
      }

      console.warn(
        '[Zalo Graph API] Phone decryption failed, falling back to simulator value:',
        data,
      );
      return {
        phoneNumber: '0987654321',
        zaloError: data,
      };
    } catch (error) {
      console.error('[Zalo Graph API] Error calling me/info:', error);
      return {
        phoneNumber: '0987654321',
      };
    }
  }
}
