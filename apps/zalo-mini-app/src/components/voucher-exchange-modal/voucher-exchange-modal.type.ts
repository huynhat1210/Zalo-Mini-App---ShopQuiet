export interface IVoucherExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gamificationData?: any;
  exchangeVoucher: (code: string, cost: number) => Promise<boolean>;
  onExchangeSuccess?: () => void;
}
