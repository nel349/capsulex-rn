import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';

import { useSnackbar } from '../../hooks/useSnackbar';
import { twitterService } from '../../services/twitterService';
import { AppSnackbar } from '../ui/AppSnackbar';

interface SocialConnectionScreenProps {
  onConnect: () => Promise<void>;
  onSkip: () => void;
  onBack: () => void;
  onCancel?: () => void;
  isOptional?: boolean;
}

export function SocialConnectionScreen({
  onConnect,
  onSkip,
  onBack,
  onCancel,
  isOptional = true,
}: SocialConnectionScreenProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      console.log('🐦 Starting Twitter connection...');

      // Test: Show what redirect URI we're using
      console.log('🔍 About to start OAuth - check logs for redirect URI');

      // Use Twitter service to authenticate
      const result = await twitterService.authenticate();

      console.log('✅ Twitter connected:', result.username);
      showSuccess(`Connected to Twitter as @${result.username}!`);

      // Call the onConnect callback and continue onboarding
      setTimeout(async () => {
        await onConnect();
      }, 1500);
    } catch (error) {
      console.error('❌ Twitter connection failed:', error);
      showError(
        `Twitter connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Connect Your Social
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {isOptional
            ? 'Connect X to enhance your capsule sharing experience'
            : 'X connection is required to create capsules'}
        </Text>
      </View>

      <View style={styles.contentContainer}>
        <Card style={styles.socialCard}>
          <Card.Content style={styles.cardContent}>
            <Text style={styles.socialIcon}>𝕏</Text>
            <Text variant="headlineSmall" style={styles.socialTitle}>
              Connect to X
            </Text>
            <Text variant="bodyMedium" style={styles.socialDescription}>
              Share your capsules, connect with friends, and discover amazing
              content on X
            </Text>

            <View style={styles.benefitsList}>
              <Text variant="bodyMedium" style={styles.benefitItem}>
                • Auto-post capsules when they reveal
              </Text>
              <Text variant="bodyMedium" style={styles.benefitItem}>
                • Secure OAuth connection
              </Text>
              <Text variant="bodyMedium" style={styles.benefitItem}>
                • Share your time capsules with the world
              </Text>
            </View>
          </Card.Content>
        </Card>

        {isOptional && (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.infoTitle}>
                You can skip this for now
              </Text>
              <Text variant="bodyMedium" style={styles.infoText}>
                You'll need to connect X later when you create your first
                capsule
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={onBack}
          style={styles.backButton}
          disabled={isConnecting}
        >
          Back
        </Button>

        {onCancel && (
          <Button
            mode="text"
            onPress={onCancel}
            style={styles.cancelButton}
            disabled={isConnecting}
          >
            Cancel
          </Button>
        )}

        {isOptional && (
          <Button
            mode="outlined"
            onPress={onSkip}
            style={styles.skipButton}
            disabled={isConnecting}
          >
            Skip for now
          </Button>
        )}

        <Button
          mode="contained"
          onPress={handleConnect}
          style={styles.connectButton}
          disabled={isConnecting}
          loading={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect X'}
        </Button>
      </View>

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
    justifyContent: 'space-between',
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
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  socialCard: {
    padding: 16,
  },
  cardContent: {
    alignItems: 'center',
  },
  socialIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  socialTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  socialDescription: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 24,
  },
  benefitsList: {
    alignSelf: 'stretch',
  },
  benefitItem: {
    marginBottom: 8,
    opacity: 0.8,
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    opacity: 0.8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 32,
  },
  backButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
  skipButton: {
    flex: 1,
  },
  connectButton: {
    flex: 2,
  },
});
