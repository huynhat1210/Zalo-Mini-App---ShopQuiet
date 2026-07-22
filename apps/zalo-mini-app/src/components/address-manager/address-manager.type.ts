export interface IAddressManagerProps {
  isOpen: boolean;
  onClose: () => void;
  zaloUser: any;
  showToast: (message: string, type: "success" | "warning" | "info") => void;
}
