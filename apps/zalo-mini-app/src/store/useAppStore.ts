import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from 'zmp-sdk';
import { apiRequest } from '../utils/api';
import type { ICartItem, INotification, IOrder, IProduct, IToastState, TToastType, IZaloUser } from '../App.type';

type AppState = {
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
  syncUserFromStorage: () => void;
  fetchFavorites: () => Promise<void>;
  fetchCart: () => Promise<void>;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      cart: [],
      activeTab: 'home',
      selectedProductDetail: null,
      savedItems: [],
      isCartOpen: false,
      toast: null,
      zaloUser: null,
      selectedOrder: null,
      buyNowItem: null,
      notifications: [],
      toastTimerRef: null,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedProductDetail: (product) => set({ selectedProductDetail: product }),
      setIsCartOpen: (open) => set({ isCartOpen: open }),
      setToast: (toast) => set({ toast }),
      showToast: (message, type = 'success') => {
        const { toastTimerRef } = get();
        if (toastTimerRef) {
          clearTimeout(toastTimerRef);
        }
        const timer = setTimeout(() => set({ toast: null }), 2500);
        set({ toast: { message, type }, toastTimerRef: timer });
      },
      updateZaloUser: (user) => {
        set({ zaloUser: user });
        localStorage.setItem('zalo_profile_custom', JSON.stringify(user));
        if (user.id) {
          apiRequest('/users/sync', 'POST', {
            zaloId: user.id,
            name: user.name,
            avatar: user.avatar,
            phone: user.phone || undefined,
            birthday: user.birthday || undefined,
          }).catch(console.error);
        }
      },
      setSelectedOrder: (order) => set({ selectedOrder: order }),
      setBuyNowItem: (item) => set({ buyNowItem: item }),
      addToCart: (product, quantity = 1, size = 'DEFAULT') => {
        const prev = get().cart;
        const existing = prev.find((item) => item.product.id === product.id && item.size === size);
        const next = existing
          ? prev.map((item) =>
            item.product.id === product.id && item.size === size
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          )
          : [...prev, { product, quantity, size }];
        set({ cart: next });
        apiRequest('/cart', 'POST', { productId: product.id, quantity, size }).catch(console.error);
      },
      removeFromCart: (productId, size = 'DEFAULT') => {
        const next = get().cart.filter((item) => !(item.product.id === productId && item.size === size));
        set({ cart: next });
        apiRequest(`/cart/${productId}?size=${encodeURIComponent(size)}`, 'DELETE').catch(console.error);
      },
      updateQuantity: (productId, qty, size = 'DEFAULT') => {
        if (qty <= 0) {
          get().removeFromCart(productId, size);
          return;
        }
        const next = get().cart.map((item) =>
          item.product.id === productId && item.size === size ? { ...item, quantity: qty } : item,
        );
        set({ cart: next });
        apiRequest('/cart/quantity', 'PUT', { productId, quantity: qty, size }).catch(console.error);
      },
      clearCart: () => {
        set({ cart: [] });
        apiRequest('/cart', 'DELETE').catch(console.error);
      },
      updateItemSize: (productId, oldSize, newSize) => {
        if (oldSize === newSize) return;
        const previousCart = get().cart;
        const prev = get().cart;
        const oldItem = prev.find((item) => item.product.id === productId && item.size === oldSize);
        if (!oldItem) return;

        const existingNewSize = prev.find((item) => item.product.id === productId && item.size === newSize);
        let nextCart = prev.filter((item) => !(item.product.id === productId && item.size === oldSize));

        if (existingNewSize) {
          const newQty = existingNewSize.quantity + oldItem.quantity;
          nextCart = nextCart.map((item) =>
            item.product.id === productId && item.size === newSize ? { ...item, quantity: newQty } : item,
          );
        } else {
          nextCart = [...nextCart, { ...oldItem, size: newSize }];
        }

        set({ cart: nextCart });
        apiRequest<any[]>('/cart/size', 'PUT', { productId, oldSize, newSize })
          .then((backendCart) => {
            if (backendCart && Array.isArray(backendCart)) {
              set({
                cart: backendCart.map((item) => ({
                  product: item.product,
                  quantity: item.quantity,
                  size: item.size || 'DEFAULT',
                })),
              });
            }
          })
          .catch((error) => {
            console.error(error);
            set({ cart: previousCart });
            get().showToast('Không thể đổi size. Vui lòng thử lại.', 'warning');
          });
      },
      toggleSavedItem: (product) => {
        const exists = get().savedItems.some((item) => item.id === product.id);
        const next = exists ? get().savedItems.filter((item) => item.id !== product.id) : [...get().savedItems, product];
        set({ savedItems: next });
        const userId = get().zaloUser?.id || 'cust-zalo-id-1';
        localStorage.setItem(`saved_items_${userId}`, JSON.stringify(next));

        if (exists) {
          apiRequest(`/favorites/${product.id}`, 'DELETE').catch(console.error);
        } else {
          apiRequest('/favorites', 'POST', { productId: product.id }).catch(console.error);
        }
      },
      isSavedItem: (productId) => get().savedItems.some((item) => item.id === productId),
      syncUserFromStorage: () => {
        const cached = localStorage.getItem('zalo_profile_custom');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.name && parsed.name !== 'Alex Johnson') {
            set({ zaloUser: parsed });
            if (parsed.id) {
              apiRequest('/users/sync', 'POST', { zaloId: parsed.id, name: parsed.name, avatar: parsed.avatar }).catch(console.error);
            }
            return;
          }
          localStorage.removeItem('zalo_profile_custom');
        }

        const apiAny = api as any;
        if (typeof window !== 'undefined' && apiAny && apiAny.getUserInfo) {
          apiAny.getUserInfo({
            success: (data: any) => {
              if (data?.userInfo?.name) {
                const user = {
                  name: data.userInfo.name,
                  avatar: data.userInfo.avatar,
                  id: data.userInfo.id,
                };
                set({ zaloUser: user });
                localStorage.setItem('zalo_profile_custom', JSON.stringify(user));
                apiRequest('/users/sync', 'POST', { zaloId: user.id, name: user.name, avatar: user.avatar }).catch(console.error);
              }
            },
            fail: (err: any) => {
              console.warn('getUserInfo failed:', err);
            },
          });
        }
      },
      fetchFavorites: async () => {
        try {
          const fetched = await apiRequest<IProduct[]>('/favorites');
          if (fetched && Array.isArray(fetched)) {
            set({ savedItems: fetched });
            const userId = get().zaloUser?.id || 'cust-zalo-id-1';
            localStorage.setItem(`saved_items_${userId}`, JSON.stringify(fetched));
          }
        } catch (e) {
          console.error('Failed to fetch favorites from backend:', e);
          const userId = get().zaloUser?.id || 'cust-zalo-id-1';
          const cachedSaved = localStorage.getItem(`saved_items_${userId}`);
          if (cachedSaved) {
            try {
              set({ savedItems: JSON.parse(cachedSaved) });
            } catch {
              set({ savedItems: [] });
            }
          }
        }
      },
      fetchCart: async () => {
        try {
          const backendCart = await apiRequest<any[]>('/cart');
          if (backendCart && Array.isArray(backendCart)) {
            set({
              cart: backendCart.map((item) => ({
                product: item.product,
                quantity: item.quantity,
                size: item.size || 'DEFAULT',
              })),
            });
          }
        } catch (e) {
          console.error('Failed to fetch cart from backend:', e);
        }
      },


    }),
    {
      name: 'shopquiet-app-storage',
      partialize: (state) => ({
        cart: state.cart,
        savedItems: state.savedItems,
        zaloUser: state.zaloUser,
      }),
    }
  )
);
