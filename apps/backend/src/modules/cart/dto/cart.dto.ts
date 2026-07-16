import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AddToCartDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateQuantityDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateItemVariantDto {
  @IsNumber()
  productId: number;

  @IsOptional()
  @IsString()
  oldSize?: string;

  @IsOptional()
  @IsString()
  newSize?: string;

  @IsOptional()
  @IsString()
  oldColor?: string;

  @IsOptional()
  @IsString()
  newColor?: string;
}
