export interface IOrderSuccessComponentProps {}

export interface ISuccessOrder {
  orderNumber: string;
  total: number;
  itemsCount: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    images: string;
  }>;
}

