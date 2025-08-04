import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Text, Button, Switch } from 'react-native-paper';

import { colors, spacing, typography } from '../../theme';

import type { CreateMode } from './ModeSelectionStep';

interface ContentInputStepProps {
  content: string;
  onContentChange: (text: string) => void;
  createMode: CreateMode;
  isGamified?: boolean;
  onGamificationChange?: (enabled: boolean) => void;
  onContinue: () => void;
}

export const ContentInputStep: React.FC<ContentInputStepProps> = ({
  content,
  onContentChange,
  createMode,
  isGamified = false,
  onGamificationChange,
  onContinue,
}) => {
  const maxLength = 280;
  const remainingChars = maxLength - content.length;

  return (
    <View>
      <TextInput
        label={
          createMode === 'time_capsule'
            ? "What's your secret?"
            : 'What do you want to post?'
        }
        value={content}
        onChangeText={onContentChange}
        multiline
        numberOfLines={4}
        maxLength={maxLength}
        style={styles.contentInput}
        textColor={colors.text}
        placeholder={
          createMode === 'time_capsule'
            ? 'Enter your secret message, memory, or prediction...'
            : 'Write your post content...'
        }
      />

      <Text
        style={[
          styles.characterCount,
          remainingChars < 20 && styles.characterCountWarning,
          remainingChars < 0 && styles.characterCountError,
        ]}
      >
        {remainingChars} characters remaining
      </Text>

      {/* Gamification Toggle (time capsule only) */}
      {createMode === 'time_capsule' && onGamificationChange && (
        <View style={styles.gamificationContainer}>
          <View style={styles.gamificationHeader}>
            <Text style={styles.gamificationTitle}>🎮 Gamify This Capsule</Text>
            <Switch value={isGamified} onValueChange={onGamificationChange} />
          </View>
          <Text style={styles.gamificationDescription}>
            Let others guess your secret before it's revealed and compete for
            points!
          </Text>
        </View>
      )}

      <Button
        mode="contained"
        onPress={onContinue}
        style={styles.continueButton}
        disabled={!content.trim() || remainingChars < 0}
      >
        Continue
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  contentInput: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  characterCount: {
    ...typography.bodySmall,
    textAlign: 'right',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  characterCountWarning: {
    color: colors.warning,
  },
  characterCountError: {
    color: colors.error,
  },
  gamificationContainer: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  gamificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  gamificationTitle: {
    ...typography.titleSmall,
    color: colors.text,
    fontWeight: '600',
  },
  gamificationDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  continueButton: {
    marginTop: spacing.md,
  },
});
