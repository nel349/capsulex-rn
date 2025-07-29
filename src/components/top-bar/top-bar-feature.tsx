import { useNavigation } from '@react-navigation/core';
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Appbar } from 'react-native-paper';

import { ProfileAvatar } from './ProfileAvatar';

export function TopBar() {
  const navigation = useNavigation();

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
