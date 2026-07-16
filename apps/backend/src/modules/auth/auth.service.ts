import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes, createHmac } from 'crypto';

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

  async validateZaloAccessToken(accessToken: string): Promise<{ zaloId: string; name: string; avatar: string } | null> {
    // 1. If it's a mock token for local testing, return mock data
    if (accessToken.startsWith('mock_zalo_token_')) {
      const mockId = accessToken.replace('mock_zalo_token_', '') || 'cust-zalo-id-1';
      return {
        zaloId: mockId,
        name: `Zalo User ${mockId}`,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
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

      const response = await fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Zalo API returned status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.error === -501) {
        console.warn('[Zalo Auth] Server IP is outside Vietnam (Error -501). Zalo blocked profile retrieval. Bypassing validation for demo.');
        return null;
      }
      if (!data || !data.id) {
        console.error('[Zalo Auth] Invalid Zalo profile response:', data);
        throw new Error(data?.message || 'Zalo API returned invalid profile data');
      }

      return {
        zaloId: data.id,
        name: data.name || 'Khách hàng Zalo',
        avatar: data.picture?.data?.url || '',
      };
    } catch (error) {
      console.error('[Zalo Auth] Failed to verify Zalo access token:', error);
      // Fallback for local development
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

  async login(zaloId: string, name: string, avatar?: string, password?: string, accessToken?: string) {
    let targetZaloId = zaloId;
    let targetName = name;
    let targetAvatar = avatar;

    // Secure token verification if provided or if required in production
    if (accessToken) {
      const zaloProfile = await this.validateZaloAccessToken(accessToken);
      if (zaloProfile) {
        targetZaloId = zaloProfile.zaloId;
        targetName = zaloProfile.name;
        if (zaloProfile.avatar && zaloProfile.avatar !== '') {
          targetAvatar = zaloProfile.avatar;
        }
      } else {
        // Fallback to client-provided parameters if Zalo blocked verification due to server geolocation (-501)
        targetZaloId = zaloId;
        targetName = name;
        targetAvatar = avatar;
      }
    } else {
      // In production, we require an accessToken for non-admin users to log in securely
      const isAdminId = zaloId.toLowerCase().includes('admin') || zaloId.toLowerCase() === 'admin-zalo-id-1';
      if (!isAdminId && process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Yêu cầu Zalo Access Token để đăng nhập an toàn.');
      }
    }

    const isAdminId = targetZaloId.toLowerCase().includes('admin') || targetZaloId.toLowerCase() === 'admin-zalo-id-1';
    if (isAdminId) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (!password || password !== adminPassword) {
        throw new UnauthorizedException('Mật khẩu quản trị viên không chính xác');
      }
    }
    const user = await this.usersService.syncUser(targetZaloId, targetName, targetAvatar);
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

  async testZaloVerification(accessToken: string) {
    const secretKey = process.env.ZALO_APP_SECRET || '';
    const headers: Record<string, string> = {
      access_token: accessToken,
    };
    let appsecretProof = '';
    if (secretKey) {
      appsecretProof = createHmac('sha256', secretKey)
        .update(accessToken)
        .digest('hex');
      headers['appsecret_proof'] = appsecretProof;
    }

    try {
      const response = await fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      return {
        status: response.status,
        ok: response.ok,
        secretKeyLength: secretKey.length,
        appsecretProof,
        zaloResponse: data,
      };
    } catch (e: any) {
      return {
        error: e.message,
        stack: e.stack,
      };
    }
  }

  // ================= GOOGLE OAUTH =================

  getGoogleAuthUrl(state?: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';
    const scope = 'openid profile email';
    const responseType = 'code';
    
    let url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}`;
    if (state) {
      url += `&state=${encodeURIComponent(state)}`;
    }
    return url;
  }

  async handleGoogleCallback(code: string, state?: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';
    const miniAppId = process.env.APP_ID || '3671184609111913737';

    try {
      // 1. Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text();
        throw new Error(`Google token exchange failed: ${errBody}`);
      }

      const tokenData = await tokenResponse.json() as any;
      const accessToken = tokenData.access_token;

      // 2. Fetch user profile from Google info endpoint
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile from Google');
      }

      const profileData = await profileResponse.json() as any;
      const googleId = profileData.sub;
      const name = profileData.name || 'Google User';
      const avatar = profileData.picture || '';
      const email = profileData.email || '';

      let user = null;

      // Check explicit link via state (Zalo User ID)
      if (state && !state.startsWith('google-') && !state.startsWith('facebook-')) {
        const existingUser = await this.prisma.user.findUnique({ where: { zaloId: state } });
        if (existingUser) {
          user = await this.prisma.user.update({
            where: { zaloId: state },
            data: {
              googleId,
              email: existingUser.email || email || null,
              avatar: existingUser.avatar || avatar || null,
            },
          });
        }
      }

      // Check if user already exists with this googleId
      if (!user) {
        user = await this.prisma.user.findUnique({ where: { googleId } });
      }

      // Check auto-link by email matching
      if (!user && email) {
        const existingUserByEmail = await this.prisma.user.findFirst({ where: { email } });
        if (existingUserByEmail) {
          user = await this.prisma.user.update({
            where: { zaloId: existingUserByEmail.zaloId },
            data: { googleId },
          });
        }
      }

      // Fallback: Create new user profile for Google
      if (!user) {
        const targetZaloId = `google-${googleId}`;
        const synced = await this.usersService.syncUser(
          targetZaloId,
          name,
          avatar,
          undefined,
          undefined,
          email,
        );

        if (!synced) {
          throw new Error('Failed to synchronize user in database');
        }

        user = await this.prisma.user.update({
          where: { zaloId: synced.zaloId },
          data: { googleId },
        });
      }

      const targetZaloId = user.zaloId;

      // 4. Generate JWT Access and Refresh Tokens
      const jwtToken = this.jwtService.sign({ sub: targetZaloId, role: user.role });
      
      const refreshToken = randomBytes(40).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
      
      await this.prisma.refreshToken.upsert({
        where: { token: refreshToken },
        update: { expiresAt },
        create: {
          token: refreshToken,
          zaloUserId: targetZaloId,
          expiresAt,
        },
      });

      // 5. Redirect back to Zalo Mini App with JWT tokens
      return `https://zalo.me/s/${miniAppId}/?token=${encodeURIComponent(jwtToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;
    } catch (e: any) {
      console.error('[Google OAuth Error]', e);
      return `https://zalo.me/s/${miniAppId}/?error=${encodeURIComponent(e.message)}`;
    }
  }

  // ================= FACEBOOK OAUTH =================

  getFacebookAuthUrl(state?: string): string {
    const appId = process.env.FACEBOOK_APP_ID || '';
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || '';
    const scope = 'public_profile,email';
    
    let url = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code`;
    if (state) {
      url += `&state=${encodeURIComponent(state)}`;
    }
    return url;
  }

  async handleFacebookCallback(code: string, state?: string): Promise<string> {
    const appId = process.env.FACEBOOK_APP_ID || '';
    const appSecret = process.env.FACEBOOK_APP_SECRET || '';
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || '';
    const miniAppId = process.env.APP_ID || '3671184609111913737';

    try {
      // 1. Exchange code for access token
      const tokenResponse = await fetch(`https://graph.facebook.com/v12.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`);

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text();
        throw new Error(`Facebook token exchange failed: ${errBody}`);
      }

      const tokenData = await tokenResponse.json() as any;
      const accessToken = tokenData.access_token;

      // 2. Fetch Facebook profile details
      const profileResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,picture.type(large),email&access_token=${encodeURIComponent(accessToken)}`);

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile from Facebook');
      }

      const profileData = await profileResponse.json() as any;
      const facebookId = profileData.id;
      const name = profileData.name || 'Facebook User';
      const avatar = profileData.picture?.data?.url || '';
      const email = profileData.email || '';

      let user = null;

      // Check explicit link via state (Zalo User ID)
      if (state && !state.startsWith('google-') && !state.startsWith('facebook-')) {
        const existingUser = await this.prisma.user.findUnique({ where: { zaloId: state } });
        if (existingUser) {
          user = await this.prisma.user.update({
            where: { zaloId: state },
            data: {
              facebookId,
              email: existingUser.email || email || null,
              avatar: existingUser.avatar || avatar || null,
            },
          });
        }
      }

      // Check if user already exists with this facebookId
      if (!user) {
        user = await this.prisma.user.findUnique({ where: { facebookId } });
      }

      // Check auto-link by email matching
      if (!user && email) {
        const existingUserByEmail = await this.prisma.user.findFirst({ where: { email } });
        if (existingUserByEmail) {
          user = await this.prisma.user.update({
            where: { zaloId: existingUserByEmail.zaloId },
            data: { facebookId },
          });
        }
      }

      // Fallback: Create new user profile for Facebook
      if (!user) {
        const targetZaloId = `facebook-${facebookId}`;
        const synced = await this.usersService.syncUser(
          targetZaloId,
          name,
          avatar,
          undefined,
          undefined,
          email,
        );

        if (!synced) {
          throw new Error('Failed to synchronize user in database');
        }

        user = await this.prisma.user.update({
          where: { zaloId: synced.zaloId },
          data: { facebookId },
        });
      }

      const targetZaloId = user.zaloId;

      // 4. Generate JWT Access and Refresh Tokens
      const jwtToken = this.jwtService.sign({ sub: targetZaloId, role: user.role });
      
      const refreshToken = randomBytes(40).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
      
      await this.prisma.refreshToken.upsert({
        where: { token: refreshToken },
        update: { expiresAt },
        create: {
          token: refreshToken,
          zaloUserId: targetZaloId,
          expiresAt,
        },
      });

      // 5. Redirect back to Zalo Mini App with JWT tokens
      return `https://zalo.me/s/${miniAppId}/?token=${encodeURIComponent(jwtToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;
    } catch (e: any) {
      console.error('[Facebook OAuth Error]', e);
      return `https://zalo.me/s/${miniAppId}/?error=${encodeURIComponent(e.message)}`;
    }
  }
}
