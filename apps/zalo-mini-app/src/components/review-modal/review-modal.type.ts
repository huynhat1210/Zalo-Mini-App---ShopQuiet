export interface IReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  zaloUser: any;
  orderId: string;
  productId: number | null;
  productName: string;
  productSize: string;
  productQuantity: number;
  showToast: (message: string, type: "success" | "warning" | "info") => void;
  onReviewSuccess: (orderId: string, productId: number) => void;
}
