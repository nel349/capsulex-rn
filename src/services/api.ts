// API Configuration and Base Service
import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
import { Platform } from 'react-native';

// API Configuration
const API_CONFIG = {
  BASE_URL: __DEV__
    ? Platform.select({
        ios: 'http://192.168.1.157:3001/api', // Use Mac's IP for iOS device/simulator
        android: 'http://192.168.1.157:3001/api', // Use Mac's IP for Android device/emulator
        default: 'http://192.168.1.157:3001/api',
      })
    : 'https://api.capsulex.com/api', // Production URL
  TIMEOUT: 10000, // 10 seconds
};

// Import types from dedicated types file
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ApiResponse } from '../types/api';
import { ApiError } from '../types/api';

const TOKEN_STORAGE_KEY = 'auth-token';

// API Service using Axios
class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    console.log(
      '🔗 API Service initializing with base URL:',
      API_CONFIG.BASE_URL
    );
    console.log('📱 Platform detected:', Platform.OS);
    console.log('🛠️ Development mode:', __DEV__);

    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      async config => {
        // Add auth token if available
        const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        console.log('🔑 API Request - Token check:', {
          hasToken: !!token,
          tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
          url: config.url,
          method: config.method
        });
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

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
          console.error('📡 Network request failed:', {
            url: error.config?.url,
            method: error.config?.method,
            baseURL: error.config?.baseURL,
            request: error.request._response || error.request,
          });
          throw new ApiError(
            `Network error - no response from server. URL: ${error.config?.baseURL}${error.config?.url}`
          );
        } else {
          // Something else happened
          console.error('⚠️ Request setup error:', error.message);
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
