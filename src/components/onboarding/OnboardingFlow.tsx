import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { useSnackbar } from '../../hooks/useSnackbar';
import { useDualAuth } from '../../providers/DualAuthProvider';
import { AppSnackbar } from '../ui/AppSnackbar';

import { WelcomeScreen } from './WelcomeScreen';
import { SignUpScreen } from './SignUpScreen';
import { SocialSetup } from './SocialSetup';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'signup' | 'connecting' | 'social';

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const { signIn, signUp, isConnecting } = useDualAuth();
  const { snackbar, showError, showInfo, hideSnackbar } = useSnackbar();

  const handleGetStarted = async () => {
    try {
      await signUp('User'); // Default name for iOS, will be overridden for Android
      setCurrentStep('social');
    } catch (error) {
      console.error('Get started failed:', error);
      
      // For Android, if we need name/email, go to signup screen
      if (error instanceof Error && error.message.includes('wallet')) {
        setCurrentStep('signup');
      } else {
        showError(error instanceof Error ? error.message : 'Failed to get started');
      }
    }
  };

  const handleSignIn = async () => {
    try {
      setCurrentStep('connecting');
      await signIn();
      onComplete();
    } catch (error) {
      console.error('Sign in failed:', error);
      
      if (error instanceof Error && error.message.includes('No account found')) {
        showInfo('No account found. Redirecting to sign up...');
        setTimeout(() => {
          setCurrentStep('signup');
        }, 2000);
      } else {
        showError(error instanceof Error ? error.message : 'Sign in failed');
        setCurrentStep('welcome');
      }
    }
  };

  const handleSignupSubmit = async (name: string) => {
    try {
      setCurrentStep('connecting');
      await signUp(name);
      setCurrentStep('social');
    } catch (error) {
      console.error('Signup failed:', error);
      showError(error instanceof Error ? error.message : 'Signup failed');
      setCurrentStep('signup');
    }
  };

  const handleSocialConnect = async () => {
    // TODO: Implement X/Twitter OAuth integration
    onComplete();
  };

  const handleSocialSkip = () => {
    onComplete();
  };

  const handleBack = () => {
    if (currentStep === 'social') {
      setCurrentStep('signup');
    } else if (currentStep === 'signup') {
      setCurrentStep('welcome');
    } else if (currentStep === 'connecting') {
      setCurrentStep('welcome');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeScreen
            onGetStarted={handleGetStarted}
            onSignIn={handleSignIn}
          />
        );

      case 'signup':
        return (
          <SignUpScreen
            onSubmit={handleSignupSubmit}
            onBack={handleBack}
          />
        );

      case 'connecting':
        return (
          <View style={styles.centerContainer}>
            <Text variant="headlineMedium" style={styles.connectingTitle}>
              Connecting...
            </Text>
            <Text variant="bodyLarge" style={styles.connectingSubtitle}>
              Please approve the connection
            </Text>
          </View>
        );

      case 'social':
        return (
          <SocialSetup
            onConnect={handleSocialConnect}
            onSkip={handleSocialSkip}
            onBack={handleBack}
          />
        );

      default:
        return (
          <WelcomeScreen
            onGetStarted={handleGetStarted}
            onSignIn={handleSignIn}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentStep()}

      <AppSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        type={snackbar.type}
        onDismiss={hideSnackbar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  connectingTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  connectingSubtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
});
