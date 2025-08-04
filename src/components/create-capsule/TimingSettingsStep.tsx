import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';

import { colors, spacing, typography, shadows } from '../../theme';

import type { CreateMode } from './ModeSelectionStep';

interface TimingSettingsStepProps {
  createMode: CreateMode;
  revealDateTime: Date;
  onDateTimePress: () => void;
  solBalance: {
    balance: number;
    sufficient: boolean;
    required: number;
  };
  isGamified?: boolean;
  onContinue: () => void;
}

export const TimingSettingsStep: React.FC<TimingSettingsStepProps> = ({
  createMode,
  revealDateTime,
  onDateTimePress,
  solBalance,
  isGamified = false,
  onContinue,
}) => {
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeFromNow = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'now';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.ceil((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.ceil((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `in ${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    if (hours > 0) {
      return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <View>
      {/* Date/Time Selection */}
      <Button
        mode="outlined"
        onPress={onDateTimePress}
        style={styles.dateTimeButton}
        contentStyle={styles.dateTimeButtonContent}
        icon="calendar-clock"
      >
        <View style={styles.dateTimeInfo}>
          <Text style={styles.dateTimeLabel}>
            {createMode === 'time_capsule'
              ? 'Reveal Date & Time'
              : 'Post Date & Time'}
          </Text>
          <Text style={styles.dateTimeValue}>
            {formatDateTime(revealDateTime)}
          </Text>
          <Text style={styles.dateTimeRelative}>
            {getTimeFromNow(revealDateTime)}
          </Text>
        </View>
      </Button>

      {/* Cost/Balance Information */}
      <Card
        style={[
          styles.balanceCard,
          !solBalance.sufficient && styles.insufficientBalance,
        ]}
      >
        <Card.Content>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>SOL Balance</Text>
            <Text style={styles.balanceAmount}>
              {solBalance.balance.toFixed(6)} SOL
            </Text>
          </View>
          <Text style={styles.balanceInfo}>
            {solBalance.sufficient
              ? createMode === 'time_capsule'
                ? `✅ Sufficient balance for ${isGamified ? 'gamified ' : ''}capsule creation`
                : '✅ Sufficient balance for social post scheduling'
              : `⚠️ Insufficient balance. You need at least ${solBalance.required.toFixed(6)} SOL`}
          </Text>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={onContinue}
        style={styles.continueButton}
        disabled={!solBalance.sufficient}
      >
        Continue to Review
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  dateTimeButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderColor: colors.primary,
  },
  dateTimeButtonContent: {
    height: 'auto',
    paddingVertical: spacing.md,
  },
  dateTimeInfo: {
    alignItems: 'center',
    flex: 1,
  },
  dateTimeLabel: {
    ...typography.labelMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  dateTimeValue: {
    ...typography.titleMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dateTimeRelative: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  balanceCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insufficientBalance: {
    borderColor: colors.error,
    backgroundColor: colors.errorContainer,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  balanceLabel: {
    ...typography.titleSmall,
    color: colors.text,
    fontWeight: '600',
  },
  balanceAmount: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
  balanceInfo: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  continueButton: {
    marginTop: spacing.md,
  },
});
