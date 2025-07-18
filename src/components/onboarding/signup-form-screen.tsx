import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, TextInput, Card } from 'react-native-paper';

interface SignupFormScreenProps {
  onSubmit: (name: string) => void;
  onBack: () => void;
  onCancel?: () => void;
}

export function SignupFormScreen({
  onSubmit,
  onBack,
  onCancel,
}: SignupFormScreenProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Create Your Account
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Let's get you started with CapsuleX
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.fieldLabel}>
              What's your name?
            </Text>
            <TextInput
              mode="outlined"
              label="Your Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              style={styles.nameInput}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <Text variant="bodySmall" style={styles.helpText}>
              This will be your display name in the app
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              Next: Connect Your Wallet
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              After entering your name, you'll connect your Solana mobile wallet
              to secure your account
            </Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.actionsContainer}>
        <Button mode="outlined" onPress={onBack} style={styles.backButton}>
          Back
        </Button>

        {onCancel && (
          <Button mode="text" onPress={onCancel} style={styles.cancelButton}>
            Cancel
          </Button>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.continueButton}
          disabled={!name.trim()}
        >
          Continue
        </Button>
      </View>
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
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  formCard: {
    padding: 8,
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
});
