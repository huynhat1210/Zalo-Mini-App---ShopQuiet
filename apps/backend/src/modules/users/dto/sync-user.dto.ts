import { IsString, IsOptional } from 'class-validator';

export class SyncUserDto {
  @IsString()
  zaloId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class DecryptPhoneDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  accessToken?: string;
}
