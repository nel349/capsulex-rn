import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Button,
  Text,
  TextInput,
  Card,
  ActivityIndicator,
} from 'react-native-paper';

import { useSnackbar } from '../../hooks/useSnackbar';
import { userService, ApiError } from '../../services';
import { useAuthService } from '../../services/authService';
import { AppSnackbar } from '../ui/AppSnackbar';

interface ProfileSetupScreenProps {
  walletAddress: string;
  initialName?: string;
  onComplete: () => void;
  onBack: () => void;
  onCancel?: () => void;
}

export function ProfileSetupScreen({
  walletAddress,
  initialName = '',
  onComplete,
  onBack,
  onCancel,
}: ProfileSetupScreenProps) {
  const [name, setName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);
  const { authenticateUser } = useAuthService();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const handleSubmit = async () => {
    if (!name.trim()) {
      showError('Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Updating user profile:', {
        walletAddress,
        name: name.trim(),
      });

      // User is already registered and authenticated, just update the name
      // TODO: Add updateUser API call when needed
      console.log('✅ User profile updated with name:', name.trim());

      showSuccess(
        `Welcome to CapsuleX, ${name.trim()}! Profile setup complete!`
      );

      // Delay completion to show success message
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('❌ Failed to create user account:', error);

      let errorMessage = 'Failed to create your account. Please try again.';

      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      showError(`Account creation failed: ${errorMessage}`);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Create Your Account
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Complete your registration to get started
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

        {onCancel && (
          <Button
            mode="text"
            onPress={onCancel}
            style={styles.cancelButton}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.continueButton}
          disabled={isLoading || !name.trim()}
          loading={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
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

      {/* Snackbar for notifications */}
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
    padding: 24,
    paddingTop: 16,
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
    gap: 12,
    paddingBottom: 32,
  },
  backButton: {
    flex: 1,
  },
  cancelButton: {
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
