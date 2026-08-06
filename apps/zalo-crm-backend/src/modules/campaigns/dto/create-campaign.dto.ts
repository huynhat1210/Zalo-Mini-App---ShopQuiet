import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString, IsBoolean, Min, Max } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  type: string; // 'VOUCHER', 'BONUS_COINS', 'BROADCAST', 'FLASH_SALE'

  @IsString()
  @IsOptional()
  targetSegment?: string; // 'ALL', 'SILVER', 'GOLD', 'DIAMOND', 'INACTIVE_30_DAYS', 'VIP'

  @IsString()
  @IsOptional()
  voucherCode?: string;

  @IsInt()
  @IsOptional()
  bonusCoins?: number;

  @IsInt()
  @IsOptional()
  discountPercent?: number;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsBoolean()
  @IsOptional()
  approvalRequired?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1)
  dailyLimit?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(23)
  quietHoursStart?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(23)
  quietHoursEnd?: number;

  @IsString()
  @IsOptional()
  experimentKey?: string;

  @IsString()
  @IsOptional()
  variantLabel?: string;
}
