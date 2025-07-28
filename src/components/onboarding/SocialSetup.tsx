import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useDualAuth } from '../../providers/DualAuthProvider';

interface SocialSetupProps {
  onConnect: () => Promise<void>;
  onSkip: () => void;
  onBack: () => void;
}

export function SocialSetup({ onConnect, onSkip, onBack }: SocialSetupProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } finally {
      setIsConnecting(false);
    }
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

        <Button mode="outlined" onPress={onSkip} style={styles.button}>
          Skip
        </Button>

        <Button mode="text" onPress={onBack} style={styles.button}>
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
