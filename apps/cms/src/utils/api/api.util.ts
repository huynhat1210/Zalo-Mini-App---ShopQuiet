export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://zalo-mini-app-shopquiet.onrender.com/api/v1';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('cms_access_token') || '',
  setAccessToken: (token: string) => localStorage.setItem('cms_access_token', token),
  clearToken: () => localStorage.removeItem('cms_access_token'),
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
    if (response.status === 401 && !path.includes('/auth/login')) {
      tokenStorage.clearToken();
      localStorage.removeItem('zalo_profile_custom');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      errMsg = errJson.message || errMsg;
    } catch { }
    throw new Error(errMsg);
  }

  // Handle No Content / Empty Responses
  if (response.status === 204) {
    return {} as T;
  }

  const json: IApiResponseEnvelope<T> = await response.json();
  
  // Extract and return data directly, similar to apiRequest in zalo-mini-app
  return json.data;
}
