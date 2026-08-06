import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Keycloak from 'keycloak-js';
import { LayoutComponent, ToastContainerComponent } from './components';
import { ToastProviderComponent, useToast } from './contexts';

// Init Keycloak for ShopQuiet Campaign Frontend
const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'shopquiet',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'shopquiet-campaign',
});
const keycloakIssuer = `${import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080'}/realms/${import.meta.env.VITE_KEYCLOAK_REALM || 'shopquiet'}`;

let keycloakInitialization: Promise<boolean> | undefined;
let tokenRefreshInterval: ReturnType<typeof setInterval> | undefined;
let tokenRefreshInFlight: Promise<boolean> | undefined;
let authRedirectInProgress = false;
const KEYCLOAK_INIT_TIMEOUT_MS = 12000;
const APP_LOGIN_SESSION_KEY = 'campaign_keycloak_login_session';

function persistKeycloakSession() {
  localStorage.setItem('crm_access_token', keycloak.token || '');
  localStorage.setItem('crm_refresh_token', keycloak.refreshToken || '');
  localStorage.setItem('crm_auth_provider', 'keycloak');
  localStorage.setItem('crm_keycloak_issuer', keycloakIssuer);

  const profile = {
    zaloId: keycloak.tokenParsed?.preferred_username || 'admin',
    name: keycloak.tokenParsed?.name || 'Administrator',
    role: keycloak.tokenParsed?.realm_access?.roles?.includes('admin') ? 'admin' : 'user',
  };
  localStorage.setItem('crm_profile', JSON.stringify(profile));
}

function clearStaleKeycloakSession() {
  const token = localStorage.getItem('crm_access_token') || '';
  const tokenPayload = token.split('.')[1];
  let tokenIssuer = '';
  if (tokenPayload) {
    try {
      tokenIssuer = JSON.parse(atob(tokenPayload.replace(/-/g, '+').replace(/_/g, '/'))).iss || '';
    } catch {
      tokenIssuer = '';
    }
  }
  if (localStorage.getItem('crm_keycloak_issuer') !== keycloakIssuer || (tokenIssuer && tokenIssuer !== keycloakIssuer)) {
    localStorage.removeItem('crm_access_token');
    localStorage.removeItem('crm_refresh_token');
    localStorage.removeItem('crm_auth_provider');
    localStorage.removeItem('crm_profile');
  }
}

function restartKeycloakLogin() {
  if (authRedirectInProgress) return;
  authRedirectInProgress = true;
  localStorage.removeItem('crm_access_token');
  localStorage.removeItem('crm_refresh_token');
  localStorage.removeItem('crm_auth_provider');
  localStorage.removeItem('crm_profile');
  // Reuse the existing Keycloak SSO session instead of forcing a password
  // prompt on every recoverable API 401.
  void keycloak.login().catch((error) => {
    authRedirectInProgress = false;
    console.error('Failed to restart Keycloak login in Campaign Portal:', error);
  });
}

async function refreshKeycloakToken(minValidity: number) {
  if (!tokenRefreshInFlight) {
    tokenRefreshInFlight = keycloak
      .updateToken(minValidity)
      .then((refreshed) => {
        persistKeycloakSession();
        return refreshed;
      })
      .finally(() => {
        tokenRefreshInFlight = undefined;
      });
  }

  return tokenRefreshInFlight;
}

