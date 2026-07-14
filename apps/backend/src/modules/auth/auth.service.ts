import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(zaloId: string): Promise<any> {
    const user = await this.usersService.syncUser(zaloId, '', '');
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async login(zaloId: string, name: string, avatar?: string) {
    const user = await this.usersService.syncUser(zaloId, name, avatar);
    if (!user) {
      throw new UnauthorizedException();
    }
    
    const payload = { sub: user.zaloId, zaloId: user.zaloId, role: user.role || 'user' };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        zaloId: user.zaloId,
        name: user.name,
        avatar: user.avatar,
        role: user.role || 'user',
      },
    };
  }

  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
