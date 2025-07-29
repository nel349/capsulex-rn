import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';

import { CapsuleApiService } from '../../services/capsuleApi';
import { colors, spacing, typography, borderRadius } from '../../theme';

import type { CapsuleCardBaseProps } from './types';

interface CapsuleCardContentProps extends CapsuleCardBaseProps {}

export function CapsuleCardContent({ capsule, type }: CapsuleCardContentProps) {
  // Debug logging to understand capsule data structure
  if (__DEV__) {
    // console.log(`🔍 CapsuleCardContent [${type}] - ${capsule.publicKey}:`, {
    //   hasContentStorage: !!capsule.account?.contentStorage?.text,
    //   contentStorageType: typeof capsule.account?.contentStorage?.text,
    //   hasDatabaseContent: !!capsule.databaseData?.content_encrypted,
    //   hasBlockchainContent: !!capsule.account?.encryptedContent,
    //   isRevealed: capsule.account?.isRevealed,
    //   status: capsule.status,
    // });
  }

  // Helper function to get content preview
  const getContentPreview = (): string => {
    // First, try to get actual text content from contentStorage
    if (capsule.account?.contentStorage?.text) {
      const textContent = capsule.account.contentStorage.text;

      // Handle different text content structures
      if (typeof textContent === 'string') {
        return textContent.length > 120
          ? `${textContent.substring(0, 120)}...`
          : textContent;
      } else if (typeof textContent === 'object' && textContent.content) {
        const content = textContent.content;
        return content.length > 120
          ? `${content.substring(0, 120)}...`
          : content;
      } else if (typeof textContent === 'object' && textContent.text) {
        const content = textContent.text;
        return content.length > 120
          ? `${content.substring(0, 120)}...`
          : content;
      }
    }

    // For revealed capsules, show professional messages
    if (type === 'revealed') {
      if (capsule.databaseData?.content_encrypted) {
        try {
          const parsed = JSON.parse(capsule.databaseData.content_encrypted);
          if (parsed.encryptedData) {
            return 'This time capsule has been revealed and is ready for decryption.';
          }
        } catch {
          return 'This time capsule content is now available for viewing.';
        }
      }
      return 'This time capsule has been successfully revealed. Tap to view the full content.';
    }

    // For ready capsules, show professional message
    if (type === 'ready') {
      return 'This time capsule is ready to be revealed. Tap the reveal button to unlock the stored content.';
    }

    // For pending capsules, show professional message
    if (type === 'pending') {
      const timeLeft = getTimeUntilReveal();
      if (capsule.databaseData?.content_encrypted) {
        return `Your encrypted content is securely stored. Reveals in ${timeLeft}.`;
      }
      return `This time capsule will be available for reveal in ${timeLeft}.`;
    }

    // Final fallback
    return `Time capsule created on ${new Date(capsule.account.createdAt * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  };

  // Helper function to get content text styling
  const getContentTextStyle = () => {
    // If we have actual readable text content, use primary text styling
    if (capsule.account?.contentStorage?.text) {
      return {
        color: colors.text,
        fontWeight: '400' as const,
      };
    }

    // If we have encrypted database content
    if (capsule.databaseData?.content_encrypted) {
      try {
        const parsed = JSON.parse(capsule.databaseData.content_encrypted);
        if (parsed.encryptedData) {
          return {
            color: colors.textSecondary,
            fontStyle: 'italic' as const,
            opacity: 0.9,
          };
        }
      } catch {
        // Plain text in database
        return { color: colors.text };
      }
    }

    // If we have blockchain content (hash)
    if (capsule.account?.encryptedContent) {
      const content = capsule.account.encryptedContent;
      if (content.length > 40 && /^[a-f0-9]+$/i.test(content)) {
        return {
          color: colors.textSecondary,
          fontStyle: 'italic' as const,
          opacity: 0.8,
          fontSize: 12,
        };
      }
      return {
        color: colors.textSecondary,
        fontStyle: 'italic' as const,
        opacity: 0.9,
      };
    }

    // For fallback messages, use bright colors based on type
    if (type === 'revealed') {
      return {
        color: colors.success,
        fontStyle: 'italic' as const,
        fontWeight: '500' as const,
      };
    } else if (type === 'ready') {
      return {
        color: colors.premiumOrange,
        fontStyle: 'italic' as const,
        fontWeight: '500' as const,
      };
    } else {
      return {
        color: colors.textSecondary,
        fontStyle: 'italic' as const,
      };
    }
  };

  // Helper function to get time until reveal
  const getTimeUntilReveal = (): string => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = capsule.account.revealDate - now;

    if (timeLeft <= 0) return 'Ready now!';

    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Capsule Metadata */}
      <View style={styles.metadataSection}>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>ID:</Text>
          <Text style={styles.metadataValue}>
            {capsule.databaseData?.capsule_id
              ? capsule.databaseData.capsule_id.slice(0, 8) +
                '...' +
                capsule.databaseData.capsule_id.slice(-4)
              : capsule.publicKey.slice(0, 8) +
                '...' +
                capsule.publicKey.slice(-4)}
          </Text>
        </View>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>CREATED:</Text>
          <Text style={styles.metadataValue}>
            {new Date(capsule.account.createdAt * 1000).toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }
            )}
          </Text>
        </View>
      </View>

      {/* Content Preview */}
      <View style={styles.contentPreview}>
        <Text
          variant="bodyMedium"
          style={[styles.contentText, getContentTextStyle()]}
        >
          {getContentPreview()}
        </Text>
      </View>

      {/* Reveal Date Section - only show for pending and revealed cards */}
      {type !== 'ready' && (
        <View style={styles.dateSection}>
          <Text variant="bodySmall" style={styles.dateLabel}>
            {type === 'revealed' ? 'REVEALED ON:' : 'REVEALS ON:'}
          </Text>
          <Text variant="titleSmall" style={styles.dateText}>
            {new Date(capsule.account.revealDate * 1000).toLocaleDateString(
              'en-US',
              {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }
            )}
          </Text>
          {type === 'pending' && (
            <View style={styles.progressSection}>
              <Text style={styles.countdownText}>
                {getTimeUntilReveal()} remaining
              </Text>
              <ProgressBar
                progress={CapsuleApiService.getCountdownProgress(
                  capsule.account.createdAt,
                  capsule.account.revealDate
                )}
                style={styles.progressBar}
                color={colors.primary}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 180,
  },

  // Metadata Section
  metadataSection: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  metadataLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'monospace',
  },

  // Content Preview
  contentPreview: {
    marginBottom: spacing.md,
    minHeight: 70,
  },
  contentText: {
    ...typography.bodyMedium,
    color: colors.text, // Use primary text color for better visibility
    lineHeight: 20,
    fontSize: 14,
  },

  // Date Section
  dateSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  dateLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary, // Brighter for better contrast
    marginBottom: spacing.xs / 2,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateText: {
    ...typography.titleSmall,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  countdownText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontSize: 11,
    fontWeight: '500',
    marginTop: spacing.xs / 2,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  progressSection: {
    marginTop: spacing.xs / 2,
  },
  progressBar: {
    height: 4,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.borderLight,
  },
});
