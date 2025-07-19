import React from 'react';

import { useAuth } from '../contexts';
import { HomeNavigator } from '../navigators/HomeNavigator';

import { OnboardingFlow } from './onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function AppWrapper() {
  const {
    isAuthenticated,
    isSupported,
    isOnboardingComplete,
    setOnboardingComplete,
  } = useAuth();

  // console.log('🔍 AppWrapper state:', {
  //   isAuthenticated,
  //   isSupported,
  //   isOnboardingComplete,
  // });

  // iOS users (no wallet support) go straight to main app
  if (!isSupported) {
    console.log('📱 iOS detected - showing main app');
    return <HomeNavigator />;
  }

  // Complete logic covering all states:
  // 1. No wallet = Onboarding
  // 2. Wallet + completed full signup = Main app
  // 3. Wallet + NOT completed signup = Continue onboarding
  if (isAuthenticated && isOnboardingComplete) {
    // console.log(
    //   '✅ Wallet connected AND full signup completed - showing main app'
    // );
    return <HomeNavigator />;
  }

  // console.log(
  //   '🔄 Showing onboarding - either no wallet OR signup not completed'
  // );
  return <OnboardingFlow onComplete={() => {
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
  }} />;
}
