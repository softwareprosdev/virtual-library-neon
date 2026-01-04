import { getToken } from './auth';

const isProduction = process.env.NODE_ENV === 'production';
let API_URL = process.env.NEXT_PUBLIC_API_URL || (isProduction ? '' : 'http://localhost:4000/api');

// Auto-fix missing /api suffix if user forgot it
if (isProduction && API_URL && !API_URL.endsWith('/api')) {
  console.warn('⚠️ Correcting API_URL: Appending missing "/api" suffix');
  API_URL = `${API_URL}/api`;
}

if (isProduction && !API_URL) {
  console.error('CRITICAL: NEXT_PUBLIC_API_URL is missing in production environment. API calls will fail.');
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

  if (response.status === 401 || response.status === 403) {
    // Handle unauthorized (optional: redirect to login)
    // window.location.href = '/login'; 
  }
  return response;
};
