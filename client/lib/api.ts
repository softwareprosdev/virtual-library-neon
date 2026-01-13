import { getToken, clearAuth } from './auth';

const isProduction = process.env.NODE_ENV === 'production';
let API_URL = process.env.NEXT_PUBLIC_API_URL || (isProduction ? 'https://api.indexbin.com/api' : 'http://localhost:4000/api');

// Auto-fix missing /api suffix if user forgot it
if (isProduction && API_URL && !API_URL.endsWith('/api')) {
  API_URL = `${API_URL}/api`;
}

// Initialize CSRF tokens if they don't exist
const initializeCSRFTokens = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  const existingCsrfToken = localStorage.getItem('x-csrf-token');
  const existingSessionToken = localStorage.getItem('x-session-token');

  if (!existingCsrfToken || !existingSessionToken) {
    try {
      console.log('Initializing CSRF tokens...');
      // Make a simple request to get CSRF tokens
      const response = await fetch(`${API_URL}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // The provideCSRFToken middleware should set tokens in response headers
      const newCsrfToken = response.headers.get('x-csrf-token');
      const newSessionToken = response.headers.get('x-session-token');

      if (newCsrfToken && newSessionToken) {
        localStorage.setItem('x-csrf-token', newCsrfToken);
        localStorage.setItem('x-session-token', newSessionToken);
        console.log('CSRF tokens initialized successfully');
      }
    } catch (error) {
      console.warn('Failed to initialize CSRF tokens:', error);
    }
  }
};

export const api = async (endpoint: string, options: RequestInit = {}, isRetry = false): Promise<Response> => {
  const token = getToken();

  // Ensure CSRF tokens are initialized
  await initializeCSRFTokens();

  // Get CSRF tokens from storage - send them with ALL requests to ensure they get updated
  let csrfToken = '';
  let sessionToken = '';

  if (typeof window !== 'undefined') {
    csrfToken = localStorage.getItem('x-csrf-token') || '';
    sessionToken = localStorage.getItem('x-session-token') || '';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    // Send CSRF tokens with ALL requests to ensure proper token management
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
      console.log('403 error body:', body);

      // If CSRF error and we got new tokens, retry the request once
      if ((body.message === 'CSRF token required' || body.message === 'Invalid CSRF token') && newCsrfToken && newSessionToken) {
        console.log('Retrying with new CSRF tokens');
        return api(endpoint, options, true);
      }

      // For GET requests, try without CSRF tokens as a fallback
      if (options.method === 'GET' || (!options.method || options.method === 'GET')) {
        console.log('Retrying GET request without CSRF tokens');
        const headersWithoutCSRF = { ...headers };
        delete headersWithoutCSRF['x-csrf-token'];
        delete headersWithoutCSRF['x-session-token'];

        const retryResponse = await fetch(`${API_URL}${cleanEndpoint}`, {
          ...options,
          headers: headersWithoutCSRF,
        });

        if (retryResponse.ok) {
          console.log('GET request succeeded without CSRF tokens');
          return retryResponse;
        }
      }

      // If we're in development and it's a CSRF error, try without CSRF tokens
      if (process.env.NODE_ENV === 'development' && (body.message === 'CSRF token required' || body.message === 'Invalid CSRF token')) {
        console.warn('Retrying request without CSRF tokens in development mode');
        const headersWithoutCSRF = { ...headers };
        delete headersWithoutCSRF['x-csrf-token'];
        delete headersWithoutCSRF['x-session-token'];

        const retryResponse = await fetch(`${API_URL}${cleanEndpoint}`, {
          ...options,
          headers: headersWithoutCSRF,
        });

        if (retryResponse.ok) {
          return retryResponse;
        }
      }
    } catch (error) {
      console.log('Failed to parse 403 error response:', error);
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
