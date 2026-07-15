import type { ICartItem, INotification, IOrder, IProduct, IToastState, TToastType, IZaloUser } from '../../App.type';

export interface IAppState {
  cart: ICartItem[];
  activeTab: string;
  selectedProductDetail: IProduct | null;
  savedItems: IProduct[];
  isCartOpen: boolean;
  toast: IToastState | null;
  zaloUser: IZaloUser | null;
  selectedOrder: IOrder | null;
  buyNowItem: ICartItem | null;
  notifications: INotification[];
  toastTimerRef: ReturnType<typeof setTimeout> | null;

  setActiveTab: (tab: string) => void;
  setSelectedProductDetail: (product: IProduct | null) => void;
  setIsCartOpen: (open: boolean) => void;
  setToast: (toast: IToastState | null) => void;
  showToast: (message: string, type?: TToastType) => void;
  updateZaloUser: (user: IZaloUser) => void;
  setSelectedOrder: (order: IOrder | null) => void;
  setBuyNowItem: (item: ICartItem | null) => void;
  addToCart: (product: IProduct, quantity?: number, size?: string) => void;
  removeFromCart: (productId: number, size?: string) => void;
  updateQuantity: (productId: number, qty: number, size?: string) => void;
  clearCart: () => void;
  updateItemSize: (productId: number, oldSize: string, newSize: string) => void;
  toggleSavedItem: (product: IProduct) => void;
  isSavedItem: (productId: number) => boolean;
  syncUserFromStorage: () => Promise<void>;
  refreshZaloProfile: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchCart: () => Promise<void>;
  logout: () => Promise<void>;
}
