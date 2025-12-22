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

  private async getAuthToken(): Promise<string | null> {
    try {
      // Get Firebase ID token
      const token = await getIdToken();
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
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
      const token = await this.getAuthToken();
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

    console.log(`🌐 [API Client] ${fetchOptions.method || 'GET'} ${url}`);
    console.log(`🌐 [API Client] Headers:`, {
      ...headers,
      Authorization: headers.Authorization ? 'Bearer ***' : undefined,
    });
    if (isFormData) {
      console.log(`🌐 [API Client] Body: FormData`);
    } else if (fetchOptions.body) {
      try {
        const bodyPreview = typeof fetchOptions.body === 'string' 
          ? fetchOptions.body.substring(0, 200) 
          : JSON.stringify(fetchOptions.body).substring(0, 200);
        console.log(`🌐 [API Client] Body preview:`, bodyPreview);
      } catch (e) {
        console.log(`🌐 [API Client] Body: [could not stringify]`);
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...headers,
          ...fetchOptions.headers,
        },
      });

      console.log(`🌐 [API Client] Response: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        const errorText = await response.clone().text().catch(() => '');
        console.error(`🌐 [API Client] Error response body:`, errorText.substring(0, 500));
      }

      return response;
    } catch (error: any) {
      console.error(`🌐 [API Client] Request failed: ${endpoint}`, {
        error,
        message: error?.message,
        stack: error?.stack,
        url,
      });
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

