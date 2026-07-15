import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(zaloId: string): Promise<any> {
    const user = await this.usersService.syncUser(zaloId, '', '');
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async login(zaloId: string, name: string, avatar?: string, password?: string) {
    const isAdminId = zaloId.toLowerCase().includes('admin') || zaloId.toLowerCase() === 'admin-zalo-id-1';
    if (isAdminId) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (!password || password !== adminPassword) {
        throw new UnauthorizedException('Mật khẩu quản trị viên không chính xác');
      }
    }
    const user = await this.usersService.syncUser(zaloId, name, avatar);
    if (!user) {
      throw new UnauthorizedException();
    }
    
    const payload = { sub: user.zaloId, zaloId: user.zaloId, role: user.role || 'user' };
    
    // Generate access token (short-lived: 15 minutes)
    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    
    // Generate refresh token (long-lived: 7 days)
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
    
    // Store refresh token in database
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7);
    
    // Delete old refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({
      where: { zaloUserId: user.zaloId }
    });
    
    // Create new refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refresh_token,
        zaloUserId: user.zaloId,
        expiresAt: refreshTokenExpiresAt,
      },
    });
    
    return {
      access_token,
      refresh_token,
      user: {
        zaloId: user.zaloId,
        name: user.name,
        avatar: user.avatar,
        role: user.role || 'user',
        phone: user.phone || '',
        email: user.email || '',
        birthday: user.birthday || '',
        totalSpent: user.totalSpent || 0,
        membershipTier: user.membershipTier || 'Đồng',
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken);
      
      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });
      
      if (!storedToken || storedToken.expiresAt < new Date()) {
        // Delete expired token
        if (storedToken) {
          await this.prisma.refreshToken.delete({
            where: { id: storedToken.id },
          });
        }
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      
      // Generate new access token
      const newPayload = { 
        sub: storedToken.user.zaloId, 
        zaloId: storedToken.user.zaloId, 
        role: storedToken.user.role || 'user' 
      };
      
      const new_access_token = this.jwtService.sign(newPayload, { expiresIn: '15m' });
      
      // Optionally rotate refresh token
      const new_refresh_token = this.jwtService.sign(newPayload, { expiresIn: '7d' });
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);
      
      // Delete old refresh token and create new one
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      
      await this.prisma.refreshToken.create({
        data: {
          token: new_refresh_token,
          zaloUserId: storedToken.user.zaloId,
          expiresAt: newExpiresAt,
        },
      });
      
      return {
        access_token: new_access_token,
        refresh_token: new_refresh_token,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      // Delete refresh token from database
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
      return { message: 'Logged out successfully' };
    } catch (error) {
      // Don't throw error if token doesn't exist
      return { message: 'Logged out successfully' };
    }
  }

  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async decryptPhone(zaloId: string, token: string) {
    if (token === 'user_rejected') {
      return { success: false, message: 'User rejected permission' };
    }

    if (!token) {
      return { success: false, message: 'Invalid token' };
    }

    // TODO: Integrate real Zalo merchant decryption here when keys are available
    // Real integration: call Zalo API with merchant keys to decrypt the token
    // For now: return failure so user must enter phone manually
    // Only allow if the token contains a pre-verified real phone (set by real Zalo webhook)
    return { success: false, message: 'Phone decryption requires Zalo merchant keys configuration' };
  }
}
