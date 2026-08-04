import { TApiHttpMethod } from "./api.type";
import { tokenStorage } from "../auth";

// @ts-ignore
const _envBase = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL =
  _envBase ||
  (typeof window !== "undefined"
    ? `${window.location.origin}/api/v1`
    : "http://localhost:3000/api/v1");

let refreshPromise: Promise<string> | null = null;

function usesKeycloakSession(accessToken: string) {
  if (localStorage.getItem("keycloak_managed_session") === "true") {
    return true;
  }

  const payloadSegment = accessToken.split(".")[1];
  if (!payloadSegment) return false;

  try {
    const payload = JSON.parse(atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.iss === "string" && payload.iss.includes("/realms/");
  } catch {
    return false;
  }
}

function extractTokenPair(payload: any) {
  const tokens = payload?.data || payload;
  if (!tokens?.access_token || !tokens?.refresh_token) {
    throw new Error("Invalid token refresh response");
  }
  return tokens;
}

// Refresh access token
async function refreshAccessToken(accessToken: string): Promise<string> {
  if (usesKeycloakSession(accessToken)) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error("No Keycloak refresh token available");
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) throw new Error("Failed to refresh Keycloak token");
    const tokens = extractTokenPair(await response.json());
    tokenStorage.setTokens(tokens);
    return tokens.access_token;
  }

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

  const tokens = extractTokenPair(await response.json());
  tokenStorage.setTokens(tokens);
  return tokens.access_token;
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
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken(accessToken).finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, options);
    } catch (error) {
      tokenStorage.clearTokens();
      throw new Error("Session expired. Please login again.");
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

export async function apiUploadRequest(
  file: File,
  endpoint = "/products/0/comments/upload-image"
): Promise<string> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  };

  const accessToken = tokenStorage.getAccessToken();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let zaloUserId = typeof (tokenStorage as any).getZaloUserId === "function" ? (tokenStorage as any).getZaloUserId() : localStorage.getItem("zalo_user_id");
  if (!zaloUserId) {
    try {
      const cached = localStorage.getItem("zalo_profile_custom");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) zaloUserId = parsed.id;
        else if (parsed?.zaloId) zaloUserId = parsed.zaloId;
      }
    } catch (e) {}
  }
  if (zaloUserId) {
    headers["x-zalo-user-id"] = zaloUserId;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errMsg = `Lỗi tải ảnh: ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) {
        errMsg = Array.isArray(errJson.message)
          ? errJson.message[0]
          : errJson.message;
      }
    } catch (e) {}
    throw new Error(errMsg);
  }

  const json = await response.json();
  if (json && json.url) {
    return json.url;
  }
  throw new Error("Không nhận được đường dẫn ảnh sau khi tải lên");
}

export function safeParseImages(imagesInput: any, fallback?: string): string[] {
  const defaultImg =
    fallback ||
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80";
  if (!imagesInput) return [defaultImg];
  if (Array.isArray(imagesInput)) {
    return imagesInput.length > 0 ? imagesInput.map(String) : [defaultImg];
  }
  if (typeof imagesInput === "string" && imagesInput.trim()) {
    try {
      const parsed = JSON.parse(imagesInput);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);
      if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
    } catch (e) {
      return [imagesInput.trim()];
    }
  }
  return [defaultImg];
}
