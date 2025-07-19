import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';

import { userService, ApiError } from '../../services';
import { useAuthorization } from '../../utils/useAuthorization';
import { useMobileWallet } from '../../utils/useMobileWallet';

import { ProfileSetupScreen } from './profile-setup-screen';
import { ProgressIndicator } from './progress-indicator';
import { SignupFormScreen } from './signup-form-screen';
import { SocialConnectionScreen } from './social-connection-screen';
import { WelcomeScreen } from './welcome-screen';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep =
  | 'welcome'
  | 'signup-form'
  | 'connecting'
  | 'profile-setup'
  | 'social-connection'
  | 'complete';

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [socialConnected, setSocialConnected] = useState<boolean>(false);
  const [isSignInFlow, setIsSignInFlow] = useState<boolean>(false);
  const { selectedAccount } = useAuthorization();
  const { connect, disconnect } = useMobileWallet();

  // Restore onboarding state after app restart (deep linking)
  useEffect(() => {
    const restoreOnboardingState = async () => {
      try {
        const savedStep = await AsyncStorage.getItem('onboarding_step');
        const savedUserName = await AsyncStorage.getItem(
          'onboarding_user_name'
        );
        const savedWalletAddress = await AsyncStorage.getItem(
          'onboarding_wallet_address'
        );
        const savedSocialConnected = await AsyncStorage.getItem(
          'onboarding_social_connected'
        );

        if (savedStep && savedStep !== 'welcome') {
          console.log('🔄 Restoring onboarding state:', savedStep);
          setCurrentStep(savedStep as OnboardingStep);

          if (savedUserName) {
            setUserName(savedUserName);
          }
          if (savedWalletAddress) {
            setWalletAddress(savedWalletAddress);
          }
          if (savedSocialConnected === 'true') {
            setSocialConnected(true);
          }

          // Continue onboarding flow after wallet reconnection
          if (selectedAccount?.publicKey && savedStep === 'connecting') {
            const address = selectedAccount.publicKey.toBase58();
            setWalletAddress(address);
            setCurrentStep('social-connection');
            await saveOnboardingState(
              'social-connection',
              savedUserName || '',
              address,
              savedSocialConnected === 'true'
            );
          }
        }
      } catch (error) {
        console.error('Error restoring onboarding state:', error);
      }
    };

    restoreOnboardingState();
  }, [selectedAccount]);

  // Save onboarding state to survive app restarts
  const saveOnboardingState = async (
    step: OnboardingStep,
    name?: string,
    wallet?: string,
    social?: boolean
  ) => {
    try {
      await AsyncStorage.setItem('onboarding_step', step);
      if (name) await AsyncStorage.setItem('onboarding_user_name', name);
      if (wallet)
        await AsyncStorage.setItem('onboarding_wallet_address', wallet);
      if (social !== undefined)
        await AsyncStorage.setItem(
          'onboarding_social_connected',
          social.toString()
        );
      console.log('💾 Onboarding state saved:', step);
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  };

  // Clear onboarding state when complete
  const clearOnboardingState = async () => {
    try {
      await AsyncStorage.multiRemove([
        'onboarding_step',
        'onboarding_user_name',
        'onboarding_wallet_address',
        'onboarding_social_connected',
      ]);
      console.log('🗑️ Onboarding state cleared');
    } catch (error) {
      console.error('Error clearing onboarding state:', error);
    }
  };

  // Set wallet address when account is connected and handle flow
  useEffect(() => {
    console.log('🔍 Wallet state change detected:', {
      hasAccount: !!selectedAccount?.publicKey,
      address: selectedAccount?.publicKey?.toBase58(),
      currentStep,
      isSignInFlow,
    });

    if (selectedAccount?.publicKey && currentStep === 'connecting') {
      const address = selectedAccount.publicKey.toBase58();
      console.log('🔗 New wallet connected:', address);
      
      // Prevent duplicate API calls by checking if we already have this address
      if (walletAddress === address) {
        console.log('⚠️ Wallet already processed, skipping duplicate check');
        return;
      }
      
      setWalletAddress(address);

      if (isSignInFlow) {
        // Sign In flow: check if user exists
        handleSignInUserCheck(address);
      } else {
        // Get Started flow: check if wallet is already registered
        handleGetStartedUserCheck(address);
      }
    } else if (!selectedAccount?.publicKey) {
      // Clear wallet address when disconnected
      console.log('🔌 Wallet disconnected - clearing address');
      setWalletAddress('');
    }
  }, [selectedAccount, currentStep, isSignInFlow, walletAddress]);

  const handleSignInUserCheck = async (address: string) => {
    try {
      console.log('🔍 Sign In: Checking if user exists:', address);

      const userExists = await userService.userExists(address);

      if (userExists) {
        console.log('✅ Existing user found - going to main app');
        onComplete();
      } else {
        console.log('❌ User not found - redirecting to signup');
        Alert.alert(
          'Account Not Found',
          'No account found for this wallet. Please sign up first.',
          [
            {
              text: 'Sign Up',
              onPress: () => {
                setIsSignInFlow(false);
                setCurrentStep('signup-form');
              },
            },
            {
              text: 'Cancel',
              onPress: () => setCurrentStep('welcome'),
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error checking user existence:', error);

      let errorMessage = 'Failed to check account. Please try again.';
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      Alert.alert('Connection Error', errorMessage, [
        {
          text: 'Try Again',
          onPress: () => handleSignInUserCheck(address),
        },
        {
          text: 'Cancel',
          onPress: () => setCurrentStep('welcome'),
          style: 'cancel',
        },
      ]);
    }
  };

  const handleGetStartedUserCheck = async (address: string) => {
    try {
      console.log(
        '🔍 Get Started: Checking if wallet is already registered:',
        address
      );

      const userExists = await userService.userExists(address);

      if (userExists) {
        console.log('⚠️ Wallet already registered - redirecting to sign in');
        Alert.alert(
          'Account Already Exists',
          'This wallet is already registered. Would you like to sign in instead?',
          [
            {
              text: 'Sign In',
              onPress: () => {
                console.log('✅ User chose to sign in - going to main app');
                onComplete();
              },
            },
            {
              text: 'Use Different Wallet',
              onPress: () => clearOnboardingStateAndGoToWelcome(),
            },
          ]
        );
      } else {
        console.log('✅ Wallet not registered - continuing with signup flow');
        setCurrentStep('social-connection');
      }
    } catch (error) {
      console.error('❌ Error checking wallet registration:', error);

      let errorMessage =
        'Failed to check wallet registration. Please try again.';
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      Alert.alert('Connection Error', errorMessage, [
        {
          text: 'Try Again',
          onPress: () => handleGetStartedUserCheck(address),
        },
        {
          text: 'Cancel',
          onPress: () => setCurrentStep('welcome'),
          style: 'cancel',
        },
      ]);
    }
  };

  const handleGetStarted = async () => {
    // Go to signup form first, then connect wallet
    setIsSignInFlow(false);
    setCurrentStep('signup-form');

    // Clear any previous onboarding completion flag when starting new signup
    try {
      await AsyncStorage.removeItem('onboarding_completed');
      console.log('🗑️ Cleared previous onboarding completion flag');
    } catch (error) {
      console.error('Error clearing onboarding completion flag:', error);
    }
  };

  const handleSignupFormSubmit = async (name: string) => {
    setUserName(name);
    setCurrentStep('connecting');
    await saveOnboardingState('connecting', name);

    try {
      await connect();
      // Wallet connection will trigger the useEffect above
    } catch (error) {
      // Wallet connection failed, go back to signup form
      setCurrentStep('signup-form');
      await saveOnboardingState('signup-form', name);
    }
  };

  const handleSignIn = async () => {
    setIsSignInFlow(true);
    setCurrentStep('connecting');

    try {
      const account = await connect();
      // Let the useEffect handle the flow after connection
    } catch (error) {
      // Wallet connection failed, stay on welcome
      setCurrentStep('welcome');
    }
  };

  const handleProfileSetupComplete = async () => {
    // User account created successfully, complete onboarding
    setCurrentStep('complete');
    await clearOnboardingState();
    onComplete();
  };

  const handleSocialConnect = async () => {
    // TODO: Implement actual X/Twitter OAuth integration
    setSocialConnected(true);
    // Go to profile setup to create the user account
    setCurrentStep('profile-setup');
    await saveOnboardingState('profile-setup', userName, walletAddress, true);
  };

  const handleSocialSkip = async () => {
    // Go to profile setup to create the user account
    setCurrentStep('profile-setup');
    await saveOnboardingState('profile-setup', userName, walletAddress, false);
  };

  const handleCancel = async () => {
    // Clear all persistent state
    await clearOnboardingState();

    // Reset all local state
    setCurrentStep('welcome');
    setUserName('');
    setWalletAddress('');
    setSocialConnected(false);
    setIsSignInFlow(false);

    console.log('❌ Onboarding cancelled - state cleared');
  };

  const clearOnboardingStateAndGoToWelcome = async () => {
    // Clear all persistent state
    await clearOnboardingState();

    // Reset all local state
    setCurrentStep('welcome');
    setUserName('');
    setWalletAddress('');
    setSocialConnected(false);
    setIsSignInFlow(false);

    // we also have to disconnect from the wallet
    await disconnect();

    console.log('🔄 Cleared state and returned to welcome');
  };

  const handleBack = async () => {
    if (currentStep === 'profile-setup') {
      setCurrentStep('social-connection');
      await saveOnboardingState(
        'social-connection',
        userName,
        walletAddress,
        socialConnected
      );
    } else if (currentStep === 'social-connection') {
      setCurrentStep('connecting');
      await saveOnboardingState('connecting', userName);
    } else if (currentStep === 'signup-form') {
      // Going back to welcome should clear state
      await handleCancel();
    }
  };

  // Progress indicator steps
  const getProgressSteps = () => {
    return [
      {
        id: 'info',
        title: 'Basic Info',
        completed: !!userName && currentStep !== 'signup-form',
        current: currentStep === 'signup-form',
      },
      {
        id: 'wallet',
        title: 'Wallet',
        completed:
          !!walletAddress &&
          ['social-connection', 'profile-setup', 'complete'].includes(
            currentStep
          ),
        current: currentStep === 'connecting',
      },
      {
        id: 'social',
        title: 'Social (Optional)',
        completed:
          currentStep === 'profile-setup' || currentStep === 'complete',
        current: currentStep === 'social-connection',
      },
    ];
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

      case 'signup-form':
        return (
          <View style={styles.container}>
            <ProgressIndicator steps={getProgressSteps()} />
            <SignupFormScreen
              onSubmit={handleSignupFormSubmit}
              onBack={handleBack}
              onCancel={handleCancel}
            />
          </View>
        );

      case 'connecting':
        if (isSignInFlow) {
          // Sign In: show simple connecting screen
          return (
            <View style={styles.container}>
              <View style={styles.centerContainer}>
                <Text variant="headlineMedium" style={styles.connectingTitle}>
                  Connecting Wallet...
                </Text>
                <Text variant="bodyLarge" style={styles.connectingSubtitle}>
                  Please approve the connection in your wallet
                </Text>
              </View>
            </View>
          );
        } else {
          // Get Started: show signup form with progress
          return (
            <View style={styles.container}>
              <ProgressIndicator steps={getProgressSteps()} />
              <View style={styles.centerContainer}>
                <SignupFormScreen
                  onSubmit={handleSignupFormSubmit}
                  onBack={handleBack}
                  onCancel={handleCancel}
                />
              </View>
            </View>
          );
        }

      case 'profile-setup':
        return (
          <View style={styles.container}>
            <ProgressIndicator steps={getProgressSteps()} />
            <ProfileSetupScreen
              walletAddress={walletAddress}
              initialName={userName}
              onComplete={handleProfileSetupComplete}
              onBack={handleBack}
              onCancel={handleCancel}
            />
          </View>
        );

      case 'social-connection':
        return (
          <View style={styles.container}>
            <ProgressIndicator steps={getProgressSteps()} />
            <SocialConnectionScreen
              onConnect={handleSocialConnect}
              onSkip={handleSocialSkip}
              onBack={handleBack}
              onCancel={handleCancel}
              isOptional={true}
            />
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

  return renderCurrentStep();
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
