import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';

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

  const renderCapsuleCard = (capsule: EnhancedCapsule, _index: number) => {
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
        {sortedCapsules.map((capsule, index) =>
          renderCapsuleCard(capsule, index)
        )}
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
  },
  scrollContainer: {
    paddingLeft: spacing.screenPadding,
  },
  endSpacing: {
    width: spacing.screenPadding,
  },
});
