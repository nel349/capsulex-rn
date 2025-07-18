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

  // iOS users (no wallet support) go straight to main app
  if (!isSupported) {
    return <HomeNavigator />;
  }

  // Android users:
  // - If wallet connected AND onboarding complete = main app
  // - Otherwise = onboarding
  if (isAuthenticated && isOnboardingComplete) {
    return <HomeNavigator />;
  }

  return <OnboardingFlow onComplete={() => setOnboardingComplete(true)} />;
}
