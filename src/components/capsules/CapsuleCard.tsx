import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Card } from 'react-native-paper';
import Animated, { useAnimatedStyle, interpolateColor, interpolate } from 'react-native-reanimated';

import type { CapsuleWithStatus } from '../../services/capsuleApi';
import { colors, spacing, components } from '../../theme';

import { CapsuleCardActions } from './CapsuleCardActions';
import { CapsuleCardContent } from './CapsuleCardContent';
import { CapsuleCardHeader } from './CapsuleCardHeader';
import type { EnhancedCapsule } from './types';

type RootStackParamList = {
  CapsuleDetails: { capsule: EnhancedCapsule };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CapsuleCardProps {
  capsule: EnhancedCapsule;
  type: 'ready' | 'pending' | 'revealed';
  isRevealing: boolean;
  onRevealCapsule?: (capsule: CapsuleWithStatus) => void;
  glowAnim?: Animated.SharedValue<number>;
  width: number;
}

export function CapsuleCard({
  capsule,
  type,
  isRevealing,
  onRevealCapsule,
  glowAnim,
  width,
}: CapsuleCardProps) {
  const navigation = useNavigation<NavigationProp>();

  const getCardStyle = () => {
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

  // Animated styles for platform-specific glow
  const animatedStyle = useAnimatedStyle(() => {
    if (type !== 'ready' || !glowAnim) return {};

    if (Platform.OS === 'ios') {
      // iOS: Animate shadow opacity
      return {
        shadowOpacity: glowAnim.value,
      };
    } else {
      // Android: Animate background color and elevation to create a diffused glow effect.
      // Elevation creates a shadow, and we're animating its size and the wrapper's background color.
      // shadowColor is for Android API 28+ to color the shadow itself.
      const backgroundColor = interpolateColor(
        glowAnim.value,
        [0.3, 1],
        ['rgba(255, 107, 53, 0.1)', 'rgba(255, 107, 53, 0.4)']
      );
      const elevation = interpolate(glowAnim.value, [0.3, 1], [8, 20]);

      return {
        backgroundColor,
        elevation,
        shadowColor: colors.premiumOrange,
      };
    }
  });

  return (
    <Animated.View
      style={[
        { width },
        styles.cardContainer,
        { margin: spacing.sm }, // Add margin here to give space for shadow/border
        // Base styles for ready cards
        type === 'ready' && Platform.OS === 'ios' && styles.iosGlowWrapper,
        type === 'ready' &&
          Platform.OS === 'android' &&
          styles.androidGlowWrapper,
        // Animated styles on top
        type === 'ready' && animatedStyle,
        isRevealing && styles.revealingCard,
      ]}
    >
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('CapsuleDetails', { capsule: capsule })
        }
        activeOpacity={0.9}
      >
        <Card
          style={[
            styles.card,
            getCardStyle(),
            // On Android, add a margin to the card to reveal the animated glow from the wrapper
            Platform.OS === 'android' &&
              type === 'ready' && { margin: 12, borderRadius: 6 },
          ]}
        >
          <Card.Content style={styles.cardContent}>
            <CapsuleCardHeader type={type} />
            <CapsuleCardContent capsule={capsule} type={type} />
            <CapsuleCardActions
              capsule={capsule}
              type={type}
              isRevealing={isRevealing}
              onRevealCapsule={onRevealCapsule}
            />
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginRight: spacing.md,
  },
  card: {
    ...components.premiumCard,
    minHeight: 400, // Minimum height, but can grow
    overflow: 'visible',
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },

  // Card Type Styles
  readyCard: {
    ...components.readyCard,
  },
  pendingCard: {
    ...components.pendingCard,
  },
  revealedCard: {
    ...components.revealedCard,
  },
  defaultCard: {
    backgroundColor: colors.surface,
  },

  // Platform-specific glow wrappers
  iosGlowWrapper: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    shadowColor: colors.premiumOrange,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    // shadowOpacity will be animated
  },
  androidGlowWrapper: {
    borderRadius: 16,
    // The backgroundColor will be animated to create the glow
  },

  // States
  revealingCard: {
    opacity: 0.7,
  },
});
