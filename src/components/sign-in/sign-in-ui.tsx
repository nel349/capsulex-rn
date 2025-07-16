import { View, StyleSheet, Platform, Alert } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';

import { useMobileWallet } from '../../utils/useMobileWallet';

export function ConnectButton() {
  const { connect, isSupported } = useMobileWallet();

  const handleConnect = async () => {
    if (!isSupported) {
      Alert.alert(
        'Wallet Not Available',
        'Mobile Wallet Adapter is not supported on iOS. Wallet features coming soon with Privy integration!'
      );
      return;
    }

    try {
      await connect();
    } catch (error) {
      console.error('Connect error:', error);
      Alert.alert('Connection Error', 'Failed to connect to wallet');
    }
  };

  return (
    <Button
      mode="contained"
      onPress={handleConnect}
      style={styles.button}
      disabled={!isSupported}
    >
      {isSupported ? 'Connect Wallet' : 'Wallet Coming Soon'}
    </Button>
  );
}

export function SignInButton() {
  const { signIn, isSupported } = useMobileWallet();

  const handleSignIn = async () => {
    if (!isSupported) {
      Alert.alert(
        'Sign In Not Available',
        'Mobile Wallet Adapter is not supported on iOS. Wallet features coming soon with Privy integration!'
      );
      return;
    }

    try {
      // Implement sign in logic when needed
      Alert.alert(
        'Sign In',
        'Sign in functionality will be implemented with full wallet integration'
      );
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Sign In Error', 'Failed to sign in');
    }
  };

  return (
    <Button
      mode="outlined"
      onPress={handleSignIn}
      style={styles.button}
      disabled={!isSupported}
    >
      {isSupported ? 'Sign In' : 'Sign In Coming Soon'}
    </Button>
  );
}

export function PlatformInfo() {
  const { isSupported } = useMobileWallet();

  if (isSupported) {
    return null; // Don't show anything on Android
  }

  return (
    <Card style={styles.infoCard}>
      <Card.Content>
        <Text style={styles.infoTitle}>iOS Wallet Support</Text>
        <Text style={styles.infoText}>
          We're working on bringing full wallet functionality to iOS using
          Privy.
          {'\n\n'}
          Current status: {'\n'}• ✅ App runs on iOS {'\n'}• ✅ Data fetching
          works {'\n'}• 🚧 Wallet features in development {'\n'}• 🔜 Privy
          integration coming soon
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 8,
    marginVertical: 4,
  },
  infoCard: {
    margin: 16,
    backgroundColor: Platform.OS === 'ios' ? '#e3f2fd' : 'transparent',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Platform.OS === 'ios' ? '#1976d2' : undefined,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: Platform.OS === 'ios' ? '#424242' : undefined,
  },
});
