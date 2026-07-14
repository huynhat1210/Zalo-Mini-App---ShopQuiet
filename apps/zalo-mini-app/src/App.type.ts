import type { Dispatch, SetStateAction } from 'react';

export interface IOrderItem {
  id?: number;
  quantity: number;
  price: number;
  product: { name: string; images?: string };
  size?: string;
}

export interface IOrder {
  id: string | number;
  totalAmount: number;
  status: string;
  createdAt: string;
  items?: IOrderItem[];
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  voucherCode?: string;
  discountAmount?: number;
}

export interface INotification {
  id: number;
  title: string;
  content: string;
  type: string;
  read: boolean;
  date: string;
}

export interface IProductCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string | any;
}

export interface IProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string;
  category?: IProductCategory;
  categoryName?: string;
  tags?: string;
  variants?: any[];
}

export interface ICartItem {
  product: IProduct;
  quantity: number;
  size: string;
}

export type TToastType = 'success' | 'warning' | 'info';

export interface IToastState {
  message: string;
  type: TToastType;
}

export interface IZaloUser {
  name: string;
  avatar: string;
  id?: string;
  birthday?: string;
  phone?: string;
}

export interface ICartContextType {
  cart: ICartItem[];
  addToCart: (product: IProduct, quantity?: number, size?: string) => void;
  removeFromCart: (productId: number, size?: string) => void;
  updateQuantity: (productId: number, qty: number, size?: string) => void;
  clearCart: () => void;
  updateItemSize: (productId: number, oldSize: string, newSize: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProductDetail: IProduct | null;
  setSelectedProductDetail: (product: IProduct | null) => void;
  savedItems: IProduct[];
  toggleSavedItem: (product: IProduct) => void;
  isSavedItem: (productId: number) => boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  showToast: (message: string, type?: TToastType) => void;
  toast: IToastState | null;
  zaloUser: IZaloUser | null;
  updateZaloUser: (user: IZaloUser) => void;
  selectedOrder: IOrder | null;
  setSelectedOrder: (order: IOrder | null) => void;
  buyNowItem: ICartItem | null;
  setBuyNowItem: (item: ICartItem | null) => void;
  notifications: INotification[];
  setNotifications: Dispatch<SetStateAction<INotification[]>>;
  fetchNotifications: () => Promise<void>;
}
