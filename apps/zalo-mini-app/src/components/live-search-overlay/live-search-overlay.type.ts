import { IProduct } from "../../App";

export interface ILiveSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: IProduct) => void;
  showToast: (message: string, type?: "success" | "warning" | "info") => void;
}
