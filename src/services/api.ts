// API Client with automatic bearer token attachment and refresh retry

let currentAccessToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setOnUnauthorized(callback: () => void) {
  onUnauthorizedCallback = callback;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (!options.skipAuth && currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Include HttpOnly refresh cookie
  };

  let response = await fetch(url, fetchOptions);

  // If 401 Unauthorized and not already refreshing, attempt silent refresh
  if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
    try {
      const refreshRes = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData.accessToken || refreshData.data?.accessToken;
        setAccessToken(newAccessToken);

        // Retry original request with fresh token
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(url, { ...fetchOptions, headers });
      } else {
        setAccessToken(null);
        if (onUnauthorizedCallback) onUnauthorizedCallback();
      }
    } catch (refreshErr) {
      setAccessToken(null);
      if (onUnauthorizedCallback) onUnauthorizedCallback();
    }
  }

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = responseData?.error?.message || responseData?.message || `HTTP Error ${response.status}`;
    const err = new Error(errorMsg) as any;
    err.status = response.status;
    err.code = responseData?.error?.code;
    err.fields = responseData?.error?.fields;
    throw err;
  }

  return responseData as T;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
