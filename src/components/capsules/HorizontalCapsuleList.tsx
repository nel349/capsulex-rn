import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ProgressBar,
  IconButton,
} from 'react-native-paper';

import type { CapsuleWithStatus } from '../../services/capsuleApi';
import { CapsuleApiService } from '../../services/capsuleApi';
import { colors, typography, spacing, borderRadius, shadows, components } from '../../theme';

// Enhanced capsule type that merges blockchain and database data
interface EnhancedCapsule extends CapsuleWithStatus {
  databaseData?: any; // Additional database fields including content_encrypted
}

type RootStackParamList = {
  CapsuleDetails: { capsule: EnhancedCapsule };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HorizontalCapsuleListProps {
  title: string;
  capsules: EnhancedCapsule[];
  type: 'ready' | 'pending' | 'revealed';
  onRevealCapsule?: (capsule: CapsuleWithStatus) => void;
  revealingCapsules?: Set<string>;
  glowAnim?: Animated.Value;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.75; // 75% of screen width
const CARD_SPACING = spacing.md;

export function HorizontalCapsuleList({
  title,
  capsules,
  type,
  onRevealCapsule,
  revealingCapsules = new Set(),
  glowAnim,
}: HorizontalCapsuleListProps) {
  const navigation = useNavigation<NavigationProp>();

  // Sort capsules chronologically (earliest reveal date first)
  const sortedCapsules = [...capsules].sort((a, b) => {
    return a.account.revealDate - b.account.revealDate;
  });

  const renderCapsuleCard = (capsule: EnhancedCapsule, index: number) => {
    const isRevealing = revealingCapsules.has(capsule.publicKey);
    const timeLeft = capsule.timeToReveal || 0;
    const progress = CapsuleApiService.getCountdownProgress(
      capsule.account.createdAt,
      capsule.account.revealDate
    );

    return (
      <Animated.View
        key={capsule.publicKey}
        style={[
          styles.cardContainer,
          type === 'ready' && {
            transform: [{ scale: 1 }],
            shadowColor: colors.premiumOrange,
            shadowOpacity: glowAnim || 0.5,
            shadowRadius: 16,
            elevation: 12,
          },
          isRevealing && styles.revealingCard,
        ]}
      >
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('CapsuleDetails', { capsule: capsule })
          }
          activeOpacity={0.9}
        >
          <Card style={[styles.card, getCardStyle(type)]}>
            <Card.Content style={styles.cardContent}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <Chip
                  mode="flat"
                  style={getChipStyle(type)}
                  textStyle={styles.chipText}
                >
                  {getChipLabel(type)}
                </Chip>
                {type === 'revealed' && (
                  <IconButton
                    icon="share"
                    size={20}
                                         iconColor={colors.text}
                    onPress={() => console.log('Share capsule')}
                  />
                )}
              </View>

              {/* Capsule Preview */}
              <View style={styles.contentPreview}>
                <Text variant="bodySmall" style={styles.contentLabel}>
                  {getContentLabel(capsule)}
                </Text>
                <Text variant="bodyMedium" style={[styles.contentText, getContentTextStyle(capsule)]}>
                  {getContentPreview(capsule)}
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
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (sortedCapsules.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Title */}
      <View style={styles.titleContainer}>
        <Text variant="titleLarge" style={[styles.title, getTitleStyle(type)]}>
          {title} ({sortedCapsules.length})
        </Text>
      </View>

      {/* Horizontal Scrolling List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
      >
        {sortedCapsules.map((capsule, index) => renderCapsuleCard(capsule, index))}
        {/* Add spacing at the end */}
        <View style={styles.endSpacing} />
      </ScrollView>
    </View>
  );
}

// Helper function to get content preview
const getContentPreview = (capsule: EnhancedCapsule): string => {
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
const getContentLabel = (capsule: EnhancedCapsule): string => {
  if (capsule.databaseData?.content_encrypted) {
    return 'Content Preview:';
  }
  
  if (capsule.account.encryptedContent) {
    return 'Encrypted Content:';
  }
  
  return 'Content Status:';
};

// Helper function to get content text styling
const getContentTextStyle = (capsule: EnhancedCapsule) => {
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

// Helper functions for dynamic styling
const getCardStyle = (type: 'ready' | 'pending' | 'revealed') => {
  switch (type) {
    case 'ready':
      return styles.readyCard;
    case 'pending':
      return styles.pendingCard;
    case 'revealed':
      return styles.revealedCard;
    default:
      return styles.defaultCard;
  }
};

const getChipStyle = (type: 'ready' | 'pending' | 'revealed') => {
  switch (type) {
    case 'ready':
      return styles.readyChip;
    case 'pending':
      return styles.pendingChip;
    case 'revealed':
      return styles.revealedChip;
    default:
      return styles.defaultChip;
  }
};

const getChipLabel = (type: 'ready' | 'pending' | 'revealed') => {
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

const getTitleStyle = (type: 'ready' | 'pending' | 'revealed') => {
  switch (type) {
    case 'ready':
      return { color: colors.premiumOrange };
    case 'pending':
      return { color: colors.warning };
    case 'revealed':
      return { color: colors.success };
    default:
      return { color: colors.text };
  }
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  titleContainer: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingLeft: spacing.screenPadding,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
  },
  card: {
    ...components.premiumCard,
    height: 240, // Fixed height for consistency
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  
  // Card Type Styles
  readyCard: {
    borderColor: colors.premiumOrange,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  pendingCard: {
    borderColor: colors.warning,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  revealedCard: {
    borderColor: colors.success,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  defaultCard: {
    backgroundColor: colors.surface,
  },
  
  // Header Section
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  // Chip Styles
  readyChip: {
    backgroundColor: colors.premiumOrange,
  },
  pendingChip: {
    backgroundColor: colors.warning,
  },
  revealedChip: {
    backgroundColor: colors.success,
  },
  defaultChip: {
    backgroundColor: colors.surface,
  },
  chipText: {
    ...typography.labelSmall,
    color: colors.text,
    fontWeight: 'bold',
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
  
  // States
  revealingCard: {
    opacity: 0.7,
  },
  
  // Spacing
  endSpacing: {
    width: spacing.screenPadding,
  },
}); 