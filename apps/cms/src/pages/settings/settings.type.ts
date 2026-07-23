export interface ShippingMethod {
  id: number;
  code: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays?: string;
  active: boolean;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  description?: string;
  badge?: string;
  active: boolean;
}

export interface ISettingsProps {}
