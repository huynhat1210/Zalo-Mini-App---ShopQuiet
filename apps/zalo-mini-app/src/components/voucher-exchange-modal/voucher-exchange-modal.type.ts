export interface IVoucherExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gamificationData?: any;
  userPoints?: number;
  showToast?: (msg: string, type?: string) => void;
  exchangeVoucher?: (code: string, cost: number) => Promise<boolean>;
  onExchangeSuccess?: () => void;
  onVoucherExchanged?: () => void;
}
