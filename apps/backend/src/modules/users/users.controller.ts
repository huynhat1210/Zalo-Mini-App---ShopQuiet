import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Headers,
  UseGuards,
  Param,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SyncUserDto, DecryptPhoneDto } from './dto/sync-user.dto';
import { UpdateSizeProfileDto } from './dto/update-size-profile.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('Users & Addresses')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('size-profile')
  @UseGuards(JwtAuthGuard)
  async getSizeProfile(@Headers('x-zalo-user-id') zaloUserId?: string) {
    if (!zaloUserId) return { height: null, weight: null, footLength: null, clothingSize: null, shoeSize: null };
    return this.usersService.getSizeProfile(zaloUserId);
  }

  @Post('size-profile')
  @UseGuards(JwtAuthGuard)
  async updateSizeProfile(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Body() body: UpdateSizeProfileDto,
  ) {
    const targetUserId = zaloUserId || (body as any).zaloUserId;
    if (!targetUserId) return null;
    return this.usersService.updateSizeProfile(targetUserId, body);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Headers('x-zalo-user-id') zaloUserId?: string) {
    if (!zaloUserId) return null;
    const user = await this.prisma.user.findUnique({
      where: { zaloId: zaloUserId },
      select: {
        zaloId: true,
        name: true,
        avatar: true,
        phone: true,
        email: true,
        birthday: true,
        gender: true,
        gamificationPoints: true,
        membershipTier: true,
        role: true,
        createdAt: true,
      },
    });
    return user;
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncUser(@Body() body: SyncUserDto, @CurrentUser() user: any) {
    if (body.zaloId !== user.zaloId) {
      throw new ForbiddenException('Không thể đồng bộ thông tin của người dùng khác.');
    }
    return this.usersService.syncUser(
      user.zaloId,
      body.name,
      body.avatar,
      body.phone,
      body.birthday,
      body.email,
      body.gender,
      undefined,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Patch(':zaloId/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateUserRole(
    @Param('zaloId') zaloId: string,
    @Body() body: { role?: string },
  ) {
    if (body.role !== 'admin' && body.role !== 'user') {
      throw new BadRequestException('Vai tro nguoi dung khong hop le.');
    }
    return this.usersService.updateUserRole(zaloId, body.role);
  }

  @Delete(':zaloId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteUser(@Param('zaloId') zaloId: string, @CurrentUser() currentUser: any) {
    if (currentUser?.zaloId === zaloId) {
      throw new ForbiddenException('Khong the xoa tai khoan dang dang nhap.');
    }
    return this.usersService.deleteUser(zaloId);
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
  @UseGuards(JwtAuthGuard)
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
