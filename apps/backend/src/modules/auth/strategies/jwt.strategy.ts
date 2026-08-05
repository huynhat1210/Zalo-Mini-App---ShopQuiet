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
      // Quick Tunnel hostnames change between local runs and Keycloak may
      // derive the issuer from the forwarded request host. The signature is
      // still verified against this realm's JWKS; validate() below checks the
      // realm path without hard-coding a transient hostname.
    });
  }

  async validate(payload: any) {
    try {
      const issuer = new URL(String(payload.iss || ''));
      if (issuer.pathname.replace(/\/$/, '') !== `/realms/${process.env.KEYCLOAK_REALM || 'shopquiet'}`) {
        throw new UnauthorizedException('Token không thuộc realm ShopQuiet');
      }
    } catch {
      throw new UnauthorizedException('Issuer token không hợp lệ');
    }
    const subject = String(payload.sub || '');
    const username = payload.preferred_username ? String(payload.preferred_username) : undefined;
    const user = await this.authService.findUserByKeycloakSubject(subject, username);
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
