export interface IVoucherWalletProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type: "success" | "warning" | "info") => void;
}
