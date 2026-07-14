import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AddToCartDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  size?: string;
}

export class UpdateQuantityDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  size?: string;
}

export class UpdateItemSizeDto {
  @IsNumber()
  productId: number;

  @IsOptional()
  @IsString()
  oldSize?: string;

  @IsOptional()
  @IsString()
  newSize?: string;
}
