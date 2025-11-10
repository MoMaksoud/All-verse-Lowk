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
    if (!auth) {
      console.warn('⚠️ Firebase auth not initialized');
      return null;
    }

    console.log('🔍 Waiting for auth state to be ready...');
    // Wait for auth to be ready (handles async initialization)
    await auth.authStateReady();
    console.log('✅ Auth state ready');
    
    const currentUser = auth.currentUser;
    console.log('🔍 Current user from auth:', currentUser ? { 
      uid: currentUser.uid, 
      email: currentUser.email,
      emailVerified: currentUser.emailVerified 
    } : null);
    
    if (!currentUser) {
      console.warn('⚠️ No current user found after authStateReady');
      return null;
    }
    
    console.log('🔍 Getting ID token...');
    const token = await currentUser.getIdToken();
    console.log('✅ Auth token retrieved successfully (length:', token.length, ')');
    return token;
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
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

  // Get auth token if authentication is required
  if (requireAuth) {
    const token = await getAuthToken();
    if (!token) {
      console.error('❌ No auth token available for request to:', url);
      // Return 401 response instead of throwing to allow graceful handling
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'User not authenticated' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Add Authorization header
    headers['Authorization'] = `Bearer ${token}`;
    console.log('✅ Authorization header added to request:', url.substring(0, 50));
  }

  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

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
  return apiRequest(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
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

