import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SyncUserDto, DecryptPhoneDto } from './dto/sync-user.dto';
import { UpdateSizeProfileDto } from './dto/update-size-profile.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('size-profile')
  async getSizeProfile(@Headers('x-zalo-user-id') zaloUserId?: string) {
    if (!zaloUserId) return { height: null, weight: null, footLength: null, clothingSize: null, shoeSize: null };
    return this.usersService.getSizeProfile(zaloUserId);
  }

  @Post('size-profile')
  async updateSizeProfile(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Body() body: UpdateSizeProfileDto,
  ) {
    const targetUserId = zaloUserId || (body as any).zaloUserId;
    if (!targetUserId) return null;
    return this.usersService.updateSizeProfile(targetUserId, body);
  }

  @Post('sync')
  async syncUser(@Body() body: SyncUserDto) {
    return this.usersService.syncUser(
      body.zaloId,
      body.name,
      body.avatar,
      body.phone,
      body.birthday,
      body.email,
      body.gender,
      body.membershipTier,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('me/reviews')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(@Headers('x-zalo-user-id') zaloUserId?: string) {
    if (!zaloUserId) return [];
    return (this.prisma.comment as any).findMany({
      where: { zaloUserId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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

  @Get('membership-privileges/:tier')
  async getMembershipPrivileges(@Param('tier') tier: string) {
    return this.usersService.getMembershipPrivileges(tier);
  }

  @Post('membership-privileges/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async seedMembershipPrivileges() {
    return this.usersService.seedMembershipPrivileges();
  }

  @Get('tier-benefits')
  @UseGuards(JwtAuthGuard)
  async getUserTierBenefits(@Headers('x-zalo-user-id') zaloUserId?: string) {
    if (!zaloUserId) return null;
    return this.usersService.getUserTierBenefits(zaloUserId);
  }
}
