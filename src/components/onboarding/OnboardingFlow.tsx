import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';

import { useSnackbar } from '../../hooks/useSnackbar';
import { useDualAuth } from '../../providers/DualAuthProvider';
import { AppSnackbar } from '../ui/AppSnackbar';

import { SignUpScreen } from './SignUpScreen';
import { WelcomeScreen } from './WelcomeScreen';
import { dynamicClientService } from '../../services/dynamicClientService';

type OnboardingStep = 'welcome' | 'signup' | 'connecting' | 'social' | 'complete';

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const { signIn, signUp, isAuthenticated, walletAddress } = useDualAuth();
  const { snackbar, showError, showInfo, hideSnackbar } = useSnackbar();
  const navigation = useNavigation();

  useEffect(() => {
    // console.log('🔍 Auth State Change:', {
    //   currentStep,
    //   isAuthenticated,
    //   walletAddress
    // });

    // Only reset to welcome if user was previously authenticated and now isn't
    if (!isAuthenticated || !walletAddress) {
      // Don't reset to welcome if we're in signup flow
      if (currentStep !== 'signup') {
        setCurrentStep('welcome');
      }
      return;
    }

    // for iOS we need to check if the user is authenticated by this we mean isAuthenticated is true and the dynamic client is not null and the userProfile is not null
    if (Platform.OS === 'ios') {
      if (dynamicClientService.getDynamicClient()?.ui.userProfile) {
        setCurrentStep('complete');
        navigation.navigate('HomeStack' as never);
      }
    }

    // Handle successful authentication only when not actively connecting
    if (isAuthenticated && walletAddress && currentStep === 'welcome') {
      navigation.navigate('HomeStack' as never);
    }

    console.log('🔍 OnboardingFlow - isAuthenticated:', isAuthenticated);
    console.log('🔍 OnboardingFlow - walletAddress:', walletAddress);
    console.log('🔍 OnboardingFlow - currentStep:', currentStep);
  }, [isAuthenticated, walletAddress, currentStep, navigation]);

  const handleGetStarted = async () => {
    // Go to signup screen to collect name and email first

    // for android, we should go to the signup screen
    if (Platform.OS === 'android') {
      setCurrentStep('signup');
    } else {
      // for ios, we should be able to call the signin function
      try {
        setCurrentStep('connecting');
        await signIn();
        // Navigation will be handled by useEffect when auth state changes
      } catch (error) {
        // console.error('🔍 iOS Get Started - Sign in failed:', error);
        // showError(error instanceof Error ? error.message : 'Sign in failed');
        // setCurrentStep('welcome');
      }
    }
  };

  const handleSignIn = async () => {
    try {
      setCurrentStep('connecting');
      await signIn();
      // Navigation will be handled by useEffect when auth state changes
    } catch (error) {
      console.error('Sign in failed:', error);

      if (
        error instanceof Error &&
        error.message.includes('No account found')
      ) {
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
        navigation.navigate('HomeStack' as never);
      }
    } catch (error) {
      console.error('Signup failed:', error);
      showError(error instanceof Error ? error.message : 'Signup failed');
      setCurrentStep('signup');
    }
  };

  const handleBack = () => {
    if (currentStep === 'signup') {
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
          <SignUpScreen onSubmit={handleSignupSubmit} onBack={handleBack} />
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
