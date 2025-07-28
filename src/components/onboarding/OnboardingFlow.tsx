import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { useSnackbar } from '../../hooks/useSnackbar';
import { useDualAuth } from '../../providers/DualAuthProvider';
import { AppSnackbar } from '../ui/AppSnackbar';

import { WelcomeScreen } from './WelcomeScreen';
import { SignUpScreen } from './SignUpScreen';
import { SocialSetup } from './SocialSetup';

interface OnboardingFlowProps {}

type OnboardingStep = 'welcome' | 'signup' | 'connecting' | 'social';

export function OnboardingFlow({}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const { signIn, signUp, isAuthenticated } = useDualAuth();
  const { snackbar, showError, showInfo, hideSnackbar } = useSnackbar();
  const navigation = useNavigation();

  const handleGetStarted = async () => {
    // Go to signup screen to collect name and email first
    setCurrentStep('signup');
  };

  const handleSignIn = async () => {
    try {
      setCurrentStep('connecting');
      const result = await signIn();
      // Only navigate if we're still in the connecting step (user hasn't navigated away)
      if (currentStep === 'connecting') {
        navigation.navigate('HomeStack' as never);
      }
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

  const handleSignupSubmit = async (name: string, email: string) => {
    try {
      setCurrentStep('connecting');
      await signUp(name, email);
      // Only navigate if we're still in the connecting step (user hasn't navigated away)
      if (currentStep === 'connecting') {
        navigation.navigate('SocialSetup' as never);
      }
    } catch (error) {
      console.error('Signup failed:', error);
      showError(error instanceof Error ? error.message : 'Signup failed');
      setCurrentStep('signup');
    }
  };

  const handleSocialConnect = async () => {
    // TODO: Implement X/Twitter OAuth integration
    // Navigate directly to main app after social connect
    navigation.navigate('HomeStack' as never);
  };

  const handleSocialSkip = () => {
    // Navigate directly to main app after skipping social
    navigation.navigate('HomeStack' as never);
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
          <View style={styles.centerContainer}>
            <Text variant="headlineMedium" style={styles.connectingTitle}>
              Redirecting to social setup...
            </Text>
          </View>
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
