import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const zaloUserId = request.headers['x-zalo-user-id'];

    if (zaloUserId && typeof zaloUserId === 'string' && zaloUserId.trim() !== '') {
      let user = await this.prisma.user.findUnique({
        where: { zaloId: zaloUserId },
      });

      if (!user) {
        try {
          user = await this.prisma.user.create({
            data: {
              zaloId: zaloUserId,
              name: 'Zalo User',
              avatar: '',
            },
          });
        } catch (e) {
          // If creation fails due to race conditions, try fetching again
          user = await this.prisma.user.findUnique({
            where: { zaloId: zaloUserId },
          }) || null;
        }
      }

      if (user) {
        request.user = {
          zaloId: user.zaloId,
          name: user.name,
          role: user.role || 'user',
        };
        return true;
      }
    }

    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (err) {
      throw new UnauthorizedException();
    }
  }
}
