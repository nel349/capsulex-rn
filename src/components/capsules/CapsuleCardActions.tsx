import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar, Button } from 'react-native-paper';

import type { CapsuleWithStatus } from '../../services/capsuleApi';
import { CapsuleApiService } from '../../services/capsuleApi';
import { colors, spacing, borderRadius, components } from '../../theme';
import type { EnhancedCapsule, CapsuleCardBaseProps } from './types';

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
  const timeLeft = capsule.timeToReveal || 0;
  const progress = CapsuleApiService.getCountdownProgress(
    capsule.account.createdAt,
    capsule.account.revealDate
  );

  return (
    <View style={styles.container}>
      {/* Progress Bar for Pending */}
      {type === 'pending' && (
        <View style={styles.progressSection}>
          <Text variant="bodySmall" style={styles.progressLabel}>
            {CapsuleApiService.formatTimeUntil(timeLeft)} remaining
          </Text>
          <ProgressBar
            progress={progress}
            style={styles.progressBar}
            color={colors.primary}
          />
        </View>
      )}

      {/* Action Button for Ready Cards */}
      {type === 'ready' && onRevealCapsule && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
  },

  // Progress Section
  progressSection: {
    marginBottom: spacing.md,
  },
  progressLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontSize: 12,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.borderLight,
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
