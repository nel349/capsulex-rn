import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Icon } from 'react-native-paper';

import type { CapsuleWithStatus } from '../../services/capsuleApi';
import { colors, typography, spacing } from '../../theme';

import { CapsuleCard } from './CapsuleCard';
import type { EnhancedCapsule } from './types';

interface HorizontalCapsuleListProps {
  title: string;
  capsules: EnhancedCapsule[];
  type: 'ready' | 'pending' | 'revealed';
  onRevealCapsule?: (capsule: CapsuleWithStatus) => void;
  revealingCapsules?: Set<string>;
  glowAnim?: any; // Animated.Value
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.8; // Increased to 80% for richer content
const CARD_SPACING = spacing.md;

export function HorizontalCapsuleList({
  title,
  capsules,
  type,
  onRevealCapsule,
  revealingCapsules = new Set(),
  glowAnim,
}: HorizontalCapsuleListProps) {
  // Sort capsules chronologically (earliest reveal date first)
  const sortedCapsules = [...capsules].sort((a, b) => {
    return a.account.revealDate - b.account.revealDate;
  });

  const renderCapsuleCard = (capsule: EnhancedCapsule) => {
    const isRevealing = revealingCapsules.has(capsule.publicKey);

    return (
      <CapsuleCard
        key={capsule.publicKey}
        capsule={capsule}
        type={type}
        isRevealing={isRevealing}
        onRevealCapsule={onRevealCapsule}
        glowAnim={glowAnim}
        width={CARD_WIDTH}
      />
    );
  };

  if (sortedCapsules.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Title */}
      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <Icon
            source={getIconForType(type)}
            size={24}
            color={getTitleStyle(type).color}
          />
          <Text
            variant="titleLarge"
            style={[styles.title, getTitleStyle(type)]}
          >
            {title} ({sortedCapsules.length})
          </Text>
        </View>
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
        {sortedCapsules.map(capsule => renderCapsuleCard(capsule))}
        {/* Add spacing at the end */}
        <View style={styles.endSpacing} />
      </ScrollView>
    </View>
  );
}

// Helper function for section title styling
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

// Helper function for section icons
const getIconForType = (type: 'ready' | 'pending' | 'revealed') => {
  switch (type) {
    case 'ready':
      return 'flash';
    case 'pending':
      return 'clock-outline';
    case 'revealed':
      return 'check-circle';
    default:
      return 'archive';
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleLarge,
  },
  scrollContainer: {
    paddingLeft: spacing.screenPadding,
  },
  endSpacing: {
    width: spacing.screenPadding,
  },
});
