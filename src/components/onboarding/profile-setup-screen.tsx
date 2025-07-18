import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Button,
  Text,
  TextInput,
  Card,
  ActivityIndicator,
} from 'react-native-paper';

import { userService } from '../../services/userService';

interface ProfileSetupScreenProps {
  walletAddress: string;
  onComplete: () => void;
  onBack: () => void;
}

export function ProfileSetupScreen({
  walletAddress,
  onComplete,
  onBack,
}: ProfileSetupScreenProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      const result = await userService.registerWalletUser(
        walletAddress,
        'wallet',
        name.trim()
      );

      Alert.alert(
        'Welcome to CapsuleX!',
        `Hi ${result.user.name}, your account has been created successfully.`,
        [
          {
            text: 'Continue',
            onPress: onComplete,
          },
        ]
      );
    } catch (error) {
      // Registration error handled by user feedback
      Alert.alert(
        'Registration Error',
        'Failed to create your account. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => setIsLoading(false),
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Set Up Your Profile
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Let's personalize your CapsuleX experience
        </Text>
      </View>

      <Card style={styles.walletCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.walletTitle}>
            Connected Wallet
          </Text>
          <Text variant="bodyMedium" style={styles.walletAddress}>
            {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.formContainer}>
        <Text variant="titleMedium" style={styles.fieldLabel}>
          What should we call you?
        </Text>
        <TextInput
          mode="outlined"
          label="Your Name"
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          style={styles.nameInput}
          disabled={isLoading}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <Text variant="bodySmall" style={styles.helpText}>
          This name will be displayed in your profile and when sharing capsules
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={onBack}
          style={styles.backButton}
          disabled={isLoading}
        >
          Back
        </Button>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.continueButton}
          disabled={isLoading || !name.trim()}
          loading={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Complete Setup'}
        </Button>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Card style={styles.loadingCard}>
            <Card.Content style={styles.loadingContent}>
              <ActivityIndicator size="large" />
              <Text variant="bodyLarge" style={styles.loadingText}>
                Creating your account...
              </Text>
            </Card.Content>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  walletCard: {
    marginBottom: 32,
  },
  walletTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  walletAddress: {
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  formContainer: {
    flex: 1,
    marginBottom: 32,
  },
  fieldLabel: {
    marginBottom: 16,
    fontWeight: '600',
  },
  nameInput: {
    marginBottom: 8,
  },
  helpText: {
    opacity: 0.6,
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 32,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 300,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
});
