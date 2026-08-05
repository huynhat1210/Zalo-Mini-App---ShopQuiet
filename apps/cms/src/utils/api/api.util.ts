export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
export const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_BASE_URL || 'http://localhost:3002/api/v1';

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

function usesKeycloakSession() {
  if (localStorage.getItem('cms_auth_provider') === 'keycloak') {
    return true;
  }

  const token = tokenStorage.getAccessToken();
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) {
    return false;
  }

  try {
    const payload = JSON.parse(atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.iss === 'string' && payload.iss.includes('/realms/');
  } catch {
    return false;
  }
}

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

function refreshKeycloakAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Timed out while refreshing the Keycloak session.'));
    }, 10000);

    window.dispatchEvent(new CustomEvent('cms:keycloak-refresh', {
      detail: {
        resolve: (token: string) => {
          window.clearTimeout(timeoutId);
          resolve(token);
        },
        reject: (error: Error) => {
          window.clearTimeout(timeoutId);
          reject(error);
        },
      },
    }));
  });
}

async function refreshAccessToken(): Promise<string> {
  if (usesKeycloakSession()) {
    return refreshKeycloakAccessToken();
  }

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
      try {
        const newAccessToken = await refreshAccessToken();
        const retryResponse = await fetch(url, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${newAccessToken}` },
        });

        if (!retryResponse.ok) {
          throw new Error(`Retried request failed: ${retryResponse.status}`);
        }

        if (retryResponse.status === 204) {
          return {} as T;
        }

        const retryJson: IApiResponseEnvelope<T> = await retryResponse.json();
        return retryJson.data;
      } catch (err) {
        tokenStorage.clearToken();
        localStorage.removeItem('cms_auth_provider');
        localStorage.removeItem('zalo_profile_custom');
        window.dispatchEvent(new CustomEvent('cms:unauthorized'));
        throw err;
      }
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

export async function crmApiRequest<T = any>(
  path: string,
  method: TApiHttpMethod = 'GET',
  body?: unknown,
): Promise<T> {
  const url = `${CRM_API_BASE_URL}${path}`;
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
