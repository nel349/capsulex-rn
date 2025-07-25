import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Platform } from 'react-native';

import { useAuth } from '../contexts';
import { HomeNavigator } from '../navigators/HomeNavigator';

import { OnboardingFlow } from './onboarding';

export function AppWrapper() {
  const {
    isAuthenticated,
    isOnboardingComplete,
    isLoading,
    setOnboardingComplete,
    walletAddress,
  } = useAuth();

  // Debug logging to understand what's happening
  console.log('🔍 AppWrapper Debug:', {
    platform: Platform.OS,
    isAuthenticated,
    isOnboardingComplete,
    isLoading,
    walletAddress: walletAddress ? `${walletAddress.slice(0, 8)}...` : null,
  });

  // Show loading screen while Dynamic auth is being restored on iOS
  if (isLoading) {
    console.log('⏳ Loading authentication state...');
    return null; // Or show a loading spinner component
  }

  // For iOS users, we need to check if the wallet is supported
  if (Platform.OS === 'ios' && isAuthenticated) {
    console.log('📱 iOS detected - showing main app');
    return <HomeNavigator />;
  }

  // Complete logic covering all states:
  // 1. No wallet = Onboarding
  // 2. Wallet + completed full signup = Main app
  // 3. Wallet + NOT completed signup = Continue onboarding
  if (isAuthenticated && isOnboardingComplete) {
    console.log('✅ Wallet connected AND full signup completed - showing main app');
    return <HomeNavigator />;
  }

  // console.log(
  //   '🔄 Showing onboarding - either no wallet OR signup not completed'
  // );
  return (
    <OnboardingFlow
      onComplete={() => {
        setOnboardingComplete(true);

        // lets make sure we clear the onboarding state. this is a hack to make sure we dont get stuck in the onboarding flow
        AsyncStorage.multiRemove([
          'onboarding_in_progress',
          'onboarding_step',
          'onboarding_user_name',
          'onboarding_wallet_address',
          'onboarding_social_connected',
        ]);
        console.log('🔄 Onboarding state cleared');
        console.log('🔄 Onboarding complete');
      }}
    />
  );
}
