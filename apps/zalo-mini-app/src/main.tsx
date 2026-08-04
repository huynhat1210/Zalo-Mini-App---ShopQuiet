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

const container = document.getElementById("app");
void initializeMiniAppKeycloak().then(() => {
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
}).catch((error) => console.error('[ShopQuiet] Keycloak initialization failed:', error));
