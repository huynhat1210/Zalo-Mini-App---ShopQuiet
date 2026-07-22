import { IsString, IsOptional } from 'class-validator';

export class SyncUserDto {
  @IsString()
  zaloId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  membershipTier?: string;
}

export class DecryptPhoneDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  accessToken?: string;
}
