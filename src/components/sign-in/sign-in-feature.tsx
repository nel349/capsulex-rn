import { View, StyleSheet } from 'react-native';

import {
  ConnectButton,
  SignInButton,
  PrivyConnectButton,
  PlatformInfo,
} from './sign-in-ui';

export function SignInFeature() {
  return (
    <>
      <PlatformInfo />
      <View style={styles.buttonGroup}>
        <ConnectButton />
        <SignInButton />
      </View>
      <View style={styles.buttonGroup}>
        <PrivyConnectButton />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    marginTop: 16,
    flexDirection: 'row',
  },
});
