import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "zmp-ui/zaui.css";
import "./index.css";
import { initializeMiniAppKeycloak } from './utils/auth/keycloak-session';

// ─────────────────────────────────────────────────────────────────────
// 1. Override window.onerror BEFORE Zalo SDK loads
//    Zalo SDK's WebView raises "Script error. null" for every unhandled
//    JS exception that crosses the native bridge. By setting our own
//    window.onerror we suppress the popup while still logging the error.
// ─────────────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  window.addEventListener(
    "error",
    (e) => {
      const msg = e.message ? String(e.message).toLowerCase() : "";
      // Suppress all cross-origin Zalo SDK "Script error" variations
      if (!msg || msg.includes("script error")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      console.warn("[ShopQuiet] Window error:", e.message, e.error);
    },
    false,
  );

  window.addEventListener("unhandledrejection", (e) => {
    const reasonObj = e.reason;
    const reasonStr = JSON.stringify(reasonObj || "").toLowerCase();

    // Suppress Zalo SDK expected -102 / action.jump.login / script error rejections
    const isZaloNoise =
      !reasonObj ||
      reasonObj?.error_code === -102 ||
      reasonObj?.action === "action.jump.login" ||
      reasonStr.includes("script error") ||
      reasonStr.includes("-102");

    if (isZaloNoise) {
      e.preventDefault();
      return;
    }
    console.warn("[ShopQuiet] Unhandled promise rejection:", e.reason);
    e.preventDefault();
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. Sanitize localStorage on startup
  //    If Zustand persisted store or user profile cache is corrupted,
  //    clear it before React renders to prevent SyntaxError at mount.
  // ─────────────────────────────────────────────────────────────────
  const SAFE_KEYS = ["shopquiet_app_store", "zalo_profile_custom", "viewed_products"];
  SAFE_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      JSON.parse(raw);
    } catch (_) {
      console.warn(`[ShopQuiet] Removing corrupted localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes cache default
    },
  },
});

function KeycloakBootstrap() {
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');

  React.useEffect(() => {
    void initializeMiniAppKeycloak(true)
      .then((authenticated) => setStatus(authenticated ? 'ready' : 'error'))
      .catch((error) => {
        console.warn('[ShopQuiet] Keycloak sign-in failed:', error);
        setStatus('error');
      });
  }, []);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">Dang dang nhap...</div>;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-700">
        <p>Khong the khoi tao phien dang nhap.</p>
        <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white">
          Thu lai
        </button>
      </div>
    );
  }

  return <App />;
}

const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <KeycloakBootstrap />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
