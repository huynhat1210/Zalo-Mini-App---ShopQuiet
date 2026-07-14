import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsNumber()
  categoryId: number;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  images?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  images?: string;
}

export class CreateVariantDto {
  @IsString()
  size: string;

  @IsNumber()
  stock: number;
}

export class UpdateVariantStockDto {
  @IsNumber()
  stock: number;
}
