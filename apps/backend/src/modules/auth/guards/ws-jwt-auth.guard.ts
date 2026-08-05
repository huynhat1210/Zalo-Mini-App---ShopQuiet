import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Adapts the existing JWT strategy to Socket.IO's handshake request. */
@Injectable()
export class WsJwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  getRequest(context: ExecutionContext) {
    const client = context.switchToWs().getClient();
    const handshake = client.handshake;
    const token = handshake.auth?.token || handshake.headers?.authorization;
    if (token) {
      handshake.headers = handshake.headers || {};
      handshake.headers.authorization = String(token).startsWith('Bearer ')
        ? String(token)
        : `Bearer ${token}`;
    }
    return handshake;
  }

  async canActivate(context: ExecutionContext) {
    try {
      const allowed = await super.canActivate(context);
      const request = this.getRequest(context);
      const client = context.switchToWs().getClient();
      client.data.user = request.user;
      return Boolean(allowed && request.user);
    } catch {
      throw new UnauthorizedException('Socket session is missing or expired.');
    }
  }
}
