import { vi } from 'vitest';

// Mock React Native modules
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  // Add other mocks as needed for React Native components
}));

// Mock React Native Gesture Handler
vi.mock('react-native-gesture-handler', () => ({}));

// Mock async-storage
vi.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock fetch for API calls
global.fetch = vi.fn();
