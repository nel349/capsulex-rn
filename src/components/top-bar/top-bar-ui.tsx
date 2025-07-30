import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, Alert, View } from 'react-native';
import { IconButton, Menu } from 'react-native-paper';

import { dynamicClient } from '../../../App';
import { useAuthorization } from '../../utils/useAuthorization';
import { useCluster } from '../cluster/cluster-data-access';

export function TopBarWalletButton() {
  // const { connect } = useDualAuth();
  return (
    <View>
      {/* add a button here that says "Connect" and when pressed, it will connect the wallet */}
    </View>
  );
}

export function TopBarPrivyButton() {
  const handlePrivyConnect = async () => {
    try {
      await dynamicClient.ui.auth.show();
      // Alert.alert('Success', 'Successfully connected with Privy!');
    } catch (error) {
      Alert.alert('Login Error', 'Failed to connect with Privy');
    }
  };

  return (
    <IconButton
      icon="account-plus"
      mode="contained-tonal"
      disabled={false}
      onPress={handlePrivyConnect}
    />
  );
}

export function TopBarSettingsButton() {
  const navigation = useNavigation();
  return (
    <IconButton
      icon="cog"
      mode="contained-tonal"
      onPress={() => {
        navigation.navigate('NetworkSettings');
      }}
    />
  );
}

export function TopBarWalletMenu() {
  const { selectedAccount } = useAuthorization();
  const { getExplorerUrl } = useCluster();
  const [visible, setVisible] = useState(false);
  const closeMenu = () => setVisible(false);
  // const { disconnect } = useMobileWallet();

  const copyAddressToClipboard = async () => {
    if (selectedAccount) {
      await Clipboard.setStringAsync(selectedAccount.publicKey.toBase58());
    }
    closeMenu();
  };

  const viewExplorer = () => {
    if (selectedAccount) {
      const explorerUrl = getExplorerUrl(
        `account/${selectedAccount.publicKey.toBase58()}`
      );
      Linking.openURL(explorerUrl);
    }
    closeMenu();
  };

  return (
    <Menu
      visible={visible}
      onDismiss={closeMenu}
      anchor={<TopBarWalletButton />}
    >
      <Menu.Item
        onPress={copyAddressToClipboard}
        title="Copy address"
        leadingIcon="content-copy"
      />
      <Menu.Item
        onPress={viewExplorer}
        title="View Explorer"
        leadingIcon="open-in-new"
      />
      {/* <Menu.Item
        onPress={async () => {
          await disconnect();
          closeMenu();
        }}
        title="Disconnect"
        leadingIcon="link-off"
      /> */}
    </Menu>
  );
}
