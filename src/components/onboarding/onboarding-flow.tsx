import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

import { useAuthorization } from '../../utils/useAuthorization';
import { useMobileWallet } from '../../utils/useMobileWallet';

import { ProfileSetupScreen } from './profile-setup-screen';
import { WelcomeScreen } from './welcome-screen';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'connecting' | 'profile-setup' | 'complete';

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const { selectedAccount } = useAuthorization();
  const { connect } = useMobileWallet();

  // Set wallet address when account is connected
  useEffect(() => {
    if (selectedAccount?.publicKey) {
      const address = selectedAccount.publicKey.toBase58();
      setWalletAddress(address);
      // Go directly to profile setup - AppWrapper already checked user existence
      setCurrentStep('profile-setup');
    }
  }, [selectedAccount]);

  const handleGetStarted = async () => {
    setCurrentStep('connecting');

    try {
      await connect();
      // Wallet connection will trigger the useEffect above
    } catch (error) {
      // Wallet connection failed, stay on welcome
      setCurrentStep('welcome');
    }
  };

  const handleProfileSetupComplete = () => {
    setCurrentStep('complete');
    onComplete();
  };

  const handleBack = () => {
    if (currentStep === 'profile-setup') {
      setCurrentStep('welcome');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeScreen onGetStarted={handleGetStarted} />;

      case 'connecting':
        return (
          <View style={styles.centerContainer}>
            <WelcomeScreen onGetStarted={handleGetStarted} />
          </View>
        );

      case 'profile-setup':
        return (
          <ProfileSetupScreen
            walletAddress={walletAddress}
            onComplete={handleProfileSetupComplete}
            onBack={handleBack}
          />
        );

      default:
        return <WelcomeScreen onGetStarted={handleGetStarted} />;
    }
  };

  return <View style={styles.container}>{renderCurrentStep()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
