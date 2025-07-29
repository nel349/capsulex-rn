import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, IconButton } from 'react-native-paper';

import { colors, typography, spacing } from '../../theme';

interface CapsuleCardHeaderProps {
  type: 'ready' | 'pending' | 'revealed';
}

export function CapsuleCardHeader({ type }: CapsuleCardHeaderProps) {
  const getChipStyle = () => {
    switch (type) {
      case 'ready':
        return styles.readyChip;
      case 'pending':
        return styles.pendingChip;
      case 'revealed':
        return styles.revealedChip;
      default:
        return styles.defaultChip;
    }
  };

  const getChipLabel = () => {
    switch (type) {
      case 'ready':
        return '🔥 READY NOW';
      case 'pending':
        return '⏳ Pending';
      case 'revealed':
        return '✅ Revealed';
      default:
        return 'Unknown';
    }
  };

  return (
    <View style={styles.header}>
      <Chip
        mode="flat"
        style={getChipStyle()}
        textStyle={styles.chipText}
      >
        {getChipLabel()}
      </Chip>
      {type === 'revealed' && (
        <IconButton
          icon="share"
          size={20}
          iconColor={colors.text}
          onPress={() => console.log('Share capsule')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  // Chip Styles
  readyChip: {
    backgroundColor: colors.premiumOrange,
  },
  pendingChip: {
    backgroundColor: colors.warning,
  },
  revealedChip: {
    backgroundColor: colors.success,
  },
  defaultChip: {
    backgroundColor: colors.surface,
  },
  chipText: {
    ...typography.labelSmall,
    color: colors.text,
    fontWeight: 'bold',
  },
}); 