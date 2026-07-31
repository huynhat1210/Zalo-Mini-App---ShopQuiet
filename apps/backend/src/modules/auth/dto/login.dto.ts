import { IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  zaloId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class VerifyTokenDto {
  @IsString()
  token: string;
}

export class RefreshTokenDto {
  @IsString()
  refresh_token: string;
}

export class DecryptPhoneDto {
  @IsString()
  token: string;

  @IsString()
  zaloId: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class RegisterDto {
  @IsString()
  emailOrPhone: string;

  @IsString()
  name: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class LoginPasswordDto {
  @IsString()
  emailOrPhone: string;

  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @IsString()
  emailOrPhone: string;
}

export class ResetPasswordDto {
  @IsString()
  emailOrPhone: string;

  @IsString()
  otp: string;

  @IsString()
  newPassword: string;
}

