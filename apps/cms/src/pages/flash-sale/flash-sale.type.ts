export interface IFlashSaleManagementProps {}

export interface IFlashSaleProductItem {
  productId: number;
  isFlashSale: boolean;
  flashSalePrice: number | null;
  flashSaleDiscount: number;
}
