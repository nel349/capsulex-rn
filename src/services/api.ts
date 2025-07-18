// API Configuration and Base Service
import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
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

// API Service using Axios
class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    console.log(
      '🔗 API Service initializing with base URL:',
      API_CONFIG.BASE_URL
    );

    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          // Server responded with error status
          const errorMessage =
            error.response.data?.error || `HTTP ${error.response.status}`;
          throw new ApiError(
            errorMessage,
            error.response.status,
            error.response.data
          );
        } else if (error.request) {
          // Request was made but no response
          throw new ApiError('Network error - no response from server');
        } else {
          // Something else happened
          throw new ApiError(error.message || 'Unknown error');
        }
      }
    );
  }

  // GET request
  async get<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> =
        await this.axiosInstance.get(endpoint, { headers });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // POST request
  async post<T>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> =
        await this.axiosInstance.post(endpoint, body, { headers });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // PUT request
  async put<T>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> =
        await this.axiosInstance.put(endpoint, body, { headers });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // DELETE request
  async delete<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> =
        await this.axiosInstance.delete(endpoint, { headers });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types for convenience
export type { AxiosResponse };
