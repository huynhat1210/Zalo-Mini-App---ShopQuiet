import { Controller, Post, Body, Get, UseGuards, Request, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { LoginDto, VerifyTokenDto, RefreshTokenDto, DecryptPhoneDto } from './dto/login.dto';
import { SuccessResponseDto, ErrorResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('test-zalo')
  @ApiOperation({ summary: 'Test Zalo token verification' })
  async testZalo(@Query('token') token: string) {
    return this.authService.testZaloVerification(token);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with Zalo ID' })
  @ApiResponse({ status: 200, type: SuccessResponseDto, description: 'Login successful' })
  @ApiResponse({ status: 400, type: ErrorResponseDto, description: 'Bad request' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.zaloId, body.name, body.avatar, body.password, body.accessToken);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: SuccessResponseDto, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Invalid refresh token' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.refresh_token);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, type: SuccessResponseDto, description: 'Logout successful' })
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body.refresh_token);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiResponse({ status: 200, type: SuccessResponseDto, description: 'Token valid' })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Invalid token' })
  async verify(@Body() body: VerifyTokenDto) {
    return this.authService.verifyToken(body.token);
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin only endpoint' })
  @ApiResponse({ status: 200, type: SuccessResponseDto, description: 'Success' })
  @ApiResponse({ status: 403, type: ErrorResponseDto, description: 'Forbidden' })
  getAdminData() {
    return { message: 'This is admin only data' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, type: SuccessResponseDto, description: 'Profile retrieved' })
  getProfile(@Request() req: any) {
    return req.user;
  }

  @Post('decrypt-phone')
  @ApiOperation({ summary: 'Decrypt Zalo phone number' })
  @ApiResponse({ status: 200, type: SuccessResponseDto, description: 'Phone number decrypted' })
  @ApiResponse({ status: 400, type: ErrorResponseDto, description: 'Decryption failed' })
  async decryptPhone(@Body() body: DecryptPhoneDto) {
    return this.authService.decryptPhone(body.zaloId, body.token);
  }

  @Get('google')
  @ApiOperation({ summary: 'Google OAuth landing page (bypass WebView restriction)' })
  async googleLogin(@Query('state') state: string, @Res() res: any) {
    const googleAuthUrl = this.authService.getGoogleAuthUrl(state);
    // Serve an HTML page instead of direct redirect
    // Google blocks OAuth in embedded WebViews (error 403: disallowed_useragent)
    // This page lets users open the real auth URL in their system browser
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bước 2: Đăng nhập Google</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: white; border-radius: 20px; padding: 32px 24px; max-width: 360px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.10); text-align: center; }
    .logo { width: 56px; height: 56px; margin: 0 auto 20px; }
    h1 { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; }
    p { font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 14px; background: #4285F4; color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; margin-bottom: 12px; }
    .btn:active { background: #3367D6; }
    .note { font-size: 12px; color: #999; margin-top: 16px; }
    .url-box { background: #f0f4ff; border: 1px solid #d0dcff; border-radius: 10px; padding: 10px 14px; font-size: 11px; color: #4a5568; word-break: break-all; text-align: left; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <svg class="logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#f0f4ff"/>
      <path fill="#4285F4" d="M21.745 12.27c0-.7-.06-1.4-.19-2.07H10v3.92h6.69c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.09 3.59-5.17 3.59-8.46z" />
      <path fill="#34A853" d="M10 22c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H-.73v3.1C1.25 19.27 5.37 22 10 22z" />
      <path fill="#FBBC05" d="M3.24 12.24a7.16 7.16 0 0 1 0-4.48v-3.1H-.73a11.96 11.96 0 0 0 0 10.68l3.97-3.1z" />
      <path fill="#EA4335" d="M10 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C15.95-.81 13.24-2 10-2 5.37-2 1.25.73-.73 4.66l3.97 3.1c.95-2.88 3.61-5.01 6.76-5.01z" />
    </svg>
    <h1>Đăng nhập bằng Google</h1>
    <p>Do chính sách bảo mật của Google, bạn cần đăng nhập trong trình duyệt.<br>Nhấn nút bên dưới để tiếp tục:</p>
    <a class="btn" href="${googleAuthUrl}" target="_top">
      <svg width="20" height="20" viewBox="0 0 24 24"><path fill="white" d="M12 1.95c-5.52 0-10 4.48-10 10s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57v-1.43c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57v-1.43c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>
      Mở Google để đăng nhập
    </a>
    <p class="note">ℹ️ Sau khi đăng nhập xong, bạn sẽ được chuyển về ShopQuiet tự động.</p>
  </div>
  <script>
    // Try to auto-redirect if the browser supports it
    setTimeout(() => { window.location.href = "${googleAuthUrl}"; }, 800);
  </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: any) {
    const redirectUrl = await this.authService.handleGoogleCallback(code, state);
    return res.redirect(redirectUrl);
  }

  @Get('facebook')
  @ApiOperation({ summary: 'Redirect to Facebook OAuth' })
  async facebookLogin(@Query('state') state: string, @Res() res: any) {
    const url = this.authService.getFacebookAuthUrl(state);
    return res.redirect(url);
  }

  @Get('facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  async facebookCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: any) {
    const redirectUrl = await this.authService.handleFacebookCallback(code, state);
    return res.redirect(redirectUrl);
  }
}
