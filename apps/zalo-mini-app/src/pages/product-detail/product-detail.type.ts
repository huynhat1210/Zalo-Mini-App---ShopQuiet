import { IProduct } from '../../App';

export interface IProductDetailComponentProps {
  product: IProduct;
  onClose: () => void;
  onAddToCart: (product: IProduct, quantity: number, size?: string) => void;
}
