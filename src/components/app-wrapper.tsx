import React from 'react';

import { useAuth } from '../contexts';
import { HomeNavigator } from '../navigators/HomeNavigator';

import { OnboardingFlow } from './onboarding';

export function AppWrapper() {
  const {
    isAuthenticated,
    isSupported,
    isOnboardingComplete,
    setOnboardingComplete,
  } = useAuth();

  console.log('🔍 AppWrapper state:', {
    isAuthenticated,
    isSupported,
    isOnboardingComplete,
  });

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
    console.log(
      '✅ Wallet connected AND full signup completed - showing main app'
    );
    return <HomeNavigator />;
  }

  console.log(
    '🔄 Showing onboarding - either no wallet OR signup not completed'
  );
  return <OnboardingFlow onComplete={() => setOnboardingComplete(true)} />;
}
