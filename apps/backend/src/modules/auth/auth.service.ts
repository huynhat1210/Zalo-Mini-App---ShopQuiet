import { ConflictException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider, UserRole } from '@prisma/client';
import { randomBytes, createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private normalizeLoginIdentifier(value: string) {
    const trimmed = value.trim();
    return trimmed.includes('@') ? trimmed.toLowerCase() : trimmed;
  }

  private getKeycloakConfig() {
    const url = (process.env.KEYCLOAK_URL || '').replace(/\/$/, '');
    const realm = process.env.KEYCLOAK_REALM || 'shopquiet';
    const adminUsername = process.env.KEYCLOAK_ADMIN_USERNAME;
    const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;
    const passwordSecret = process.env.KEYCLOAK_USER_PASSWORD_SECRET;
    if (!url || !adminUsername || !adminPassword || !passwordSecret) {
      throw new UnauthorizedException('Keycloak native login is not configured');
    }
    return { url, realm, adminUsername, adminPassword, passwordSecret };
  }

  private async keycloakAdminToken(config: ReturnType<AuthService['getKeycloakConfig']>) {
    const response = await fetch(`${config.url}/realms/master/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password', client_id: 'admin-cli',
        username: config.adminUsername, password: config.adminPassword,
      }),
    });
    if (!response.ok) {
      this.logger.error(`[Keycloak] Admin token request failed with ${response.status}`);
      throw new UnauthorizedException('Keycloak administrator credentials are invalid');
    }
    const data = await response.json();
    return String(data.access_token || '');
  }

  private async keycloakRequest(
    config: ReturnType<AuthService['getKeycloakConfig']>,
    adminToken: string, path: string, init: RequestInit = {},
  ) {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${adminToken}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(`${config.url}${path}`, { ...init, headers });
    if (!response.ok && response.status !== 409) {
      const details = await response.text();
      this.logger.error(`[Keycloak] Admin API ${path} failed (${response.status}): ${details.slice(0, 300)}`);
      throw new UnauthorizedException('Unable to provision Keycloak user');
    }
    return response;
  }

  private deriveKeycloakPassword(zaloId: string, secret: string) {
    return createHmac('sha256', secret).update(`shopquiet:${zaloId}`).digest('base64url');
  }

  private async issueKeycloakTokens(user: any) {
    const config = this.getKeycloakConfig();
    const adminToken = await this.keycloakAdminToken(config);
    const username = String(user.zaloId);
    const realmPath = `/admin/realms/${encodeURIComponent(config.realm)}`;
    const usersResponse = await this.keycloakRequest(
      config, adminToken,
      `${realmPath}/users?username=${encodeURIComponent(username)}&exact=true`,
      { method: 'GET' },
    );
    const matchingUsers = await usersResponse.json();
    let keycloakUser = Array.isArray(matchingUsers) ? matchingUsers[0] : undefined;
    const userPayload = {
      username, enabled: true, firstName: user.name || 'Zalo User', lastName: '',
      attributes: { zaloId: username },
    };

    if (!keycloakUser) {
      const created = await this.keycloakRequest(
        config, adminToken, `${realmPath}/users`,
        { method: 'POST', body: JSON.stringify(userPayload) },
      );
      const location = created.headers.get('location');
      if (!location) throw new UnauthorizedException('Keycloak user was not created');
      keycloakUser = { id: location.split('/').pop() };
    } else {
      await this.keycloakRequest(
        config, adminToken, `${realmPath}/users/${keycloakUser.id}`,
        { method: 'PUT', body: JSON.stringify(userPayload) },
      );
    }

    if (keycloakUser?.id) {
      const linkedIdentity = await this.prisma.authIdentity.findUnique({
        where: {
          provider_providerSubject: {
            provider: AuthProvider.KEYCLOAK,
            providerSubject: keycloakUser.id,
          },
        },
      });
      if (linkedIdentity && linkedIdentity.zaloUserId !== user.zaloId) {
        throw new ConflictException('Tài khoản Keycloak đã được liên kết với một tài khoản ShopQuiet khác');
      }

      await this.prisma.user.update({
        where: { zaloId: user.zaloId },
        data: {
          lastLoginAt: new Date(),
        },
      });

      await this.prisma.authIdentity.upsert({
        where: { provider_providerSubject: { provider: AuthProvider.KEYCLOAK, providerSubject: keycloakUser.id } },
        create: { zaloUserId: user.zaloId, provider: AuthProvider.KEYCLOAK, providerSubject: keycloakUser.id, verifiedAt: new Date() },
        update: { verifiedAt: new Date() },
      });

      await this.prisma.authIdentity.upsert({
        where: { provider_providerSubject: { provider: AuthProvider.ZALO, providerSubject: String(user.zaloId) } },
        create: { zaloUserId: user.zaloId, provider: AuthProvider.ZALO, providerSubject: String(user.zaloId), verifiedAt: new Date() },
        update: { verifiedAt: new Date() },
      });
    }

    const password = this.deriveKeycloakPassword(username, config.passwordSecret);
    await this.keycloakRequest(
      config, adminToken, `${realmPath}/users/${keycloakUser.id}/reset-password`,
      { method: 'PUT', body: JSON.stringify({ type: 'password', temporary: false, value: password }) },
    );

    const tokenResponse = await fetch(`${config.url}/realms/${encodeURIComponent(config.realm)}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password', client_id: 'shopquiet-mini-app',
        username, password, scope: 'openid profile email',
      }),
    });
    if (!tokenResponse.ok) {
      const details = await tokenResponse.text();
      this.logger.error(`[Keycloak] Native token request failed (${tokenResponse.status}): ${details.slice(0, 300)}`);
      throw new UnauthorizedException('Keycloak could not issue a Mini App token');
    }
    const tokens = await tokenResponse.json();
    return {
      access_token: tokens.access_token, refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in, refresh_expires_in: tokens.refresh_expires_in,
      user: {
        zaloId: user.zaloId, name: user.name, avatar: user.avatar,
        role: user.role || 'USER', phone: user.phone || '', email: user.email || '',
        birthday: user.birthday || null, totalSpent: Number(user.totalSpent) || 0,
        membershipTier: user.membershipTier || 'Đồng',
      },
    };
  }

  async loginWithZaloKeycloak(body: LoginDto) {
    if (!body.accessToken) throw new UnauthorizedException('Zalo Access Token is required');
    const zaloProfile = await this.validateZaloAccessToken(body.accessToken);
    if (!zaloProfile) {
      this.logger.warn('Zalo token verification is unavailable for the current backend region');
      throw new ServiceUnavailableException('Zalo account verification is unavailable from the current server region');
    }
    const user = await this.usersService.syncUser(
      String(zaloProfile.zaloId), zaloProfile.name, zaloProfile.avatar,
    );
    if (!user) throw new UnauthorizedException('Unable to create ShopQuiet user');
    return this.issueKeycloakTokens(user);
  }

  /** Resolve an already-provisioned application user from the Keycloak subject.
   * Authentication must never create a local user as a side effect of validating a token.
   */
  async findUserByKeycloakSubject(subject: string, legacyUsername?: string) {
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.KEYCLOAK,
          providerSubject: subject,
        },
      },
      include: { user: true },
    });
    if (identity?.user) return identity.user;

    // Compatibility for users provisioned before AuthIdentity became canonical.
    if (!legacyUsername) return null;
    const legacyUser = await this.prisma.user.findUnique({ where: { zaloId: legacyUsername } });
    if (!legacyUser) return null;

    await this.prisma.authIdentity.upsert({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.KEYCLOAK,
          providerSubject: subject,
        },
      },
      create: {
        zaloUserId: legacyUser.zaloId,
        provider: AuthProvider.KEYCLOAK,
        providerSubject: subject,
        verifiedAt: new Date(),
      },
      update: { verifiedAt: new Date() },
    });
    return legacyUser;
  }

  async validateUser(zaloId: any): Promise<any> {
    const user = await this.usersService.syncUser(String(zaloId), '', '');
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async validateZaloAccessToken(
    accessToken: string,
  ): Promise<{ zaloId: string; name: string; avatar: string } | null> {
    if (process.env.NODE_ENV !== 'production' && accessToken.startsWith('mock_zalo_token_')) {
      const mockId =
        accessToken.replace('mock_zalo_token_', '') || 'cust-zalo-id-1';
      return {
        zaloId: mockId,
        name: `Zalo User ${mockId}`,
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      };
    }

    try {
      const secretKey = process.env.ZALO_APP_SECRET || '';
      const headers: Record<string, string> = {
        access_token: accessToken,
      };

      if (secretKey) {
        const appsecretProof = createHmac('sha256', secretKey)
          .update(accessToken)
          .digest('hex');
        headers['appsecret_proof'] = appsecretProof;
      }

      const response = await fetch(
        'https://graph.zalo.me/v2.0/me?fields=id,name,picture',
        {
          method: 'GET',
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(`Zalo API returned status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.error === -501) {
        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(
            '[Zalo Auth] Server IP is outside Vietnam (Error -501). Zalo blocked profile retrieval. Bypassing validation for demo.',
          );
        }
        return null;
      }
      if (!data || !data.id) {
        this.logger.error('[Zalo Auth] Invalid Zalo profile response:', data);
        throw new Error(
          data?.message || 'Zalo API returned invalid profile data',
        );
      }

      return {
        zaloId: data.id,
        name: data.name || 'Khách hàng Zalo',
        avatar: data.picture?.data?.url || '',
      };
    } catch (error) {
      this.logger.error('[Zalo Auth] Failed to verify Zalo access token:', error);
      if (process.env.NODE_ENV !== 'production') {
        return {
          zaloId: accessToken,
          name: 'Zalo Test User',
          avatar: '',
        };
      }
      throw new UnauthorizedException('Không thể xác thực tài khoản Zalo');
    }
  }

  async login(
    zaloId: any,
    name: string,
    avatar?: string,
    password?: string,
    accessToken?: string,
  ) {
    let targetZaloId = String(zaloId);
    let targetName = name;
    let targetAvatar = avatar;

    if (accessToken) {
      try {
        const zaloProfile = await this.validateZaloAccessToken(accessToken);
        if (zaloProfile) {
          targetZaloId = String(zaloProfile.zaloId);
          targetName = zaloProfile.name;
          if (zaloProfile.avatar && zaloProfile.avatar !== '') {
            targetAvatar = zaloProfile.avatar;
          }
        }
      } catch (err) {
        targetZaloId = String(zaloId);
        targetName = name;
        targetAvatar = avatar;
      }
    }

    const user = await this.usersService.syncUser(
      targetZaloId,
      targetName,
      targetAvatar,
    );
    if (!user) {
      throw new UnauthorizedException();
    }

    return this.buildUserTokensResponse(user);
  }

  async refreshTokens(refreshToken: string) {
    const decoded: any = this.jwtService.decode(refreshToken);
    if (decoded?.iss?.includes('/realms/')) {
      return this.refreshKeycloakTokens(refreshToken);
    }
    try {
      const payload = this.jwtService.verify(refreshToken);
      const tokenHash = createHmac('sha256', process.env.JWT_SECRET || 'shopquiet_super_secure_jwt_secret_key_2026')
        .update(refreshToken)
        .digest('hex');

      const session = await this.prisma.authSession.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      const newPayload = {
        sub: session.user.zaloId,
        zaloId: session.user.zaloId,
        role: session.user.role || 'USER',
      };

      const new_access_token = this.jwtService.sign(newPayload, { expiresIn: '15m' });
      const new_refresh_token = this.jwtService.sign(newPayload, { expiresIn: '7d' });
      const newHash = createHmac('sha256', process.env.JWT_SECRET || 'shopquiet_super_secure_jwt_secret_key_2026')
        .update(new_refresh_token)
        .digest('hex');

      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      await this.prisma.authSession.create({
        data: {
          zaloUserId: session.user.zaloId,
          tokenHash: newHash,
          expiresAt: newExpiresAt,
        },
      });

      return {
        access_token: new_access_token,
        refresh_token: new_refresh_token,
      };
    } catch (error) {
      this.logger.error('[AuthService] Refresh token error:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async refreshKeycloakTokens(refreshToken: string) {
    const config = this.getKeycloakConfig();
    const response = await fetch(`${config.url}/realms/${encodeURIComponent(config.realm)}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token', client_id: 'shopquiet-mini-app', refresh_token: refreshToken,
      }),
    });
    if (!response.ok) throw new UnauthorizedException('Invalid or expired Keycloak refresh token');
    const tokens = await response.json();
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_in: tokens.expires_in,
      refresh_expires_in: tokens.refresh_expires_in,
    };
  }

  async logout(refreshToken: string) {
    try {
      if (refreshToken) {
        const decoded: any = this.jwtService.decode(refreshToken);
        if (decoded?.iss?.includes('/realms/')) {
          const config = this.getKeycloakConfig();
          await fetch(`${config.url}/realms/${encodeURIComponent(config.realm)}/protocol/openid-connect/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: 'shopquiet-mini-app',
              refresh_token: refreshToken,
            }),
          });
          return { message: 'Logged out successfully' };
        }

        const tokenHash = createHmac('sha256', process.env.JWT_SECRET || 'shopquiet_super_secure_jwt_secret_key_2026')
          .update(refreshToken)
          .digest('hex');
        await this.prisma.authSession.updateMany({
          where: { tokenHash },
          data: { revokedAt: new Date() },
        });
      }
      return { message: 'Logged out successfully' };
    } catch (error) {
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
    return {
      success: false,
      message: 'Phone decryption requires Zalo merchant keys configuration',
    };
  }

  async testZaloVerification(accessToken: string) {
    const secretKey = process.env.ZALO_APP_SECRET || '';
    const headers: Record<string, string> = { access_token: accessToken };
    let appsecretProof = '';
    if (secretKey) {
      appsecretProof = createHmac('sha256', secretKey)
        .update(accessToken)
        .digest('hex');
      headers['appsecret_proof'] = appsecretProof;
    }

    try {
      const response = await fetch(
        'https://graph.zalo.me/v2.0/me?fields=id,name,picture',
        { method: 'GET', headers },
      );
      const data = await response.json();
      return {
        status: response.status,
        ok: response.ok,
        secretKeyLength: secretKey.length,
        appsecretProof,
        zaloResponse: data,
      };
    } catch (e: any) {
      return { error: e.message, stack: e.stack };
    }
  }

  private async buildUserTokensResponse(user: any) {
    const payload = {
      sub: user.zaloId,
      zaloId: user.zaloId,
      role: user.role || 'USER',
    };

    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
    const tokenHash = createHmac('sha256', process.env.JWT_SECRET || 'shopquiet_super_secure_jwt_secret_key_2026')
      .update(refresh_token)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.authSession.create({
      data: {
        zaloUserId: user.zaloId,
        tokenHash,
        expiresAt,
      },
    });

    await this.prisma.user.update({
      where: { zaloId: user.zaloId },
      data: { lastLoginAt: new Date() },
    });

    return {
      // Keep the nested shape used by Mini App and the flat shape used by CMS.
      access_token,
      refresh_token,
      tokens: { access_token, refresh_token },
      user: {
        zaloId: user.zaloId,
        name: user.name,
        avatar: user.avatar,
        role: user.role || 'USER',
        phone: user.phone || '',
        email: user.email || '',
        birthday: user.birthday || null,
        totalSpent: Number(user.totalSpent) || 0,
        membershipTier: user.membershipTier || 'Đồng',
      },
    };
  }

  async register(data: { emailOrPhone: string; name: string; password?: string; avatar?: string }) {
    const { name, avatar } = data;
    const emailOrPhone = this.normalizeLoginIdentifier(data.emailOrPhone);
    const isEmail = emailOrPhone.includes('@');
    
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: isEmail ? emailOrPhone : undefined },
          { phone: !isEmail ? emailOrPhone : undefined },
        ],
      },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email hoặc số điện thoại này đã được đăng ký');
    }

    const generatedZaloId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const user = await this.prisma.user.create({
      data: {
        zaloId: generatedZaloId,
        name: name || 'Thành viên mới',
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        email: isEmail ? emailOrPhone : null,
        phone: !isEmail ? emailOrPhone : null,
        role: UserRole.USER,
      },
    });

    return this.issueKeycloakTokens(user);
  }

  async loginWithPassword(data: { emailOrPhone: string; password: string }) {
    const emailOrPhone = this.normalizeLoginIdentifier(data.emailOrPhone);
    const isEmail = emailOrPhone.includes('@');

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: isEmail ? emailOrPhone : undefined },
          { phone: !isEmail ? emailOrPhone : undefined },
          { zaloId: emailOrPhone },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email/Số điện thoại hoặc thông tin đăng nhập không chính xác');
    }

    return this.issueKeycloakTokens(user);
  }

  async forgotPassword(emailOrPhone: string) {
    return {
      success: true,
      message: 'Vui lòng sử dụng đăng nhập Keycloak OIDC hoặc Zalo SDK để quản lý tài khoản an toàn.',
    };
  }

  async resetPassword(data: { emailOrPhone: string; otp: string; newPassword: string }) {
    return {
      success: true,
      message: 'Vui lòng đặt lại mật khẩu qua trang Keycloak Account Console.',
    };
  }
}
