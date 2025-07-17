// Polyfills
import './src/polyfills';

import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, useColorScheme, View, Platform, StatusBar } from 'react-native';
import {
  PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native';


import { ClusterProvider } from './src/components/cluster/cluster-data-access';
import { AppNavigator } from './src/navigators/AppNavigator';
import { ConnectionProvider } from './src/utils/ConnectionProvider';
import { PrivyProvider } from '@privy-io/expo';
import { PRIVY_CONFIG } from './src/components/privy/privyConfig';

// import { PrivyProvider } from '@privy-io/expo';
// import { PRIVY_CONFIG } from './src/components/privy/privyConfig';

const queryClient = new QueryClient();

export default function App() {
  // Debug environment variables
  console.log('=== Privy Environment Variables ===');
  console.log('EXPO_PUBLIC_PRIVY_APP_ID:', process.env.EXPO_PUBLIC_PRIVY_APP_ID);
  console.log('EXPO_PUBLIC_PRIVY_APP_CLIENT_ID:', process.env.EXPO_PUBLIC_PRIVY_APP_CLIENT_ID);
  console.log('All env keys:', Object.keys(process.env).filter(key => key.includes('PRIVY')));
  console.log('=====================================');

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

  const backgroundColor = colorScheme === 'dark' 
    ? MD3DarkTheme.colors.background 
    : MD3LightTheme.colors.background;

  // Pure cross-platform safe area implementation
  const AppContainer = Platform.select({
    ios: () => (
      <SafeAreaView style={[styles.shell, { backgroundColor }]}>
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
    ),
    android: () => (
      <View style={[
        styles.shell, 
        { 
          backgroundColor,
          paddingTop: StatusBar.currentHeight || 0 
        }
      ]}>
        <PaperProvider
          theme={
            colorScheme === 'dark'
              ? CombinedDarkTheme
              : CombinedDefaultTheme
          }
        >
          <AppNavigator />
        </PaperProvider>
      </View>
    ),
    default: () => (
      <View style={[styles.shell, { backgroundColor }]}>
        <PaperProvider
          theme={
            colorScheme === 'dark'
              ? CombinedDarkTheme
              : CombinedDefaultTheme
          }
        >
          <AppNavigator />
        </PaperProvider>
      </View>
    ),
  })!;

  // Check if Privy env vars are available
  const privyAppId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
  const privyClientId = process.env.EXPO_PUBLIC_PRIVY_APP_CLIENT_ID;
  const hasPrivyConfig = privyAppId && privyClientId;

  console.log('Has Privy config:', hasPrivyConfig);

  // Environment variable validation
  if (!privyAppId) {
    console.warn('⚠️ EXPO_PUBLIC_PRIVY_APP_ID is missing');
    console.warn('💡 Create a .env file in project root with: EXPO_PUBLIC_PRIVY_APP_ID=your-app-id');
  }
  
  if (!privyClientId) {
    console.warn('⚠️ EXPO_PUBLIC_PRIVY_CLIENT_ID is missing');
    console.warn('💡 Create a .env file in project root with: EXPO_PUBLIC_PRIVY_CLIENT_ID=your-client-id');
  }
  
  if (!hasPrivyConfig) {
    console.warn('🚫 Privy integration disabled - missing environment variables');
    console.warn('📝 To enable Privy, create .env file with both EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID');
  } else {
    console.log('✅ Privy configuration found - integration enabled');
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* <PrivyProvider appId={privyAppId} clientId={privyClientId} config={PRIVY_CONFIG.config}> */}
      <ClusterProvider>
        <ConnectionProvider config={{ commitment: 'processed' }}>
          <AppContainer />
        </ConnectionProvider>
      </ClusterProvider>
      {/* </PrivyProvider> */}
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
