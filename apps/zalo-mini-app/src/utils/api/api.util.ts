import { TApiHttpMethod } from "./api.type";
import { tokenStorage } from "../auth";

// @ts-ignore
const _envBase = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL =
  _envBase ||
  (typeof window !== "undefined"
    ? `${window.location.origin}/api/v1`
    : "http://localhost:3000/api/v1");

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Subscribe to token refresh
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// Notify all subscribers
function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Refresh access token
async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    tokenStorage.clearTokens();
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  tokenStorage.setTokens(data);
  return data.access_token;
}

export async function apiRequest<T = unknown>(
  path: string,
  method: TApiHttpMethod = "GET",
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let zaloUserId = "";
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("zalo_profile_custom");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) zaloUserId = parsed.id;
        else if (parsed?.zaloId) zaloUserId = parsed.zaloId;
      }
    } catch (e) {}
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  // Add access token if available
  const accessToken = tokenStorage.getAccessToken();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (zaloUserId) {
    headers["x-zalo-user-id"] = zaloUserId;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  let response = await fetch(url, options);

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && accessToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        onRefreshed(newToken);
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, options);
      } catch (error) {
        // Refresh failed, clear tokens and redirect to login
        tokenStorage.clearTokens();
        // In a real app, you might redirect to login here
        throw new Error("Session expired. Please login again.");
      } finally {
        isRefreshing = false;
      }
    } else {
      // Wait for the refresh to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token: string) => {
          headers["Authorization"] = `Bearer ${token}`;
          fetch(url, options)
            .then((res) => {
              if (!res.ok)
                throw new Error("Request failed after token refresh");
              return res.json();
            })
            .then(resolve)
            .catch(reject);
        });
      });
    }
  }

  if (!response.ok) {
    let errMsg = `API error: ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson) {
        if (Array.isArray(errJson.errors) && errJson.errors.length > 0) {
          errMsg = errJson.errors[0].message;
        } else if (errJson.message) {
          errMsg = Array.isArray(errJson.message)
            ? errJson.message[0]
            : errJson.message;
        }
      }
    } catch (e) {}
    throw new Error(errMsg);
  }

  const json = await response.json();

  // Handle standard success format wrapping
  if (
    json &&
    typeof json === "object" &&
    "data" in json &&
    "message" in json &&
    "meta" in json
  ) {
    if (json.pagination) {
      return {
        ...json,
        meta: {
          ...json.meta,
          ...json.pagination,
          totalPages: json.pagination.total_pages, // map snake_case to camelCase
        },
      } as any;
    }
    return json.data;
  }

  return json;
}
