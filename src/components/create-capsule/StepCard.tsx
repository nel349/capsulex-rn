import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text } from 'react-native-paper';

import { colors, spacing, typography, shadows } from '../../theme';

interface StepCardProps {
  stepNumber: number;
  title: string;
  summary?: string;
  children?: React.ReactNode;
  isCompleted: boolean;
  isCurrent: boolean;
  isAccessible: boolean;
  onStepPress?: () => void;
}

export const StepCard: React.FC<StepCardProps> = ({
  stepNumber,
  title,
  summary,
  children,
  isCompleted,
  isCurrent,
  isAccessible,
  onStepPress,
}) => {
  return (
    <Card
      style={[
        styles.stepCard,
        isCompleted && styles.completedStepCard,
        isCurrent && styles.currentStepCard,
        !isAccessible && styles.disabledStepCard,
      ]}
    >
      <Card.Content>
        <Pressable 
          onPress={isCompleted && onStepPress ? onStepPress : undefined}
          style={styles.stepHeaderPressable}
        >
          <View style={styles.stepHeader}>
            <View
              style={[
                styles.stepIcon,
                isCompleted && styles.completedStepIcon,
                isCurrent && styles.currentStepIcon,
              ]}
            >
              {isCompleted ? (
                <MaterialCommunityIcon
                  name="check"
                  size={16}
                  color={colors.onPrimary}
                />
              ) : (
                <Text style={styles.stepNumber}>{stepNumber}</Text>
              )}
            </View>
            <Text
              style={[styles.stepTitle, !isAccessible && styles.disabledText]}
            >
              {title}
            </Text>
            {isCompleted && onStepPress && (
              <MaterialCommunityIcon
                name="pencil"
                size={16}
                color={colors.primary}
                style={styles.editIcon}
              />
            )}
          </View>

          {isCompleted && summary && (
            <Text style={styles.stepSummary}>{summary}</Text>
          )}
        </Pressable>

        {isCurrent && children}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  stepCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    ...shadows.small,
  },
  completedStepCard: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.primary,
  },
  currentStepCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  disabledStepCard: {
    opacity: 0.5,
    backgroundColor: colors.surfaceDisabled,
  },
  stepHeaderPressable: {
    marginBottom: spacing.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIcon: {
    marginLeft: 'auto',
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  completedStepIcon: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  currentStepIcon: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  stepNumber: {
    ...typography.labelMedium,
    color: colors.text,
    fontWeight: 'bold',
  },
  stepTitle: {
    ...typography.titleMedium,
    color: colors.text,
    fontWeight: '600',
  },
  stepSummary: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: 44, // Account for icon width + margin
    fontStyle: 'italic',
  },
  disabledText: {
    color: colors.textDisabled,
  },
});
