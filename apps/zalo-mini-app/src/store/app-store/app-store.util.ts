import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from 'zmp-sdk';
import { apiRequest } from '../../utils/api';
import { tokenStorage } from '../../utils/auth';
import type { IAppState } from './app-store.type';
import type { IProduct } from '../../App.type';

// Throttle guard: prevents calling Zalo getUserInfo more than once every 5 seconds
let lastSyncAttempt = 0;
const SYNC_THROTTLE_MS = 5000;

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
      addToCart: (product, quantity = 1, size = 'DEFAULT', color = 'DEFAULT') => {
        const prev = get().cart;
        const existing = prev.find((item) => item.product.id === product.id && item.size === size && item.color === color);
        const next = existing
          ? prev.map((item) =>
            item.product.id === product.id && item.size === size && item.color === color
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          )
          : [...prev, { product, quantity, size, color }];
        set({ cart: next });
        apiRequest('/cart', 'POST', { productId: product.id, quantity, size, color }).catch(console.error);
      },
      removeFromCart: (productId, size = 'DEFAULT', color = 'DEFAULT') => {
        const next = get().cart.filter((item) => !(item.product.id === productId && item.size === size && item.color === color));
        set({ cart: next });
        apiRequest(`/cart/${productId}?size=${encodeURIComponent(size)}&color=${encodeURIComponent(color)}`, 'DELETE').catch(console.error);
      },
      updateQuantity: (productId, qty, size = 'DEFAULT', color = 'DEFAULT') => {
        if (qty <= 0) {
          get().removeFromCart(productId, size, color);
          return;
        }
        const next = get().cart.map((item) =>
          item.product.id === productId && item.size === size && item.color === color ? { ...item, quantity: qty } : item,
        );
        set({ cart: next });
        apiRequest('/cart/quantity', 'PUT', { productId, quantity: qty, size, color }).catch(console.error);
      },
      clearCart: () => {
        set({ cart: [] });
        apiRequest('/cart', 'DELETE').catch(console.error);
      },
      updateItemVariant: (productId, oldSize, newSize, oldColor, newColor) => {
        if (oldSize === newSize && oldColor === newColor) return;
        const previousCart = get().cart;
        const prev = get().cart;
        const oldItem = prev.find((item) => item.product.id === productId && item.size === oldSize && item.color === oldColor);
        if (!oldItem) return;

        const existingNewVariant = prev.find((item) => item.product.id === productId && item.size === newSize && item.color === newColor);
        let nextCart = prev.filter((item) => !(item.product.id === productId && item.size === oldSize && item.color === oldColor));

        if (existingNewVariant) {
          const newQty = existingNewVariant.quantity + oldItem.quantity;
          nextCart = nextCart.map((item) =>
            item.product.id === productId && item.size === newSize && item.color === newColor ? { ...item, quantity: newQty } : item,
          );
        } else {
          nextCart = [...nextCart, { ...oldItem, size: newSize, color: newColor }];
        }

        set({ cart: nextCart });
        apiRequest<any[]>('/cart/variant', 'PUT', { productId, oldSize, newSize, oldColor, newColor })
          .then((backendCart) => {
            if (backendCart && Array.isArray(backendCart)) {
              set({
                cart: backendCart.map((item) => ({
                  product: item.product,
                  quantity: item.quantity,
                  size: item.size || 'DEFAULT',
                  color: item.color || 'DEFAULT',
                })),
              });
            }
          })
          .catch((error) => {
            console.error(error);
            set({ cart: previousCart });
            get().showToast('Không thể đổi phân loại. Vui lòng thử lại.', 'warning');
          });
      },
      toggleSavedItem: (product) => {
        // Require login to save favorites
        if (!get().zaloUser?.id) {
          get().showToast('Đăng nhập để lưu sản phẩm yêu thích!', 'warning');
          return;
        }
        const exists = get().savedItems.some((item) => item.id === product.id);
        const next = exists ? get().savedItems.filter((item) => item.id !== product.id) : [...get().savedItems, product];
        set({ savedItems: next });
        const userId = get().zaloUser!.id;
        localStorage.setItem(`saved_items_${userId}`, JSON.stringify(next));

        if (exists) {
          apiRequest(`/favorites/${product.id}`, 'DELETE').catch(console.error);
        } else {
          apiRequest('/favorites', 'POST', { productId: product.id }).catch(console.error);
        }
      },
      isSavedItem: (productId) => get().savedItems.some((item) => item.id === productId),
      syncUserFromStorage: async (force = false) => {
        // Throttle to prevent repeated getUserInfo calls (Zalo SDK -1409 rate limit)
        const now = Date.now();
        if (!force && now - lastSyncAttempt < SYNC_THROTTLE_MS) {
          return;
        }
        if (!force) {
          lastSyncAttempt = now;
        }

        // Check if JWT tokens are present in URL query params (Google/Facebook OAuth return redirect)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const urlToken = urlParams.get('token');
          const urlRefreshToken = urlParams.get('refreshToken');

          if (urlToken && urlRefreshToken) {
            tokenStorage.setTokens({
              access_token: urlToken,
              refresh_token: urlRefreshToken,
            });

            // Clean the URL query params to keep it clean and prevent reuse
            try {
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {
              console.error('Failed to clean URL parameters:', e);
            }

            try {
              // Fetch user profile using the new token
              const freshUser: any = await apiRequest('/auth/profile', 'GET');
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
                  googleId: freshUser.googleId || null,
                  facebookId: freshUser.facebookId || null,
                };
                set({ zaloUser: mappedUser });
                localStorage.setItem('zalo_profile_custom', JSON.stringify(mappedUser));
                get().fetchCart().catch(console.error);
                get().fetchFavorites().catch(console.error);
                return;
              }
            } catch (err) {
              console.error('Failed to login with URL tokens:', err);
            }
          }
        }

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
                  gender: authData.user.gender || '',
                  totalSpent: authData.user.totalSpent || 0,
                  membershipTier: authData.user.membershipTier || 'Đồng',
                  googleId: authData.user.googleId || null,
                  facebookId: authData.user.facebookId || null,
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

        const fallbackMockUser = () => {
          const isRealZaloEnv = typeof window !== 'undefined' && 
            (window.navigator.userAgent.toLowerCase().includes('zalo') || !!(window as any).ZaloMiniApp);
          
          if (!isRealZaloEnv) {
            const user = {
              id: 'cust-zalo-id-1',
              name: 'Alex Johnson',
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
              phone: '0987654321',
              email: 'alex@example.com',
              birthday: '1995-05-15',
              gender: 'male',
            };
            set({ zaloUser: user });
            localStorage.setItem('zalo_profile_custom', JSON.stringify(user));
            get().fetchCart().catch(console.error);
            get().fetchFavorites().catch(console.error);
          } else {
            // Real Zalo App but user denied permission
            const guestUser = {
              id: 'guest_' + Math.random().toString(36).substring(7),
              name: 'Khách',
              avatar: 'https://zalo-api.zdn.vn/api/emoticon/avatar',
              phone: '',
              email: '',
              birthday: '',
              gender: '',
            };
            set({ zaloUser: guestUser });
            get().fetchCart().catch(console.error);
            get().fetchFavorites().catch(console.error);
          }
        };

        const apiAny = api as any;
        if (typeof window !== 'undefined' && apiAny && apiAny.getUserInfo) {
          const doUserInfo = () => {
            apiAny.getUserInfo({
              autoRequestPermission: true,
              success: async (data: any) => {
                const info = data?.userInfo;
                const zaloId = info?.id || info?.zaloId;
                if (zaloId) {
                  const name = info.name || 'Người dùng Zalo';
                  const avatar = info.avatar || 'https://zalo-api.zdn.vn/api/emoticon/avatar';
                  try {
                    let zaloToken = '';
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
                      zaloToken = `mock_zalo_token_${zaloId}`;
                    }

                    const authData: any = await apiRequest('/auth/login', 'POST', {
                      zaloId: zaloId,
                      name: name,
                      avatar: avatar,
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
                      googleId: authData.user.googleId || null,
                      facebookId: authData.user.facebookId || null,
                    };
                    set({ zaloUser: mappedUser });
                    localStorage.setItem('zalo_profile_custom', JSON.stringify(mappedUser));
                    get().fetchCart().catch(console.error);
                    get().fetchFavorites().catch(console.error);
                  } catch (error) {
                    console.error('Login failed:', error);
                    // Fallback to old sync method
                    const user = {
                      name: name,
                      avatar: avatar,
                      id: zaloId,
                      phone: '',
                      email: '',
                      birthday: '',
                      gender: '',
                    };
                    set({ zaloUser: user });
                    localStorage.setItem('zalo_profile_custom', JSON.stringify(user));
                    apiRequest('/users/sync', 'POST', { zaloId: user.id, name: user.name, avatar: user.avatar }).catch(console.error);
                  }
                } else {
                  console.warn('getUserInfo success but no zaloId found in data:', data);
                  fallbackMockUser();
                }
              },
              fail: (err: any) => {
                console.warn('getUserInfo failed:', err);
                try {
                  api.showToast({
                    message: `Lỗi lấy thông tin Zalo: ${JSON.stringify(err)}`
                  });
                } catch (e) {
                  // ignore
                }
                fallbackMockUser();
              },
            });
          };

          const requestPermissionAndFetch = () => {
            if (apiAny.authorize) {
              apiAny.authorize({
                scopes: ['scope.userInfo'],
                success: () => {
                  doUserInfo();
                },
                fail: (err: any) => {
                  console.warn('authorize scope.userInfo failed:', err);
                  try {
                    api.showToast({
                      message: `Lỗi xin quyền Zalo: ${JSON.stringify(err)}`
                    });
                  } catch (e) {}
                  doUserInfo();
                }
              });
            } else {
              doUserInfo();
            }
          };

          if (apiAny.login) {
            apiAny.login({
              success: requestPermissionAndFetch,
              fail: (err: any) => {
                console.warn('login failed:', err);
                try {
                  api.showToast({
                    message: `Lỗi Đăng nhập Zalo: ${JSON.stringify(err)}`
                  });
                } catch (e) {}
                fallbackMockUser();
              }
            });
          } else {
            requestPermissionAndFetch();
          }
        } else {
          fallbackMockUser();
        }
      },
      fetchFavorites: async () => {
        // Only fetch if user is authenticated
        if (!get().zaloUser?.id) {
          set({ savedItems: [] });
          return;
        }
        try {
          const fetched = await apiRequest<IProduct[]>('/favorites');
          if (fetched && Array.isArray(fetched)) {
            set({ savedItems: fetched });
            const userId = get().zaloUser!.id;
            localStorage.setItem(`saved_items_${userId}`, JSON.stringify(fetched));
          }
        } catch (e) {
          console.error('Failed to fetch favorites from backend:', e);
        }
      },
      fetchCart: async () => {
        // Only fetch if user is authenticated
        if (!get().zaloUser?.id) {
          set({ cart: [] });
          return;
        }
        try {
          const backendCart = await apiRequest<any[]>('/cart');
          if (backendCart && Array.isArray(backendCart)) {
            set({
              cart: backendCart.map((item) => ({
                product: item.product,
                quantity: item.quantity,
                size: item.size || 'DEFAULT',
                color: item.color || 'DEFAULT',
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
