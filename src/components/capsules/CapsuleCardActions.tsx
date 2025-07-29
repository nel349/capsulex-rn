import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

import type { CapsuleWithStatus } from '../../services/capsuleApi';
import { colors, spacing, borderRadius } from '../../theme';

import type { CapsuleCardBaseProps } from './types';

interface CapsuleCardActionsProps extends CapsuleCardBaseProps {
  isRevealing: boolean;
  onRevealCapsule?: (capsule: CapsuleWithStatus) => void;
}

export function CapsuleCardActions({
  capsule,
  type,
  isRevealing,
  onRevealCapsule,
}: CapsuleCardActionsProps) {
  // Only render actions section when there's actually content to show
  if (type !== 'ready' || !onRevealCapsule) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        onPress={() => onRevealCapsule(capsule)}
        style={styles.revealButton}
        contentStyle={styles.revealButtonContent}
        loading={isRevealing}
        disabled={isRevealing}
        buttonColor={colors.premiumOrange}
      >
        {isRevealing ? '⏳ Revealing...' : '🚀 REVEAL NOW!'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
  },

  // Action Button
  revealButton: {
    borderRadius: borderRadius.md,
    minHeight: 60,
  },
  revealButtonContent: {
    paddingVertical: spacing.xs,
    minHeight: 60,
  },
});