function initializeKeycloak() {
  if (!keycloakInitialization) {
    clearStaleKeycloakSession();
    const authResponse = /(?:[?#&])(?:code|error)=/.test(window.location.href);
    const appSessionActive = sessionStorage.getItem(APP_LOGIN_SESSION_KEY) === 'active';
    keycloakInitialization = keycloak
      .init({ onLoad: 'check-sso', checkLoginIframe: false })
      .then((authenticated) => {
        if (!authResponse && !appSessionActive) {
          sessionStorage.setItem(APP_LOGIN_SESSION_KEY, 'pending');
          void keycloak.login({ prompt: 'login' });
          return false;
        }
        if (!authenticated) {
          return false;
        }

        sessionStorage.setItem(APP_LOGIN_SESSION_KEY, 'active');
        persistKeycloakSession();
        keycloak.onTokenExpired = () => {
          void refreshKeycloakToken(0).catch((error) => {
            console.error('Keycloak access token refresh failed in Campaign Portal:', error);
            restartKeycloakLogin();
          });
        };
        keycloak.onAuthRefreshError = () => {
          console.error('Keycloak refresh token is no longer valid in Campaign Portal.');
          restartKeycloakLogin();
        };
        if (!tokenRefreshInterval) {
          tokenRefreshInterval = setInterval(async () => {
            try {
              await refreshKeycloakToken(120);
            } catch (error) {
              console.error('Failed to refresh Keycloak token in Campaign Portal:', error);
            }
          }, 60000);
        }

        return true;
      });
  }

  return keycloakInitialization;
}

async function initializeKeycloakWithTimeout() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      initializeKeycloak(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Keycloak did not respond within 12 seconds.'));
        }, KEYCLOAK_INIT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

// Lazy loading CRM Pages
const Dashboard = lazy(() => import('./pages').then((m) => ({ default: m.Dashboard })));
const Campaigns = lazy(() => import('./pages').then((m) => ({ default: m.Campaigns })));
const Automation = lazy(() => import('./pages').then((m) => ({ default: m.Automation })));
const MarketingLists = lazy(() => import('./pages').then((m) => ({ default: m.MarketingLists })));

const ToastContainerWrapper: React.FC = () => {
  const { toasts, removeToast } = useToast();
  return <ToastContainerComponent toasts={toasts} onClose={removeToast} />;
};

export const App: React.FC = () => {
  const [checking, setChecking] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    initializeKeycloakWithTimeout()
      .then(() => {
        setChecking(false);
      })
      .catch((err) => {
        console.error('Failed to initialize Keycloak:', err);
        restartKeycloakLogin();
        setInitializationError('Không thể kết nối Keycloak tại localhost:8080.');
        setChecking(false);
      });

    const handleUnauthorized = () => {
      restartKeycloakLogin();
    };

    const handleKeycloakRefresh = (event: Event) => {
      const { resolve, reject } = (event as CustomEvent<{
        resolve: (token: string) => void;
        reject: (error: Error) => void;
      }>).detail || {};

      if (!resolve || !reject) return;

      void refreshKeycloakToken(30)
        .then(() => {
          if (!keycloak.token) throw new Error('Keycloak did not return an access token.');
          resolve(keycloak.token);
        })
        .catch(reject);
    };

    window.addEventListener('crm:unauthorized', handleUnauthorized);
    window.addEventListener('crm:keycloak-refresh', handleKeycloakRefresh);
    return () => {
      window.removeEventListener('crm:unauthorized', handleUnauthorized);
      window.removeEventListener('crm:keycloak-refresh', handleKeycloakRefresh);
    };
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('crm_access_token');
    localStorage.removeItem('crm_refresh_token');
    localStorage.removeItem('crm_profile');
    localStorage.removeItem('crm_auth_provider');
    sessionStorage.removeItem(APP_LOGIN_SESSION_KEY);
    // Keep the shared Keycloak SSO session alive so CMS stays signed in.
    keycloak.clearToken();
    window.location.assign(await keycloak.createLoginUrl({ prompt: 'login' }));
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs font-semibold">Đang khởi động Campaign Portal...</p>
      </div>
    );
  }

  if (initializationError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm font-semibold text-slate-100">{initializationError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-10 px-4 bg-teal-500 text-xs font-bold text-slate-950 hover:bg-teal-400"
        >
          Thử lại
        </button>
      </div>
    );
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
              <Route path="/marketing-lists" element={<MarketingLists />} />
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
