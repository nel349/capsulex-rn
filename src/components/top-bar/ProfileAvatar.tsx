import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from 'react-native-paper';

import { useDualAuth } from '../../providers';
import { colors } from '../../theme';

type RootStackParamList = {
  Profile: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ProfileAvatarProps {
  size?: number;
}

export function ProfileAvatar({ size = 32 }: ProfileAvatarProps) {
  const navigation = useNavigation<NavigationProp>();
  const { walletAddress, userName } = useDualAuth();

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const getProfileInitials = (): string => {
    if (userName && userName !== 'User') {
      return userName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (walletAddress) {
      return walletAddress.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <TouchableOpacity
      onPress={handleProfilePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Avatar.Image
        size={size}
        source={{ uri: 'https://xsgames.co/randomusers/avatar.php?g=pixel' }}
        style={styles.avatar}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    // No additional styling needed for container
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
