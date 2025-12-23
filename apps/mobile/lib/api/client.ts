import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIdToken } from '../firebase/auth';

// Normalize base URL - remove trailing /api if present, we'll add it in endpoints
const getBaseURL = () => {
  const url = process.env.EXPO_PUBLIC_API_URL || 'https://www.allversegpt.com';
  // Remove trailing /api if it exists
  return url.replace(/\/api\/?$/, '');
};

const API_BASE_URL = getBaseURL();

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Normalize endpoint to ensure it starts with /api/
  private normalizeEndpoint(endpoint: string): string {
    // If endpoint already starts with /api/, use it as is
    if (endpoint.startsWith('/api/')) {
      return endpoint;
    }
    // If endpoint starts with / but not /api/, add /api
    if (endpoint.startsWith('/')) {
      return `/api${endpoint}`;
    }
    // If endpoint doesn't start with /, add /api/
    return `/api/${endpoint}`;
  }

  private async getAuthToken(forceRefresh: boolean = false): Promise<string | null> {
    try {
      // Get Firebase ID token (force refresh to ensure it's valid)
      const token = await getIdToken(forceRefresh);
      return token;
    } catch (error) {
      return null;
    }
  }

  private async getHeaders(requiresAuth: boolean = false, isFormData: boolean = false): Promise<HeadersInit> {
    const headers: HeadersInit = {};

    // Don't set Content-Type for FormData - browser/native will set it with boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (requiresAuth) {
      // Try to get token, force refresh if first attempt fails
      let token = await this.getAuthToken(false);
      if (!token) {
        token = await this.getAuthToken(true);
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const { requiresAuth = false, ...fetchOptions } = options;

    // Normalize endpoint to ensure it has /api/ prefix
    const normalizedEndpoint = this.normalizeEndpoint(endpoint);
    const url = `${this.baseURL}${normalizedEndpoint}`;
    
    // Check if body is FormData
    const isFormData = fetchOptions.body instanceof FormData;
    const headers = await this.getHeaders(requiresAuth, isFormData);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...headers,
          ...fetchOptions.headers,
        },
      });

      return response;
    } catch (error: any) {
      throw error;
    }
  }

  // Convenience methods
  async get(endpoint: string, requiresAuth = false): Promise<Response> {
    return this.request(endpoint, { method: 'GET', requiresAuth });
  }

  async post(
    endpoint: string,
    data: any,
    requiresAuth = false
  ): Promise<Response> {
    // Don't stringify FormData - let the browser/native handle it
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, {
      method: 'POST',
      body,
      requiresAuth,
    });
  }

  async put(
    endpoint: string,
    data: any,
    requiresAuth = false
  ): Promise<Response> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth,
    });
  }

  async delete(endpoint: string, requiresAuth = false): Promise<Response> {
    return this.request(endpoint, { method: 'DELETE', requiresAuth });
  }
}

export const apiClient = new APIClient(API_BASE_URL);
export default apiClient;

