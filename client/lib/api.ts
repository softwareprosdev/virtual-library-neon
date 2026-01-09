import { getToken, clearAuth } from './auth';

const isProduction = process.env.NODE_ENV === 'production';
let API_URL = process.env.NEXT_PUBLIC_API_URL || (isProduction ? '' : 'http://localhost:4000/api');

// Auto-fix missing /api suffix if user forgot it
if (isProduction && API_URL && !API_URL.endsWith('/api')) {
  API_URL = `${API_URL}/api`;
}

export const api = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  // Prevent double slash if endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  // Handle unauthorized - clear auth and redirect to login
  // Skip redirect for auth endpoints to avoid redirect loops
  if (response.status === 401 || response.status === 403) {
    const isAuthEndpoint = cleanEndpoint.startsWith('/auth/');
    if (!isAuthEndpoint && typeof window !== 'undefined') {
      clearAuth();
      window.location.href = '/';
    }
  }
  return response;
};
