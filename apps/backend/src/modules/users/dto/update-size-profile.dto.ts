import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSizeProfileDto {
  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  footLength?: number;

  @IsOptional()
  @IsString()
  clothingSize?: string;

  @IsOptional()
  @IsString()
  shoeSize?: string;
}
