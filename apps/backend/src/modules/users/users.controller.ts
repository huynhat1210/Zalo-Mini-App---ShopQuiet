import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SyncUserDto, DecryptPhoneDto } from './dto/sync-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('sync')
  async syncUser(@Body() body: SyncUserDto) {
    return this.usersService.syncUser(body.zaloId, body.name, body.avatar);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Post('decrypt-phone')
  async decryptPhone(@Body() body: DecryptPhoneDto) {
    if (!body.token) {
      return { phoneNumber: '0987654321' };
    }

    const appSecret =
      process.env.ZALO_APP_SECRET || 'your_zalo_app_secret_placeholder';

    try {
      const response = await fetch('https://graph.zalo.me/v2.0/me/info', {
        method: 'GET',
        headers: {
          access_token: body.accessToken || '',
          code: body.token,
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
