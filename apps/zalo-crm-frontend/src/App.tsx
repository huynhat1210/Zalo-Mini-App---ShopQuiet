import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { tokenStorage } from './utils';
import { LayoutComponent, ToastContainerComponent } from './components';
import { ToastProviderComponent, useToast } from './contexts';

// Lazy loading CRM Pages
const Login = lazy(() => import('./pages').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages').then((m) => ({ default: m.Dashboard })));
const Campaigns = lazy(() => import('./pages').then((m) => ({ default: m.Campaigns })));
const Automation = lazy(() => import('./pages').then((m) => ({ default: m.Automation })));

const ToastContainerWrapper: React.FC = () => {
  const { toasts, removeToast } = useToast();
  return <ToastContainerComponent toasts={toasts} onClose={removeToast} />;
};

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    setIsAuthenticated(!!token);
    setChecking(false);

    const handleUnauthorized = () => {
      tokenStorage.clearToken();
      setIsAuthenticated(false);
    };

    window.addEventListener('crm:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('crm:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = () => {
    tokenStorage.clearToken();
    setIsAuthenticated(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs font-semibold">Đang khởi động Campaign Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <ToastProviderComponent>
      <BrowserRouter>
        <LayoutComponent onLogout={handleLogout}>
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-3">
                <div className="w-8 h-8 border-3 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Đang tải dữ liệu...
                </span>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/automation" element={<Automation />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </LayoutComponent>
        <ToastContainerWrapper />
      </BrowserRouter>
    </ToastProviderComponent>
  );
};

export default App;
