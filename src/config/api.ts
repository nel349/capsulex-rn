import { Platform } from 'react-native';

// Network configuration - centralized API endpoints
const NETWORK_CONFIG = {
  // Development settings
  DEV_HOST: '192.168.1.157', // Change this to your Mac's IP address
  DEV_PORT: 3001,

  // Production settings
  PROD_BASE_URL: 'https://api.capsulex.com',
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? Platform.select({
        ios: `http://${NETWORK_CONFIG.DEV_HOST}:${NETWORK_CONFIG.DEV_PORT}/api`,
        android: `http://${NETWORK_CONFIG.DEV_HOST}:${NETWORK_CONFIG.DEV_PORT}/api`,
        default: `http://${NETWORK_CONFIG.DEV_HOST}:${NETWORK_CONFIG.DEV_PORT}/api`,
      })
    : `${NETWORK_CONFIG.PROD_BASE_URL}/api`,
  TIMEOUT: 10000, // 10 seconds
};

// Helper function to get the current API base URL
export const getApiBaseUrl = (): string => {
  return API_CONFIG.BASE_URL;
};

// Development helper to log current config
if (__DEV__) {
  console.log('🔧 API Config:', {
    platform: Platform.OS,
    baseUrl: API_CONFIG.BASE_URL,
    isDev: __DEV__,
  });
}
