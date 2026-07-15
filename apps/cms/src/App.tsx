import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { tokenStorage } from './utils';
import { LayoutComponent, ToastContainerComponent } from './components';
import { 
  Login, 
  Dashboard, 
  Products, 
  Orders, 
  Vouchers, 
  Banners, 
  DatabaseManager, 
  UserManagement 
} from './pages';
import { ToastProviderComponent, useToast, PermissionProviderComponent } from './contexts';
import './App.css';

const ToastContainerWrapper: React.FC = () => {
  const { toasts, removeToast } = useToast();
  return <ToastContainerComponent toasts={toasts} onClose={removeToast} />;
};

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if token exists on load
    const token = tokenStorage.getAccessToken();
    setIsAuthenticated(!!token);
    setChecking(false);
  }, []);

  const handleLogout = () => {
    tokenStorage.clearToken();
    setIsAuthenticated(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-450 text-xs font-semibold">Đang khởi động hệ thống...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <PermissionProviderComponent>
      <ToastProviderComponent>
        <BrowserRouter>
          <LayoutComponent onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/vouchers" element={<Vouchers />} />
              <Route path="/banners" element={<Banners />} />
              <Route path="/database/:modelName" element={<DatabaseManager />} />
              <Route path="/users" element={<UserManagement />} />
              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LayoutComponent>
          <ToastContainerWrapper />
        </BrowserRouter>
      </ToastProviderComponent>
    </PermissionProviderComponent>
  );
};
export default App;
