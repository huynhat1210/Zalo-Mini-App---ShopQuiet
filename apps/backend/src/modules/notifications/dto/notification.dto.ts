import { IsString, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  zaloUserId?: string;
}
