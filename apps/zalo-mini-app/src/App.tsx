import { createContext, useContext, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { App as ZaloApp, ZMPRouter, SnackbarProvider } from 'zmp-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from './hooks';
import { ToastComponent, BottomNavBarComponent, ErrorBoundaryComponent, OfflineStateComponent, ChatOverlay, ProductComparison } from './components';
import type { ICartContextType } from './App.type';
import { useAppStore } from './store';

// Code splitting with React.lazy
const Home = lazy(() => import('./pages/home').then(module => ({ default: module.Home })));
const Cart = lazy(() => import('./pages/cart').then(module => ({ default: module.Cart })));
const Profile = lazy(() => import('./pages/profile').then(module => ({ default: module.Profile })));
const ProductDetail = lazy(() => import('./pages/product-detail').then(module => ({ default: module.ProductDetail })));
const Search = lazy(() => import('./pages/search').then(module => ({ default: module.Search })));
const Checkout = lazy(() => import('./pages/checkout').then(module => ({ default: module.Checkout })));
const OrderSuccess = lazy(() => import('./pages/order-success').then(module => ({ default: module.OrderSuccess })));
const SavedItems = lazy(() => import('./pages/saved-items').then(module => ({ default: module.SavedItems })));
const Notifications = lazy(() => import('./pages/notifications').then(module => ({ default: module.Notifications })));
const OrderDetail = lazy(() => import('./pages/order-detail').then(module => ({ default: module.OrderDetail })));
const PaymentSimulate = lazy(() => import('./pages/payment-simulate').then(module => ({ default: module.PaymentSimulate })));

export type {
  ICartContextType,
  ICartItem,
  INotification,
  IOrder,
  IOrderItem,
  IProduct,
  IProductCategory,
  IToastState,
  TToastType,
  IZaloUser,
} from './App.type';

const ZaloAppCast = ZaloApp as any;
const ZMPRouterCast = ZMPRouter as any;
const SnackbarProviderCast = SnackbarProvider as any;

if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('React Router Future Flag Warning')) {
      return;
    }
    originalWarn(...args);
  };
}

// 2. Create Context
const CartContext = createContext<ICartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

