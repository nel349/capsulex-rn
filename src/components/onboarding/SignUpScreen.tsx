import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import { useDualAuth } from '../../providers/DualAuthProvider';

interface SignUpScreenProps {
  onSubmit: (name: string, email: string) => void;
  onBack: () => void;
}

export function SignUpScreen({ onSubmit, onBack }: SignUpScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) {
      return;
    }
    onSubmit(name.trim(), email.trim());
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        autoCapitalize="words"
      />

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
      />

      <Button mode="contained" onPress={handleSubmit} style={styles.button}>
        Create Account
      </Button>

      <Button mode="text" onPress={onBack} style={styles.button}>
        Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
});

