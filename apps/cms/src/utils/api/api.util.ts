export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://zalo-mini-app-shopquiet.onrender.com/api/v1';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('cms_access_token') || '',
  getRefreshToken: () => localStorage.getItem('cms_refresh_token') || '',
  setAccessToken: (token: string) => localStorage.setItem('cms_access_token', token),
  setTokens: (tokens: { access_token: string; refresh_token: string }) => {
    localStorage.setItem('cms_access_token', tokens.access_token);
    localStorage.setItem('cms_refresh_token', tokens.refresh_token);
  },
  clearToken: () => {
    localStorage.removeItem('cms_access_token');
    localStorage.removeItem('cms_refresh_token');
  },
};

export type TApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface IApiResponseEnvelope<T = any> {
  message?: string;
  data: T;
  meta?: {
    request_id?: string;
    trace_id?: string;
  };
  pagination?: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    tokenStorage.clearToken();
    throw new Error('Failed to refresh token');
  }

  const envelope = await response.json();
  const data = envelope.data;
  const tokens = data || envelope;
  
  if (tokens && tokens.access_token) {
    tokenStorage.setTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
    });
    return tokens.access_token;
  }
  throw new Error('Invalid token response');
}

export async function apiRequest<T = any>(
  path: string,
  method: TApiHttpMethod = 'GET',
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = tokenStorage.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newAccessToken = await refreshAccessToken();
          isRefreshing = false;
          onRefreshed(newAccessToken);
        } catch (err) {
          isRefreshing = false;
          tokenStorage.clearToken();
          localStorage.removeItem('zalo_profile_custom');
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
          throw err;
        }
      }

      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (token: string) => {
          try {
            const retryHeaders = {
              ...headers,
              'Authorization': `Bearer ${token}`,
            };
            const retryOptions = { ...options, headers: retryHeaders };
            const retryResponse = await fetch(url, retryOptions);
            if (!retryResponse.ok) {
              throw new Error(`Retried request failed: ${retryResponse.status}`);
            }
            const json: IApiResponseEnvelope<T> = await retryResponse.json();
            resolve(json.data);
          } catch (e) {
            reject(e);
          }
        });
      });
    }

    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      errMsg = errJson.message || errMsg;
    } catch { }
    throw new Error(errMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const json: IApiResponseEnvelope<T> = await response.json();
  return json.data;
}

export async function apiUploadRequest(file: File): Promise<string> {
  const url = `${API_BASE_URL}/cms/upload`;
  const headers: Record<string, string> = {};

  const token = tokenStorage.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errMsg = `Upload failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      errMsg = errJson.message || errMsg;
    } catch { }
    throw new Error(errMsg);
  }

  const json = await response.json();
  return json.data.url;
}
