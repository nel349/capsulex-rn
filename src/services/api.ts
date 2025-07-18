// API Configuration and Base Service
import { Platform } from 'react-native';

// API Configuration
const API_CONFIG = {
  BASE_URL: __DEV__
    ? Platform.select({
        ios: 'http://localhost:3001/api',
        android: 'http://10.0.2.2:3001/api', // Android emulator localhost
        default: 'http://localhost:3001/api',
      })
    : 'https://api.capsulex.com/api', // Production URL
  TIMEOUT: 10000, // 10 seconds
};

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  user_id: string;
  wallet_address: string;
  auth_type: 'wallet' | 'privy';
  email?: string;
  name?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Request Types
export interface CreateUserRequest {
  wallet_address: string;
  auth_type: 'wallet' | 'privy';
  privy_user_id?: string;
  email?: string;
  name?: string;
}

// API Error Class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base API Service
class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), this.timeout);
      });

      const response = await Promise.race([fetch(url, config), timeoutPromise]);
      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.error || `HTTP ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        undefined,
        error
      );
    }
  }

  // GET request
  async get<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers,
    });
  }

  // POST request
  async post<T>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  // PUT request
  async put<T>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  // DELETE request
  async delete<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers,
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
