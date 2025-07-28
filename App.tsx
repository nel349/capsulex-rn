// Polyfills
import './src/polyfills';

import { createClient } from '@dynamic-labs/client';
import { ReactNativeExtension } from '@dynamic-labs/react-native-extension';
import { SolanaExtension } from '@dynamic-labs/solana-extension';
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

import { ClusterProvider } from './src/components/cluster/cluster-data-access';
import { AppNavigator } from './src/navigators/AppNavigator';
import { DualAuthProvider } from './src/providers';
import { ConnectionProvider } from './src/utils/ConnectionProvider';

const queryClient = new QueryClient();

export const dynamicClient = createClient({
  environmentId: '13a7a6f3-8e29-4e10-ae0a-e98535ac83e3',

  // Optional:
  appLogoUrl: 'https://demo.dynamic.xyz/favicon-32x32.png',
  appName: 'Capsulex',
})
  .extend(ReactNativeExtension())
  .extend(SolanaExtension());

export default function App() {
  const colorScheme = useColorScheme();
  const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  });

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
          <DualAuthProvider>
            <dynamicClient.reactNative.WebView />
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
                <AppNavigator />
              </PaperProvider>
            </SafeAreaView>
          </DualAuthProvider>
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
