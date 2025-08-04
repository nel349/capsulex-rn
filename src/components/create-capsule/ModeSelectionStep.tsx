import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';

import { colors, spacing, typography } from '../../theme';

export type CreateMode = 'time_capsule' | 'social_post';

interface ModeSelectionStepProps {
  createMode: CreateMode;
  onModeChange: (createMode: CreateMode) => void;
  onContinue: () => void;
}

export const ModeSelectionStep: React.FC<ModeSelectionStepProps> = ({
  createMode,
  onModeChange,
  onContinue,
}) => {
  return (
    <View>
      <View style={styles.modeButtonContainer}>
        <Pressable
          style={[
            styles.modeButton,
            createMode === 'time_capsule' && styles.modeButtonActive,
          ]}
          onPress={() => onModeChange('time_capsule')}
        >
          <MaterialCommunityIcon
            name="package-variant-closed"
            size={24}
            color={
              createMode === 'time_capsule'
                ? colors.primary
                : colors.textSecondary
            }
            style={styles.modeIcon}
          />
          <Text
            style={[
              styles.modeButtonText,
              createMode === 'time_capsule' && styles.modeButtonTextActive,
            ]}
          >
            Time Capsule
          </Text>
          <Text style={styles.modeButtonDescription}>
            Encrypted content stored on blockchain
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.modeButton,
            createMode === 'social_post' && styles.modeButtonActive,
          ]}
          onPress={() => onModeChange('social_post')}
        >
          <MaterialCommunityIcon
            name="calendar-clock"
            size={24}
            color={
              createMode === 'social_post'
                ? colors.primary
                : colors.textSecondary
            }
            style={styles.modeIcon}
          />
          <Text
            style={[
              styles.modeButtonText,
              createMode === 'social_post' && styles.modeButtonTextActive,
            ]}
          >
            Social Post
          </Text>
          <Text style={styles.modeButtonDescription}>Schedule a post to X</Text>
        </Pressable>
      </View>

      <Button
        mode="contained"
        onPress={onContinue}
        style={styles.continueButton}
        disabled={!createMode}
      >
        Continue
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  modeButtonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modeButton: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  modeIcon: {
    marginBottom: spacing.sm,
  },
  modeButtonText: {
    ...typography.titleSmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: colors.primary,
  },
  modeButtonDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  continueButton: {
    marginTop: spacing.md,
  },
});
