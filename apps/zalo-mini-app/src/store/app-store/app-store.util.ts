import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from 'zmp-sdk';
import { apiRequest } from '../../utils/api';
import { tokenStorage } from '../../utils/auth';
import type { IAppState } from './app-store.type';
import type { IProduct, ICartItem } from '../../App.type';

export const useAppStore = create<IAppState>()(
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
            email: user.email || undefined,
            gender: user.gender || undefined,
          }).then((freshUser: any) => {
            if (freshUser) {
              const mappedUser = {
                id: freshUser.zaloId || freshUser.id,
                name: freshUser.name,
                avatar: freshUser.avatar,
                role: freshUser.role,
                phone: freshUser.phone || '',
                email: freshUser.email || '',
                birthday: freshUser.birthday || '',
                gender: freshUser.gender || '',
                totalSpent: freshUser.totalSpent || 0,
                membershipTier: freshUser.membershipTier || 'Đồng',
              };
              set({ zaloUser: mappedUser });
              localStorage.setItem('zalo_profile_custom', JSON.stringify(mappedUser));
            }
          }).catch(console.error);
        }
      },
      refreshZaloProfile: async () => {
        const currentUser = get().zaloUser;
        if (!currentUser || !currentUser.id) return;
        try {
          const freshUser: any = await apiRequest('/users/sync', 'POST', {
            zaloId: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            phone: currentUser.phone || undefined,
            birthday: currentUser.birthday || undefined,
            email: currentUser.email || undefined,
            gender: currentUser.gender || undefined,
          });
          if (freshUser) {
            const mappedUser = {
              id: freshUser.zaloId || freshUser.id,
              name: freshUser.name,
              avatar: freshUser.avatar,
              role: freshUser.role,
              phone: freshUser.phone || '',
              email: freshUser.email || '',
              birthday: freshUser.birthday || '',
              gender: freshUser.gender || '',
              totalSpent: freshUser.totalSpent || 0,
              membershipTier: freshUser.membershipTier || 'Đồng',
            };
            set({ zaloUser: mappedUser });
            localStorage.setItem('zalo_profile_custom', JSON.stringify(mappedUser));
          }
        } catch (error) {
          console.error('Failed to refresh user profile:', error);
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
      syncUserFromStorage: async () => {
        const cached = localStorage.getItem('zalo_profile_custom');
        const isRealZaloEnv = typeof window !== 'undefined' && 
          (window.navigator.userAgent.toLowerCase().includes('zalo') || !!(window as any).ZaloMiniApp);

        if (cached) {
          const parsed = JSON.parse(cached);
          const isMockId = parsed?.id === 'cust-zalo-id-1' || (parsed?.id && String(parsed.id).startsWith('mock_'));

          if (parsed?.name && parsed.name !== 'Alex Johnson' && !(isRealZaloEnv && isMockId) && parsed.avatar && parsed.avatar !== '') {
            set({ zaloUser: parsed });
            if (parsed.id) {
              // Login to get tokens and fresh profile details
              try {
                let zaloToken = '';
                const apiAny = api as any;
                if (typeof window !== 'undefined' && apiAny && apiAny.getAccessToken) {
                  try {
                    zaloToken = await new Promise((resolve) => {
                      apiAny.getAccessToken({
                        success: (token: string) => resolve(token),
                        fail: () => resolve(''),
                      });
                    });
                  } catch (e) {
                    console.error('Failed to get Zalo access token:', e);
                  }
                }
                if (!zaloToken) {
                  zaloToken = `mock_zalo_token_${parsed.id}`;
                }

                const authData: any = await apiRequest('/auth/login', 'POST', {
                  zaloId: parsed.id,
                  name: parsed.name,
                  avatar: parsed.avatar,
                  accessToken: zaloToken,
                });
                tokenStorage.setTokens({
                  access_token: authData.access_token,
                  refresh_token: authData.refresh_token,
                });
                const mappedUser = {
                  id: authData.user.zaloId || authData.user.id,
                  name: authData.user.name,
                  avatar: authData.user.avatar,
                  role: authData.user.role,
                  phone: authData.user.phone || '',
                  email: authData.user.email || '',
                  birthday: authData.user.birthday || '',
                  totalSpent: authData.user.totalSpent || 0,
                  membershipTier: authData.user.membershipTier || 'Đồng',
                };
                set({ zaloUser: mappedUser });
                localStorage.setItem('zalo_profile_custom', JSON.stringify(mappedUser));
                get().fetchCart().catch(console.error);
                get().fetchFavorites().catch(console.error);
              } catch (error) {
                console.error('Login failed:', error);
              }
            }
            return;
          }
          localStorage.removeItem('zalo_profile_custom');
        }

        const apiAny = api as any;
        if (typeof window !== 'undefined' && apiAny && apiAny.getUserInfo) {
          apiAny.getUserInfo({
            success: async (data: any) => {
              if (data?.userInfo?.name) {
                try {
                  let zaloToken = '';
                  const apiAny = api as any;
                  if (typeof window !== 'undefined' && apiAny && apiAny.getAccessToken) {
                    try {
                      zaloToken = await new Promise((resolve) => {
                        apiAny.getAccessToken({
                          success: (token: string) => resolve(token),
                          fail: () => resolve(''),
                        });
                      });
                    } catch (e) {
                      console.error('Failed to get Zalo access token:', e);
                    }
                  }
                  if (!zaloToken) {
                    zaloToken = `mock_zalo_token_${data.userInfo.id}`;
                  }

                  const authData: any = await apiRequest('/auth/login', 'POST', {
                    zaloId: data.userInfo.id,
                    name: data.userInfo.name,
                    avatar: data.userInfo.avatar,
                    accessToken: zaloToken,
                  });
                  tokenStorage.setTokens({
                    access_token: authData.access_token,
                    refresh_token: authData.refresh_token,
                  });
                  const mappedUser = {
                    id: authData.user.zaloId || authData.user.id,
                    name: authData.user.name,
                    avatar: authData.user.avatar,
                    role: authData.user.role,
                    phone: authData.user.phone || '',
                    email: authData.user.email || '',
                    birthday: authData.user.birthday || '',
                    gender: authData.user.gender || '',
                    totalSpent: authData.user.totalSpent || 0,
                    membershipTier: authData.user.membershipTier || 'Đồng',
                  };
                  set({ zaloUser: mappedUser });
                  localStorage.setItem('zalo_profile_custom', JSON.stringify(mappedUser));
                  get().fetchCart().catch(console.error);
                  get().fetchFavorites().catch(console.error);
                } catch (error) {
                  console.error('Login failed:', error);
                  // Fallback to old sync method
                  const user = {
                    name: data.userInfo.name,
                    avatar: data.userInfo.avatar,
                    id: data.userInfo.id,
                    phone: '',
                    email: '',
                    birthday: '',
                    gender: '',
                  };
                  set({ zaloUser: user });
                  localStorage.setItem('zalo_profile_custom', JSON.stringify(user));
                  apiRequest('/users/sync', 'POST', { zaloId: user.id, name: user.name, avatar: user.avatar }).catch(console.error);
                }
              }
            },
            fail: (err: any) => {
              console.warn('getUserInfo failed:', err);
              try {
                api.showToast({
                  message: 'Đăng nhập thất bại. Vui lòng cho phép quyền truy cập thông tin để sử dụng đầy đủ tính năng!',
                });
              } catch (e) {
                console.error('Failed to show permission toast:', e);
              }
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
      logout: async () => {
        try {
          const refreshToken = tokenStorage.getRefreshToken();
          if (refreshToken) {
            await apiRequest('/auth/logout', 'POST', { refresh_token: refreshToken });
          }
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          tokenStorage.clearTokens();
          localStorage.removeItem('zalo_profile_custom');
          set({ zaloUser: null, cart: [], savedItems: [] });
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
