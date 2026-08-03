import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Keycloak from 'keycloak-js';
import { LayoutComponent, ToastContainerComponent } from './components';
import { ToastProviderComponent, useToast, PermissionProviderComponent } from './contexts';
import './App.css';

// Init Keycloak for ShopQuiet CMS Frontend
const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'shopquiet',
  clientId: 'shopquiet-cms',
});

// React Code-Splitting for Instant Page Transitions
const Dashboard = lazy(() => import('./pages').then((m) => ({ default: m.Dashboard })));
const Products = lazy(() => import('./pages').then((m) => ({ default: m.Products })));
const Orders = lazy(() => import('./pages').then((m) => ({ default: m.Orders })));
const Vouchers = lazy(() => import('./pages').then((m) => ({ default: m.Vouchers })));
const Banners = lazy(() => import('./pages').then((m) => ({ default: m.Banners })));
const DatabaseManager = lazy(() => import('./pages').then((m) => ({ default: m.DatabaseManager })));
const UserManagement = lazy(() => import('./pages').then((m) => ({ default: m.UserManagement })));
const Analytics = lazy(() => import('./pages').then((m) => ({ default: m.Analytics })));
const Media = lazy(() => import('./pages').then((m) => ({ default: m.Media })));
const Notifications = lazy(() => import('./pages').then((m) => ({ default: m.Notifications })));
const Support = lazy(() => import('./pages').then((m) => ({ default: m.Support })));
const Categories = lazy(() => import('./pages').then((m) => ({ default: m.Categories })));
const Inventory = lazy(() => import('./pages').then((m) => ({ default: m.Inventory })));
const FlashSaleManagement = lazy(() => import('./pages').then((m) => ({ default: m.FlashSaleManagement })));
const Settings = lazy(() => import('./pages').then((m) => ({ default: m.Settings })));
const CommentsPage = lazy(() => import('./pages').then((m) => ({ default: m.CommentsPage })));
const TransactionsPage = lazy(() => import('./pages').then((m) => ({ default: m.TransactionsPage })));

const ToastContainerWrapper: React.FC = () => {
  const { toasts, removeToast } = useToast();
  return <ToastContainerComponent toasts={toasts} onClose={removeToast} />;
};

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    keycloak
      .init({
        onLoad: 'login-required',
        checkLoginIframe: false,
      })
      .then((authenticated) => {
        setIsAuthenticated(authenticated);
        if (authenticated) {
          localStorage.setItem('cms_access_token', keycloak.token || '');
          localStorage.setItem('cms_refresh_token', keycloak.refreshToken || '');

          const profile = {
            zaloId: keycloak.tokenParsed?.preferred_username || 'admin',
            name: keycloak.tokenParsed?.name || 'Administrator',
            role: keycloak.tokenParsed?.realm_access?.roles?.includes('admin') ? 'admin' : 'user',
          };
          localStorage.setItem('zalo_profile_custom', JSON.stringify(profile));

          // Set up token refresh in background
          setInterval(() => {
            keycloak.updateToken(70).then((refreshed) => {
              if (refreshed) {
                localStorage.setItem('cms_access_token', keycloak.token || '');
              }
            });
          }, 60000);
        }
        setChecking(false);
      })
      .catch((err) => {
        console.error('Failed to initialize Keycloak in CMS:', err);
        setChecking(false);
      });

    const handleUnauthorized = () => {
      localStorage.removeItem('cms_access_token');
      localStorage.removeItem('cms_refresh_token');
      localStorage.removeItem('zalo_profile_custom');
      keycloak.login();
    };

    window.addEventListener('cms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('cms:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('cms_access_token');
    localStorage.removeItem('cms_refresh_token');
    localStorage.removeItem('zalo_profile_custom');
    keycloak.logout();
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-450 text-xs font-semibold">Đang khởi động hệ thống...</p>
      </div>
    );
  }

  return (
    <PermissionProviderComponent>
      <ToastProviderComponent>
        <BrowserRouter>
          <LayoutComponent onLogout={handleLogout}>
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-3">
                  <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Đang tải dữ liệu...
                  </span>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/media" element={<Media />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/products" element={<Products />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/vouchers" element={<Vouchers />} />
                <Route path="/flash-sale" element={<FlashSaleManagement />} />
                <Route path="/banners" element={<Banners />} />
                <Route path="/database/:modelName" element={<DatabaseManager />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/comments" element={<CommentsPage />} />
                <Route path="/support" element={<Support />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/settings" element={<Settings />} />
                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </LayoutComponent>
          <ToastContainerWrapper />
        </BrowserRouter>
      </ToastProviderComponent>
    </PermissionProviderComponent>
  );
};
export default App;
