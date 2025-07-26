import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, Alert } from 'react-native';
import { Button, IconButton, Menu } from 'react-native-paper';

import { dynamicClient } from '../../../App';
import { ellipsify } from '../../utils/ellipsify';
import type { Account } from '../../utils/useAuthorization';
import { useAuthorization } from '../../utils/useAuthorization';
import { useMobileWallet } from '../../utils/useMobileWallet';
import { useCluster } from '../cluster/cluster-data-access';

export function TopBarWalletButton({
  selectedAccount,
  openMenu,
}: {
  selectedAccount: Account | null;
  openMenu: () => void;
}) {
  const { connect } = useMobileWallet();
  return (
    <Button
      icon="wallet"
      mode="contained-tonal"
      style={{ alignSelf: 'center' }}
      onPress={selectedAccount ? openMenu : connect}
    >
      {selectedAccount
        ? ellipsify(selectedAccount.publicKey.toBase58())
        : 'Connect'}
    </Button>
  );
}

export function TopBarPrivyButton() {
  const handlePrivyConnect = async () => {
    try {
      await dynamicClient.ui.auth.show();
      // Alert.alert('Success', 'Successfully connected with Privy!');
    } catch (error) {
      console.error('Privy login error:', error);
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
        navigation.navigate('Settings');
      }}
    />
  );
}

export function TopBarWalletMenu() {
  const { selectedAccount } = useAuthorization();
  const { getExplorerUrl } = useCluster();
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);
  const { disconnect } = useMobileWallet();

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
      anchor={
        <TopBarWalletButton
          selectedAccount={selectedAccount}
          openMenu={openMenu}
        />
      }
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
      <Menu.Item
        onPress={async () => {
          await disconnect();
          closeMenu();
        }}
        title="Disconnect"
        leadingIcon="link-off"
      />
    </Menu>
  );
}
