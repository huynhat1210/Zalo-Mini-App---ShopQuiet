import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString } from 'class-validator';

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
}
