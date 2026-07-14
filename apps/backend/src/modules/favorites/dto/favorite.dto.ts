import { IsNumber } from 'class-validator';

export class AddFavoriteDto {
  @IsNumber()
  productId: number;
}
