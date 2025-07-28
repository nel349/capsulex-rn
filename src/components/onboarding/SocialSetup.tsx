import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useDualAuth } from '../../providers/DualAuthProvider';

interface SocialSetupProps {}

export function SocialSetup({}: SocialSetupProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const navigation = useNavigation();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // TODO: Implement X/Twitter OAuth integration
      // Navigate directly to main app after social connect
      navigation.navigate('HomeStack' as never);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    // Navigate directly to main app after skipping social
    navigation.navigate('HomeStack' as never);
  };

  const handleBack = () => {
    // Navigate back to onboarding
    navigation.navigate('Onboarding' as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Connect Social
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Connect X to share your capsules (Optional)
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleConnect}
          loading={isConnecting}
          disabled={isConnecting}
          style={styles.button}
        >
          Connect X
        </Button>

        <Button mode="outlined" onPress={handleSkip} style={styles.button}>
          Skip
        </Button>

        <Button mode="text" onPress={handleBack} style={styles.button}>
          Back
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonContainer: {
    paddingBottom: 32,
  },
  button: {
    marginBottom: 16,
  },
});
