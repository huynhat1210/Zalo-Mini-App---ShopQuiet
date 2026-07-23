export interface IInventoryVariant {
  id: number;
  productId: number;
  color: string;
  colorImage?: string | null;
  size: string;
  stock: number;
  product?: {
    id: number;
    name: string;
    images?: string;
  };
}

export interface IInventoryProps {}
