import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar, Button } from 'react-native-paper';

import type { CapsuleWithStatus } from '../../services/capsuleApi';
import { CapsuleApiService } from '../../services/capsuleApi';
import { colors, spacing, borderRadius } from '../../theme';

// Enhanced capsule type that merges blockchain and database data
interface EnhancedCapsule extends CapsuleWithStatus {
  databaseData?: any; // Additional database fields including content_encrypted
}

interface CapsuleCardActionsProps {
  capsule: EnhancedCapsule;
  type: 'ready' | 'pending' | 'revealed';
  isRevealing: boolean;
  onRevealCapsule?: (capsule: CapsuleWithStatus) => void;
}

export function CapsuleCardActions({ 
  capsule, 
  type, 
  isRevealing, 
  onRevealCapsule 
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
    // Empty container allows for consistent spacing
  },
  
  // Progress Section
  progressSection: {
    marginBottom: spacing.sm,
  },
  progressLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 4,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.borderLight,
  },
  
  // Action Button
  revealButton: {
    marginTop: spacing.sm,
  },
  revealButtonContent: {
    paddingVertical: spacing.xs,
  },
}); 