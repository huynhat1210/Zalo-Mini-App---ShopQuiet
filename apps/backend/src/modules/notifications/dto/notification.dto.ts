import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Ưu đãi cuối tuần', description: 'Tiêu đề thông báo' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Giảm 20% cho đơn hàng hôm nay.', description: 'Nội dung thông báo' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'PROMOTION', description: 'Loại thông báo' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: 'zalo-user-123', description: 'Bỏ trống để gửi cho toàn bộ khách hàng' })
  @IsOptional()
  @IsString()
  zaloUserId?: string;

  @ApiPropertyOptional({ example: '2026-08-06T18:30:00.000Z', description: 'Thời điểm gửi; bỏ trống để gửi ngay' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
