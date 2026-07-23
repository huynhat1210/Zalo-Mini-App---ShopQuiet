export interface IVoucher {
  id: number;
  code: string;
  type: 'FIXED' | 'PERCENT';
  value: number;
  minOrderVal?: number;
  maxDiscount?: number;
  stock: number;
  usedCount: number;
  expiresAt: string;
}

export interface IVouchersProps {}
