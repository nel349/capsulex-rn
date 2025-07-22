import { useNavigation } from '@react-navigation/core';
import { StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';

import { TopBarWalletMenu, TopBarPrivyButton } from './top-bar-ui';

export function TopBar() {
  const navigation = useNavigation();

  return (
    <Appbar.Header mode="small" style={styles.topBar}>
      <TopBarWalletMenu />
      <TopBarPrivyButton />
      <Appbar.Action
        icon="cog"
        mode="contained-tonal"
        onPress={() => {
          navigation.navigate('Settings');
        }}
      />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  topBar: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
