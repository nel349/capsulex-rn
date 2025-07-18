// Polyfills
import './src/polyfills';

import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, useColorScheme } from 'react-native';
import {
  PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { ClusterProvider } from './src/components/cluster/cluster-data-access';
import { AppNavigator } from './src/navigators/AppNavigator';
import { ConnectionProvider } from './src/utils/ConnectionProvider';
import { PrivyProvider } from '@privy-io/expo';


const queryClient = new QueryClient();

export default function App() {
  const colorScheme = useColorScheme();
  const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  });

  const privyClientId = process.env.EXPO_PUBLIC_PRIVY_APP_CLIENT_ID;
  const privyAppId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;

  if (!privyClientId || !privyAppId) {
    throw new Error('Missing Privy client ID or app ID');
  } else {
    console.log('Privy client ID:', privyClientId);
    console.log('Privy app ID:', privyAppId);
  }

  // Handle embedded wallet proxy initialization
  useEffect(() => {
    // Suppress the embedded wallet proxy error for OAuth-only usage
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.toString().includes('Embedded wallet proxy not initialized')) {
        console.warn('⚠️ Embedded wallet proxy warning suppressed for OAuth login');
        return;
      }
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const CombinedDefaultTheme = {
    ...MD3LightTheme,
    ...LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      ...LightTheme.colors,
    },
  };
  const CombinedDarkTheme = {
    ...MD3DarkTheme,
    ...DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      ...DarkTheme.colors,
    },
  };
  return (
    <QueryClientProvider client={queryClient}>
      <ClusterProvider>
        <ConnectionProvider config={{ commitment: 'processed' }}>
          <SafeAreaView
            style={[
              styles.shell,
              {
                backgroundColor:
                  colorScheme === 'dark'
                    ? MD3DarkTheme.colors.background
                    : MD3LightTheme.colors.background,
              },
            ]}
          >
            <PaperProvider
              theme={
                colorScheme === 'dark'
                  ? CombinedDarkTheme
                  : CombinedDefaultTheme
              }
            >
              <PrivyProvider
                appId={process.env.EXPO_PUBLIC_PRIVY_APP_ID}
                clientId={process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID}
              >
                <AppNavigator />
              </PrivyProvider>
            </PaperProvider>
          </SafeAreaView>
        </ConnectionProvider>
      </ClusterProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
