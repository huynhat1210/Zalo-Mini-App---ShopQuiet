import { IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  zaloId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class VerifyTokenDto {
  @IsString()
  token: string;
}
