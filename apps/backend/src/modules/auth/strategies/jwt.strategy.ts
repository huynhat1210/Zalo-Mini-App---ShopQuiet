import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    const realm = process.env.KEYCLOAK_REALM || 'shopquiet';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      }),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    const username = payload.preferred_username || payload.sub;
    const user = await this.authService.validateUser(username);
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy tài khoản tương ứng trong hệ thống');
    }

    const kcRoles = payload.realm_access?.roles || [];
    const role = kcRoles.includes('admin') ? 'admin' : (user.role || 'user');

    return {
      zaloId: user.zaloId,
      name: user.name,
      role: role,
    };
  }
}
