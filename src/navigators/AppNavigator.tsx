/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 */
import type { LinkingOptions } from '@react-navigation/native';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useColorScheme } from 'react-native';
import {
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from 'react-native-paper';

import { OnboardingFlow } from '../components/onboarding';
import { SocialSetup } from '../components/onboarding/SocialSetup';
import { DualAuthProvider } from '../providers';
import * as Screens from '../screens';

import { HomeNavigator } from './HomeNavigator';

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 *
 */

type RootStackParamList = {
  Onboarding: undefined;
  SocialSetup: undefined;
  HomeStack: undefined;
  Home: undefined;
  NetworkSettings: undefined;
  CapsuleDetails: {
    capsule: {
      capsule_id: string;
      content_encrypted: string;
      content_hash: string;
      has_media: boolean;
      media_urls: string[];
      reveal_date: string;
      created_at: string;
      on_chain_tx: string;
      sol_fee_amount: number;
      status?: string;
      revealed_at?: string;
      social_post_id?: string;
      posted_to_social?: boolean;
    };
  };
  Game: {
    capsule_id: string;
    action?: 'view' | 'guess';
  };
  // 🔥 Your screens go here
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<RootStackParamList>();

const AppStack = () => {
  // Always start with Onboarding - let individual screens handle navigation based on auth state
  return (
    <Stack.Navigator initialRouteName="Onboarding">
      <Stack.Screen
        name="Onboarding"
        component={OnboardingFlow}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SocialSetup"
        component={SocialSetup}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HomeStack"
        component={HomeNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="NetworkSettings" component={Screens.NetworkSettingsScreen} />
      <Stack.Screen
        name="CapsuleDetails"
        component={Screens.CapsuleDetailsScreen}
        options={{
          title: 'Capsule Details',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="Game"
        component={Screens.GameScreen}
        options={{
          title: 'Time Capsule Game',
          headerShown: true,
        }}
      />
      {/** 🔥 Your screens go here */}
    </Stack.Navigator>
  );
};

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['capsulex://'],
  config: {
    screens: {
      Game: {
        path: 'game/:capsule_id/:action?',
        parse: {
          capsule_id: (capsule_id: string) => capsule_id,
          action: (action: string) => (action as 'view' | 'guess') || 'view',
        },
      },
      CapsuleDetails: 'capsule/:capsule_id',
      NetworkSettings: 'network-settings',
    },
  },
};

export interface NavigationProps
  extends Partial<React.ComponentProps<typeof NavigationContainer>> {}

export const AppNavigator = (props: NavigationProps) => {
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
    <NavigationContainer
      linking={linking as any}
      theme={colorScheme === 'dark' ? CombinedDarkTheme : CombinedDefaultTheme}
      {...props}
    >
      <DualAuthProvider>
        <StatusBar />
        <AppStack />
      </DualAuthProvider>
    </NavigationContainer>
  );
};
