import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Appbar } from 'react-native-paper';

import { ProfileAvatar } from './ProfileAvatar';
import { colors } from '../../theme/colors';

export function TopBar() {
  return (
    <Appbar.Header mode="small" style={styles.topBar}>
      {/* Profile Avatar - Left */}
      <View style={styles.avatarContainer}>
        <ProfileAvatar size={32} />
      </View>

      {/* Brand Icon - Center */}
      <View style={styles.brandContainer}>
        <Image
          source={require('../../../assets/capsulex-icon.png')}
          style={styles.brandIcon}
          resizeMode="contain"
        />
      </View>
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  topBar: {
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
  },
  avatarContainer: {
    marginLeft: 8,
  },
  brandContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIcon: {
    width: 28,
    height: 28,
  },
});
