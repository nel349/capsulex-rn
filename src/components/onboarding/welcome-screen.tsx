import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';

import { useMobileWallet } from '../../utils/useMobileWallet';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const { isSupported } = useMobileWallet();

  const features = [
    {
      title: 'Solana Mobile Wallet',
      description: 'Connect your mobile wallet seamlessly',
      icon: '📱',
    },
    {
      title: 'Create Capsules',
      description: 'Build and share your digital capsules',
      icon: '🚀',
    },
    {
      title: 'Social Integration',
      description: 'Connect with friends and share experiences',
      icon: '🌐',
    },
    {
      title: 'SOL Rewards',
      description: 'Earn rewards for your participation',
      icon: '💎',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="displayMedium" style={styles.title}>
          Welcome to CapsuleX
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Your gateway to the Solana ecosystem
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <Card key={index} style={styles.featureCard}>
            <Card.Content style={styles.featureContent}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureText}>
                <Text variant="titleMedium" style={styles.featureTitle}>
                  {feature.title}
                </Text>
                <Text variant="bodyMedium" style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>

      {!isSupported && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              iOS Support Coming Soon
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Mobile wallet features are currently available on Android. iOS
              support with Privy integration is coming soon!
            </Text>
          </Card.Content>
        </Card>
      )}

      <View style={styles.ctaContainer}>
        <Button
          mode="contained"
          onPress={onGetStarted}
          style={styles.getStartedButton}
          contentStyle={styles.buttonContent}
          disabled={!isSupported}
        >
          {isSupported ? 'Get Started' : 'Coming Soon for iOS'}
        </Button>

        {isSupported && (
          <Text variant="bodySmall" style={styles.disclaimer}>
            By continuing, you agree to connect your Solana mobile wallet
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
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
  featuresContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  featureCard: {
    marginVertical: 4,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    opacity: 0.8,
  },
  infoCard: {
    marginVertical: 16,
    backgroundColor: Platform.OS === 'ios' ? '#e3f2fd' : 'transparent',
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: Platform.OS === 'ios' ? '#1976d2' : undefined,
  },
  infoText: {
    color: Platform.OS === 'ios' ? '#424242' : undefined,
  },
  ctaContainer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  getStartedButton: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  disclaimer: {
    textAlign: 'center',
    opacity: 0.6,
    paddingHorizontal: 16,
  },
});
