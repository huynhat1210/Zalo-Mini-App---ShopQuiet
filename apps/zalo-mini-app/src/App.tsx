import { createContext, useContext, useEffect, useRef } from 'react';
import { App as ZaloApp, ZMPRouter, SnackbarProvider } from 'zmp-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from './hooks';
import { HomeComponent } from './pages/home';
import { CartComponent } from './pages/cart';
import { ProfileComponent } from './pages/profile';
import { ProductDetailComponent } from './pages/product-detail';
import { SearchComponent } from './pages/search';
import { CheckoutComponent } from './pages/checkout';
import { OrderSuccessComponent } from './pages/order-success';
import { SavedItemsComponent } from './pages/saved-items';
import { NotificationsComponent } from './pages/notifications';
import { OrderDetailComponent } from './pages/order-detail';
import { PaymentSimulateComponent } from './pages/payment-simulate';
import { ToastComponent, BottomNavBarComponent, ErrorBoundaryComponent } from './components';
import type { ICartContextType } from './App.type';
import { useAppStore } from './store';

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
  const toast = useAppStore((state) => state.toast);
  const zaloUser = useAppStore((state) => state.zaloUser);
  const selectedOrder = useAppStore((state) => state.selectedOrder);
  const buyNowItem = useAppStore((state) => state.buyNowItem);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setSelectedProductDetail = useAppStore((state) => state.setSelectedProductDetail);
  const setIsCartOpen = useAppStore((state) => state.setIsCartOpen);
  const setSelectedOrder = useAppStore((state) => state.setSelectedOrder);
  const setBuyNowItem = useAppStore((state) => state.setBuyNowItem);
  const showToast = useAppStore((state) => state.showToast);
  const updateZaloUser = useAppStore((state) => state.updateZaloUser);
  const addToCart = useAppStore((state) => state.addToCart);
  const removeFromCart = useAppStore((state) => state.removeFromCart);
  const updateQuantity = useAppStore((state) => state.updateQuantity);
  const clearCart = useAppStore((state) => state.clearCart);
  const updateItemSize = useAppStore((state) => state.updateItemSize);
  const toggleSavedItem = useAppStore((state) => state.toggleSavedItem);
  const isSavedItem = useAppStore((state) => state.isSavedItem);
  const fetchFavorites = useAppStore((state) => state.fetchFavorites);
  const fetchCart = useAppStore((state) => state.fetchCart);
  const syncUserFromStorage = useAppStore((state) => state.syncUserFromStorage);
  const logout = useAppStore((state) => state.logout);

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
            updateItemSize,
            activeTab,
            setActiveTab,
            selectedProductDetail,
            setSelectedProductDetail,
            savedItems,
            toggleSavedItem,
            isSavedItem,
            isCartOpen,
            setIsCartOpen,
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
            logout
          }}
        >
          <ZMPRouterCast>
            {(() => {
              const showNavbar = ['home', 'search', 'orders', 'notifications', 'profile'].includes(activeTab);
              return (
                <div className={`flex flex-col h-screen overflow-hidden bg-surface overscroll-none relative ${showNavbar ? 'pb-[72px]' : 'pb-0'}`}>
                  {/* Custom Premium Top Toast Notification */}
                  <ToastComponent />

                  {/* Active Tab rendering */}
                  <div className="flex-1 flex flex-col relative overflow-hidden">
                    {activeTab === 'home' && <HomeComponent />}
                    {activeTab === 'search' && <SearchComponent />}
                    {activeTab === 'orders' && <ProfileComponent initialSubPage="orders" />}
                    {activeTab === 'notifications' && <NotificationsComponent />}
                    {activeTab === 'profile' && <ProfileComponent />}
                    {activeTab === 'saved-items' && <SavedItemsComponent />}
                    {activeTab === 'checkout' && <CheckoutComponent />}
                    {activeTab === 'order-success' && <OrderSuccessComponent />}
                    {activeTab === 'order-detail' && <OrderDetailComponent />}
                    {activeTab === 'payment-simulate' && <PaymentSimulateComponent />}
                  </div>


                  {/* Product Detail Modal Overlay */}
                  {selectedProductDetail && (
                    <ProductDetailComponent
                      product={selectedProductDetail}
                      onClose={() => setSelectedProductDetail(null)}
                      onAddToCart={addToCart}
                    />
                  )}

                  {/* Cart Slider Overlay */}
                  {isCartOpen && (
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
                            <CartComponent />
                          </div>
                        </div>
                      </div>
                    </div>
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
