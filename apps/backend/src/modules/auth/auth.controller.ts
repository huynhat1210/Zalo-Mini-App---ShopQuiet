import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import {
  LoginDto,
  VerifyTokenDto,
  RefreshTokenDto,
  DecryptPhoneDto,
  RegisterDto,
  LoginPasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/login.dto';
import {
  SuccessResponseDto,
  ErrorResponseDto,
} from '../../common/dto/api-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('test-zalo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Test Zalo token verification' })
  async testZalo(@Query('token') token: string) {
    return this.authService.testZaloVerification(token);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Rate limit: Max 10 login attempts per minute
  @ApiOperation({ summary: 'Login with Zalo ID' })
  @ApiResponse({
    status: 200,
    type: SuccessResponseDto,
    description: 'Login successful',
  })
  @ApiResponse({
    status: 400,
    type: ErrorResponseDto,
    description: 'Bad request',
  })
  async login(@Body() body: LoginDto) {
    return this.authService.login(
      body.zaloId,
      body.name,
      body.avatar,
      body.password,
      body.accessToken,
    );
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register with Email/Phone and Password' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login-password')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with Email/Phone and Password' })
  async loginWithPassword(@Body() body: LoginPasswordDto) {
    return this.authService.loginWithPassword(body);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset OTP' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.emailOrPhone);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with OTP' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    type: SuccessResponseDto,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    type: ErrorResponseDto,
    description: 'Invalid refresh token',
  })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.refresh_token);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    type: SuccessResponseDto,
    description: 'Logout successful',
  })
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body.refresh_token);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiResponse({
    status: 200,
    type: SuccessResponseDto,
    description: 'Token valid',
  })
  @ApiResponse({
    status: 401,
    type: ErrorResponseDto,
    description: 'Invalid token',
  })
  async verify(@Body() body: VerifyTokenDto) {
    return this.authService.verifyToken(body.token);
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin only endpoint' })
  @ApiResponse({
    status: 200,
    type: SuccessResponseDto,
    description: 'Success',
  })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: 'Forbidden',
  })
  getAdminData() {
    return { message: 'This is admin only data' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    type: SuccessResponseDto,
    description: 'Profile retrieved',
  })
  getProfile(@Req() req: any) {
    return req.user;
  }

  @Post('decrypt-phone')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Decrypt Zalo phone number' })
  @ApiResponse({
    status: 200,
    type: SuccessResponseDto,
    description: 'Phone number decrypted',
  })
  @ApiResponse({
    status: 400,
    type: ErrorResponseDto,
    description: 'Decryption failed',
  })
  async decryptPhone(@Body() body: DecryptPhoneDto) {
    return this.authService.decryptPhone(body.zaloId, body.token);
  }
}
