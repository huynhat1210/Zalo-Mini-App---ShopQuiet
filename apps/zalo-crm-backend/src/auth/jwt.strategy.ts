import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
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
      // Do not pin validation to a transient Quick Tunnel hostname. The
      // token signature is verified with this realm's JWKS and validate()
      // checks that the token still belongs to the expected realm.
    });
  }

  async validate(payload: any) {
    try {
      const issuer = new URL(String(payload.iss || ''));
      if (issuer.pathname.replace(/\/$/, '') !== `/realms/${process.env.KEYCLOAK_REALM || 'shopquiet'}`) {
        throw new UnauthorizedException('Token does not belong to the ShopQuiet realm');
      }
    } catch {
      throw new UnauthorizedException('Invalid token issuer');
    }
    const subject = String(payload.sub || '');
    const username = payload.preferred_username ? String(payload.preferred_username) : undefined;
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.KEYCLOAK,
          providerSubject: subject,
        },
      },
      include: { user: true },
    });
    const user = identity?.user || (username
      ? await this.prisma.user.findUnique({ where: { zaloId: username } })
      : null);
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
