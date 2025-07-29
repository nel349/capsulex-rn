import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, IconButton } from 'react-native-paper';

import { colors, typography, spacing, components } from '../../theme';

interface CapsuleCardHeaderProps {
  type: 'ready' | 'pending' | 'revealed';
}

export function CapsuleCardHeader({ type }: CapsuleCardHeaderProps) {
  const getChipStyle = () => {
    const baseChipStyle = {
      minHeight: 36,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };

    switch (type) {
      case 'ready':
        return { ...baseChipStyle, ...styles.readyChip };
      case 'pending':
        return { ...baseChipStyle, ...styles.pendingChip };
      case 'revealed':
        return { ...baseChipStyle, ...styles.revealedChip };
      default:
        return { ...baseChipStyle, ...styles.defaultChip };
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
        textStyle={[
          styles.chipText,
          {
            color: colors.text,
            fontSize: 12,
            fontWeight: 'bold',
          },
        ]}
      >
        {getChipLabel()}
      </Chip>
      {type === 'revealed' && (
        <IconButton
          icon="share"
          size={20}
          iconColor={colors.text}
          onPress={() => {
            // TODO: Implement share functionality
          }}
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
    minHeight: 36,
  },

  // Chip Styles
  readyChip: {
    ...components.chipReady,
  },
  pendingChip: {
    ...components.chipPending,
  },
  revealedChip: {
    ...components.chipSuccess,
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