export default function App() {
  const cart = useAppStore((state) => state.cart);
  const activeTab = useAppStore((state) => state.activeTab);
  const selectedProductDetail = useAppStore((state) => state.selectedProductDetail);
  const savedItems = useAppStore((state) => state.savedItems);
  const isCartOpen = useAppStore((state) => state.isCartOpen);
  const isChatOpen = useAppStore((state) => state.isChatOpen);
  const chatContextProduct = useAppStore((state) => state.chatContextProduct);
  const toast = useAppStore((state) => state.toast);
  const zaloUser = useAppStore((state) => state.zaloUser);
  const selectedOrder = useAppStore((state) => state.selectedOrder);
  const buyNowItem = useAppStore((state) => state.buyNowItem);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setSelectedProductDetail = useAppStore((state) => state.setSelectedProductDetail);
  const setIsCartOpen = useAppStore((state) => state.setIsCartOpen);
  const setIsChatOpen = useAppStore((state) => state.setIsChatOpen);
  const setChatContextProduct = useAppStore((state) => state.setChatContextProduct);
  const setSelectedOrder = useAppStore((state) => state.setSelectedOrder);
  const setBuyNowItem = useAppStore((state) => state.setBuyNowItem);
  const showToast = useAppStore((state) => state.showToast);
  const updateZaloUser = useAppStore((state) => state.updateZaloUser);
  const addToCart = useAppStore((state) => state.addToCart);
  const removeFromCart = useAppStore((state) => state.removeFromCart);
  const updateQuantity = useAppStore((state) => state.updateQuantity);
  const clearCart = useAppStore((state) => state.clearCart);
  const updateItemVariant = useAppStore((state) => state.updateItemVariant);
  const toggleSavedItem = useAppStore((state) => state.toggleSavedItem);
  const isSavedItem = useAppStore((state) => state.isSavedItem);
  const fetchFavorites = useAppStore((state) => state.fetchFavorites);
  const fetchCart = useAppStore((state) => state.fetchCart);
  const syncUserFromStorage = useAppStore((state) => state.syncUserFromStorage);
  const refreshZaloProfile = useAppStore((state) => state.refreshZaloProfile);
  const logout = useAppStore((state) => state.logout);
  const addToViewedProducts = useAppStore((state) => state.addToViewedProducts);
  const viewedProducts = useAppStore((state) => state.viewedProducts);
  const addToComparison = useAppStore((state) => state.addToComparison);
  const removeFromComparison = useAppStore((state) => state.removeFromComparison);
  const clearComparison = useAppStore((state) => state.clearComparison);
  const comparisonProducts = useAppStore((state) => state.comparisonProducts);
  const isComparisonOpen = useAppStore((state) => state.isComparisonOpen);
  const setIsComparisonOpen = useAppStore((state) => state.setIsComparisonOpen);

  // TanStack React Query for Notifications
  const { data: notificationsData, refetch: fetchNotifications } = useNotifications(zaloUser?.id);
  const notifications = notificationsData || [];
  const queryClient = useQueryClient();

  const setNotifications = (updater: any) => {
    const key = ['notifications', zaloUser?.id || 'guest'];
    queryClient.setQueryData(key, (old: any) => {
      if (typeof updater === 'function') {
        return updater(old || []);
      }
      return updater;
    });
  };

  const prevNotificationsRef = useRef<any[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register Service Worker (Only on standard web browser, not inside Zalo App WebView)
  useEffect(() => {
    const isRealZaloEnv = typeof window !== 'undefined' && 
      (window.navigator.userAgent.toLowerCase().includes('zalo') || !!(window as any).ZaloMiniApp);

    if ('serviceWorker' in navigator && typeof window !== 'undefined' && !isRealZaloEnv) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(() => {
            console.log('ServiceWorker registration successful');
          })
          .catch((error) => {
            console.log('ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  const handleRetryConnection = () => {
    const online = navigator.onLine;
    setIsOffline(!online);
    if (online) {
      showToast('Đã kết nối lại internet thành công', 'success');
      fetchCart();
      fetchFavorites();
      fetchNotifications();
    } else {
      showToast('Vẫn chưa có kết nối internet. Vui lòng kiểm tra lại.', 'warning');
    }
  };

  useEffect(() => {
    syncUserFromStorage();
  }, [syncUserFromStorage]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites, zaloUser?.id]);

  useEffect(() => {
    if (notificationsData && prevNotificationsRef.current.length > 0) {
      const newItems = notificationsData.filter(
        (item) => !prevNotificationsRef.current.some((p) => p.id === item.id)
      );
      newItems.forEach((item) => {
        if (!item.read) {
          showToast(`Thông báo mới: ${item.title}`, 'info');
        }
      });
    }
    if (notificationsData) {
      prevNotificationsRef.current = notificationsData;
    }
  }, [notificationsData, showToast]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart, zaloUser?.id]);

  return (
    <ZaloAppCast>
      <ErrorBoundaryComponent>
        <SnackbarProviderCast>
          <CartContext.Provider
          value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            updateItemVariant,
            activeTab,
            setActiveTab,
            selectedProductDetail,
            setSelectedProductDetail,
            savedItems,
            toggleSavedItem,
            isSavedItem,
            isCartOpen,
            setIsCartOpen,
            isChatOpen,
            setIsChatOpen,
            chatContextProduct,
            setChatContextProduct,
            showToast,
            toast,
            zaloUser,
            updateZaloUser,
            selectedOrder,
            setSelectedOrder,
            buyNowItem,
            setBuyNowItem,
            notifications,
            setNotifications: setNotifications as any,
            fetchNotifications: fetchNotifications as any,
            logout,
            refreshZaloProfile,
            syncUserFromStorage,
            addToViewedProducts,
            viewedProducts,
            addToComparison,
            removeFromComparison,
            clearComparison,
            comparisonProducts,
            isComparisonOpen,
            setIsComparisonOpen,
          }}
        >
          <ZMPRouterCast>
            {(() => {
              const showNavbar = ['home', 'search', 'orders', 'notifications', 'profile'].includes(activeTab);
              return (
                <div className={`flex flex-col h-screen overflow-hidden bg-surface overscroll-none relative ${showNavbar ? 'pb-[72px]' : 'pb-0'}`}>
                   {/* Custom Premium Top Toast Notification */}
                   <ToastComponent />
                   <OfflineStateComponent isOffline={isOffline} onRetry={handleRetryConnection} />

                  {/* Active Tab rendering */}
                  <div className="flex-1 flex flex-col relative overflow-hidden">
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-textColor-variant text-xs">Đang tải...</div>}>
                      {activeTab === 'home' && <Home />}
                      {activeTab === 'search' && <Search />}
                      {activeTab === 'orders' && <Profile initialSubPage="orders" />}
                      {activeTab === 'notifications' && <Notifications />}
                      {activeTab === 'profile' && <Profile />}
                      {activeTab === 'ranking' && <Profile initialSubPage="ranking" />}
                      {activeTab === 'saved-items' && <SavedItems />}
                      {activeTab === 'checkout' && <Checkout />}
                      {activeTab === 'order-success' && <OrderSuccess />}
                      {activeTab === 'order-detail' && <OrderDetail />}
                      {activeTab === 'payment-simulate' && <PaymentSimulate />}
                    </Suspense>
                  </div>


                  {/* Product Detail Modal Overlay */}
                  {selectedProductDetail && (
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-textColor-variant text-xs">Đang tải...</div>}>
                      <ProductDetail
                        product={selectedProductDetail}
                        onClose={() => setSelectedProductDetail(null)}
                        onAddToCart={addToCart}
                      />
                    </Suspense>
                  )}

                  {/* Cart Slider Overlay */}
                  {isCartOpen && (
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-textColor-variant text-xs">Đang tải...</div>}>
                      <div className="fixed inset-0 z-[90] flex justify-end bg-black/45 backdrop-blur-xs">
                        <div className="w-full max-w-md h-full bg-white shadow-2xl animate-slide-left border-l border-[#f0edeb]">
                          <div className="h-full flex flex-col">
                            <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center gap-3 border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
                              <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95"
                              >
                                <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                              </button>
                              <span className="text-xs font-bold uppercase tracking-widest text-textColor">Giỏ hàng của bạn</span>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-[#fbf9f7]">
                              <Cart />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Suspense>
                  )}

                  {/* Chat Support Overlay */}
                  {isChatOpen && (
                    <ChatOverlay onClose={() => setIsChatOpen(false)} />
                  )}

                  {/* Product Comparison Overlay */}
                  {isComparisonOpen && (
                    <ProductComparison
                      products={comparisonProducts}
                      onRemove={removeFromComparison}
                      onClose={() => setIsComparisonOpen(false)}
                    />
                  )}

                  {/* Custom Navigation Tab Bar */}
                  <BottomNavBarComponent />
                </div>
              );
            })()}
          </ZMPRouterCast>
        </CartContext.Provider>
      </SnackbarProviderCast>
      </ErrorBoundaryComponent>
    </ZaloAppCast>
  );
}
