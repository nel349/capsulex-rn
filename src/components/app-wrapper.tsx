import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { HomeNavigator } from '../navigators/HomeNavigator';
import { useAuthorization } from '../utils/useAuthorization';

import { OnboardingFlow } from './onboarding';

export function AppWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { selectedAccount, isSupported } = useAuthorization();

  // Simple auth check - no API calls on launch!
  useEffect(() => {
    // If no wallet support (iOS), show main app
    if (!isSupported) {
      console.log('📱 iOS detected - showing main app');
      setShowOnboarding(false);
      setIsLoading(false);
      return;
    }

    // If no connected account, show onboarding (like cultivest)
    if (!selectedAccount?.publicKey) {
      console.log('🔓 No wallet connected - showing onboarding');
      setShowOnboarding(true);
      setIsLoading(false);
      return;
    }

    // Wallet is connected - show main app
    // User registration will be handled in onboarding flow
    console.log('✅ Wallet connected - showing main app');
    setShowOnboarding(false);
    setIsLoading(false);
  }, [selectedAccount, isSupported]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return <HomeNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
