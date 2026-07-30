import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "zmp-ui/zaui.css";
import "./index.css";

// ─────────────────────────────────────────────────────────────────────
// 1. Override window.onerror BEFORE Zalo SDK loads
//    Zalo SDK's WebView raises "Script error. null" for every unhandled
//    JS exception that crosses the native bridge. By setting our own
//    window.onerror we suppress the popup while still logging the error.
// ─────────────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  // Log errors for debugging but do NOT return true here —
  // returning true would prevent React's ErrorBoundary from catching them.
  window.addEventListener("error", (e) => {
    // Suppress Zalo SDK cross-origin "Script error" messages completely
    if (e.message === "Script error" || e.message === "Script error. null" || e.message === null) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    // Only log real errors, not Zalo SDK noise
    console.warn("[ShopQuiet] addEventListener error:", e.message, e.error);
    // Do NOT call e.preventDefault() or e.stopImmediatePropagation() here
    // so that React ErrorBoundary can still catch component-level errors.
  }, false);
  window.addEventListener("unhandledrejection", (e) => {
    // Suppress Zalo SDK cross-origin "Script error" messages in promise rejections
    if (e.reason && (e.reason.message === "Script error" || e.reason.message === "Script error. null" || e.reason.message === null)) {
      e.preventDefault();
      return;
    }
    console.warn("[ShopQuiet] Unhandled promise rejection:", e.reason);
    // Only prevent the Zalo SDK from showing the ugly red popup for promise rejections
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
