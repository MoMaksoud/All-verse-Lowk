/**
 * API Client utility for making authenticated requests
 * Automatically includes Firebase Auth token in Authorization header
 */

import { auth } from '@/lib/firebase';

export interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean; // Default: true
}

/**
 * Get current user's Firebase Auth token
 * Waits for auth to be ready before checking for user
 */
async function getAuthToken(): Promise<string | null> {
  try {
    console.log('🔍 getAuthToken: Starting...');
    if (!auth) {
      console.error('❌ getAuthToken: auth is null');
      return null;
    }

    console.log('🔍 getAuthToken: Waiting for authStateReady...');
    await auth.authStateReady();
    console.log('✅ getAuthToken: authStateReady completed');
    
    const currentUser = auth.currentUser;
    console.log('🔍 getAuthToken: currentUser:', currentUser ? { uid: currentUser.uid, email: currentUser.email } : null);
    
    if (!currentUser) {
      console.error('❌ getAuthToken: No current user');
      return null;
    }
    
    console.log('🔍 getAuthToken: Getting ID token...');
    const token = await currentUser.getIdToken();
    console.log('✅ getAuthToken: Token received, length:', token?.length);
    return token;
  } catch (error) {
    console.error('❌ getAuthToken: Error getting auth token:', error);
    return null;
  }
}

/**
 * Make an authenticated API request
 * Automatically includes Authorization header with Firebase token
 */
export async function apiRequest(
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const { requireAuth = true, headers = {}, ...fetchOptions } = options;

  console.log('🔍 apiRequest: Starting request to', url, { requireAuth });

  if (requireAuth) {
    const token = await getAuthToken();
    console.log('🔍 apiRequest: Token result:', token ? `Token exists (length: ${token.length})` : 'Token is null');
    
    if (!token) {
      console.error('❌ apiRequest: No token, returning 401');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'User not authenticated' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    headers['Authorization'] = `Bearer ${token}`;
    console.log('✅ apiRequest: Authorization header set');
  }

  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  console.log('🔍 apiRequest: Final headers:', Object.keys(headers));
  console.log('🔍 apiRequest: Making fetch request...');

  return fetch(url, {
    ...fetchOptions,
    headers: {
      ...headers,
    },
  });
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(url: string, options?: ApiRequestOptions): Promise<Response> {
  return apiRequest(url, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(
  url: string,
  body?: any,
  options?: ApiRequestOptions
): Promise<Response> {
  // Don't stringify FormData - let the browser set Content-Type with boundary
  const bodyData = body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined);
  
  return apiRequest(url, {
    ...options,
    method: 'POST',
    body: bodyData,
  });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut(
  url: string,
  body?: any,
  options?: ApiRequestOptions
): Promise<Response> {
  return apiRequest(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(url: string, options?: ApiRequestOptions): Promise<Response> {
  return apiRequest(url, { ...options, method: 'DELETE' });
}

