import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import type { CapsuleWithStatus } from '../../services/capsuleApi';
import { colors, spacing } from '../../theme';

// Enhanced capsule type that merges blockchain and database data
interface EnhancedCapsule extends CapsuleWithStatus {
  databaseData?: any; // Additional database fields including content_encrypted
}

interface CapsuleCardContentProps {
  capsule: EnhancedCapsule;
  type: 'ready' | 'pending' | 'revealed';
}

export function CapsuleCardContent({ capsule, type }: CapsuleCardContentProps) {
  // Helper function to get content preview
  const getContentPreview = (): string => {
    // First try to get content from database (decrypted/human-readable)
    if (capsule.databaseData?.content_encrypted) {
      const content = capsule.databaseData.content_encrypted;
      if (content.length > 80) {
        return `${content.substring(0, 80)}...`;
      }
      return content;
    }
    
    // Fallback to blockchain encrypted content (usually not human-readable)
    if (capsule.account.encryptedContent) {
      const content = capsule.account.encryptedContent;
      if (content.length > 30) {
        return `${content.substring(0, 30)}... [encrypted]`;
      }
      return `${content} [encrypted]`;
    }
    
    // No content available
    return 'Content will be available after creation...';
  };

  // Helper function to get content label
  const getContentLabel = (): string => {
    if (capsule.databaseData?.content_encrypted) {
      return 'Content Preview:';
    }
    
    if (capsule.account.encryptedContent) {
      return 'Encrypted Content:';
    }
    
    return 'Content Status:';
  };

  // Helper function to get content text styling
  const getContentTextStyle = () => {
    if (capsule.databaseData?.content_encrypted) {
      return { color: colors.textSecondary };
    }
    
    if (capsule.account.encryptedContent) {
      return { 
        color: colors.textTertiary,
        fontStyle: 'italic' as const,
        opacity: 0.8
      };
    }
    
    return { 
      color: colors.textTertiary,
      fontStyle: 'italic' as const
    };
  };

  return (
    <View style={styles.container}>
      {/* Content Preview */}
      <View style={styles.contentPreview}>
        <Text variant="bodySmall" style={styles.contentLabel}>
          {getContentLabel()}
        </Text>
        <Text variant="bodyMedium" style={[styles.contentText, getContentTextStyle()]}>
          {getContentPreview()}
        </Text>
      </View>

      {/* Date and Time Info */}
      <View style={styles.dateSection}>
        <Text variant="bodySmall" style={styles.dateLabel}>
          {type === 'revealed' ? 'Revealed on:' : 'Reveals on:'}
        </Text>
        <Text variant="titleSmall" style={styles.dateText}>
          {new Date(capsule.account.revealDate * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Content Preview
  contentPreview: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  contentLabel: {
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  contentText: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  
  // Date Section
  dateSection: {
    marginBottom: spacing.sm,
  },
  dateLabel: {
    color: colors.textTertiary,
    marginBottom: spacing.xs / 2,
  },
  dateText: {
    color: colors.text,
  },
}); 