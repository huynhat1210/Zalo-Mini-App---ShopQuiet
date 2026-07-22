import { IOrder, IProduct } from "../../App";

export interface IOrderHistoryProps {
  orders: IOrder[];
  loading: boolean;
  zaloUser: any;
  recommendationProducts: IProduct[];
  setActiveTab: (tab: string) => void;
  setSelectedOrder: (order: IOrder) => void;
  setSelectedProductDetail: (prod: IProduct) => void;
  showToast: (message: string, type: "success" | "warning" | "info") => void;
  onReviewSuccess: (orderId: string, productId: number) => void;
}
