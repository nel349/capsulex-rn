import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { usePrivy, useLoginWithEmail } from '@privy-io/expo';

export function PrivyAuthTest() {
  const { isReady, user, logout } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();

  if (!isReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading Privy...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Not authenticated</Text>
        <Button 
          title="Login with Email" 
          onPress={() => sendCode({ email: 'test@example.com' })} 
        />
        {state.status === 'awaiting-code-input' && (
          <Text style={styles.text}>Check your email for a code</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome!</Text>
      <Text style={styles.text}>User ID: {user.id}</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
}); 