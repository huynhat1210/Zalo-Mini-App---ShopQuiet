import { TApiHttpMethod } from './api.type';

// @ts-ignore
const _envBase = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL =
  _envBase || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3000/api');

export async function apiRequest<T = unknown>(
  path: string,
  method: TApiHttpMethod = 'GET',
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let zaloUserId = '';
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('zalo_profile_custom');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) zaloUserId = parsed.id;
      }
    } catch (e) { }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };

  if (zaloUserId) {
    headers['x-zalo-user-id'] = zaloUserId;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    let errMsg = `API error: ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.message) {
        errMsg = Array.isArray(errJson.message) ? errJson.message[0] : errJson.message;
      }
    } catch (e) { }
    throw new Error(errMsg);
  }

  return response.json();
}
