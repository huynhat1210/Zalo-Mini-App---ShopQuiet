import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Verify JWT Bearer token signature
    let isJwtValid = false;
    try {
      isJwtValid = (await super.canActivate(context)) as boolean;
    } catch (err) {
      throw new UnauthorizedException(
        'Phiên làm việc không hợp lệ hoặc đã hết hạn.',
      );
    }

    if (!isJwtValid || !request.user) {
      throw new UnauthorizedException('Yêu cầu chưa được xác thực.');
    }

    // If x-zalo-user-id header is sent, double check that it matches the user in our JWT payload
    const headerZaloUserId = request.headers['x-zalo-user-id'];
    if (headerZaloUserId && headerZaloUserId !== request.user.zaloId) {
      throw new UnauthorizedException(
        'Thông tin người dùng không khớp với phiên làm việc.',
      );
    }

    return true;
  }
}
