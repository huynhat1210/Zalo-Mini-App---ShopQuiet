import { IProduct } from "../../App";

export interface IProductDetailProps {
  product: IProduct;
  onClose: () => void;
  onAddToCart: (
    product: IProduct,
    quantity: number,
    size?: string,
    color?: string,
  ) => void;
}
