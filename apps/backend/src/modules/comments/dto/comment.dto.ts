import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsNumber()
  rating: number;

  @IsString()
  @IsOptional()
  orderId?: string;
}
