import { getToken, clearAuth } from './auth';

const isProduction = process.env.NODE_ENV === 'production';
let API_URL = process.env.NEXT_PUBLIC_API_URL || (isProduction ? 'https://api.indexbin.com/api' : 'http://localhost:4000/api');

// Auto-fix missing /api suffix if user forgot it
if (isProduction && API_URL && !API_URL.endsWith('/api')) {
  API_URL = `${API_URL}/api`;
}

export const api = async (endpoint: string, options: RequestInit = {}, isRetry = false): Promise<Response> => {
  const token = getToken();

  // Get CSRF tokens from storage
  let csrfToken = '';
  let sessionToken = '';

  if (typeof window !== 'undefined') {
    csrfToken = localStorage.getItem('x-csrf-token') || '';
    sessionToken = localStorage.getItem('x-session-token') || '';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(csrfToken && { 'x-csrf-token': csrfToken }),
    ...(sessionToken && { 'x-session-token': sessionToken }),
    ...options.headers as Record<string, string>,
  };

  // Prevent double slash if endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  // Capture new CSRF tokens from response
  const newCsrfToken = response.headers.get('x-csrf-token');
  const newSessionToken = response.headers.get('x-session-token');

  if (typeof window !== 'undefined') {
    if (newCsrfToken) localStorage.setItem('x-csrf-token', newCsrfToken);
    if (newSessionToken) localStorage.setItem('x-session-token', newSessionToken);
  }

  // Handle 403 - could be CSRF or authorization error
  if (response.status === 403 && !isRetry) {
    // Clone response to read body without consuming it
    const clonedResponse = response.clone();
    try {
      const body = await clonedResponse.json();
      // If CSRF error and we got new tokens, retry the request once
      if ((body.message === 'CSRF token required' || body.message === 'Invalid CSRF token') && newCsrfToken && newSessionToken) {
        return api(endpoint, options, true);
      }
    } catch {
      // If we can't parse body, fall through to normal handling
    }
  }

  // Handle unauthorized - clear auth and redirect to login
  // Skip redirect for auth endpoints to avoid redirect loops
  if (response.status === 401) {
    const isAuthEndpoint = cleanEndpoint.startsWith('/auth/');
    if (!isAuthEndpoint && typeof window !== 'undefined') {
      clearAuth();
      window.location.href = '/';
    }
  }
  return response;
};
