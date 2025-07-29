import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { Card } from 'react-native-paper';

import type { CapsuleWithStatus } from '../../services/capsuleApi';
import { colors, spacing, borderRadius, components } from '../../theme';
import { CapsuleCardHeader } from './CapsuleCardHeader';
import { CapsuleCardContent } from './CapsuleCardContent';
import { CapsuleCardActions } from './CapsuleCardActions';

// Enhanced capsule type that merges blockchain and database data
interface EnhancedCapsule extends CapsuleWithStatus {
  databaseData?: any; // Additional database fields including content_encrypted
}

type RootStackParamList = {
  CapsuleDetails: { capsule: EnhancedCapsule };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CapsuleCardProps {
  capsule: EnhancedCapsule;
  type: 'ready' | 'pending' | 'revealed';
  isRevealing: boolean;
  onRevealCapsule?: (capsule: CapsuleWithStatus) => void;
  glowAnim?: Animated.Value;
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

  return (
    <Animated.View
      style={[
        { width },
        styles.cardContainer,
        type === 'ready' && {
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
        <Card style={[styles.card, getCardStyle()]}>
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
  
  // States
  revealingCard: {
    opacity: 0.7,
  },
}); 