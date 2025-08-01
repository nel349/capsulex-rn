import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { Text, Button, Card } from 'react-native-paper';

import { colors, typography, spacing, shadows } from '../../theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface TourStep {
  id: string;
  title: string;
  description: string;
  icon?: string;
  targetComponent?: string;
  position?: 'top' | 'bottom' | 'center';
  action?: () => void;
  actionText?: string;
  skipable?: boolean;
}

interface TourGuideProps {
  steps: TourStep[];
  visible: boolean;
  onComplete: () => void;
  onSkip?: () => void;
  tourId: string; // Unique identifier for this tour
}

const TOUR_STORAGE_KEY = '@capsulex_tours_completed';

export function TourGuide({
  steps,
  visible,
  onComplete,
  onSkip,
  tourId,
}: TourGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  useEffect(() => {
    setIsVisible(visible);
    if (visible) {
      showModal();
    }
  }, [visible]);

  const showModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      callback && callback();
    });
  };

  const handleNext = () => {
    if (currentStep.action) {
      currentStep.action();
    }

    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    hideModal(() => {
      markTourAsCompleted();
      onSkip && onSkip();
    });
  };

  const handleComplete = () => {
    hideModal(() => {
      markTourAsCompleted();
      onComplete();
    });
  };

  const markTourAsCompleted = async () => {
    try {
      const completedTours = await getCompletedTours();
      completedTours.push(tourId);
      await AsyncStorage.setItem(
        TOUR_STORAGE_KEY,
        JSON.stringify(completedTours)
      );
    } catch (error) {
      console.error('Failed to mark tour as completed:', error);
    }
  };

  const getProgressPercentage = () => {
    return ((currentStepIndex + 1) / steps.length) * 100;
  };

  if (!isVisible || !currentStep) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <StatusBar translucent backgroundColor="rgba(0,0,0,0.7)" />

        {/* Dark overlay */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />

        {/* Tour Content */}
        <Animated.View
          style={[
            styles.contentContainer,
            currentStep.position === 'top' && styles.contentTop,
            currentStep.position === 'bottom' && styles.contentBottom,
            currentStep.position === 'center' && styles.contentCenter,
            {
              transform: [
                { scale: scaleAnim },
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
              opacity: fadeAnim,
            },
          ]}
        >
          <Card style={styles.tourCard}>
            <Card.Content style={styles.cardContent}>
              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${getProgressPercentage()}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {currentStepIndex + 1} of {steps.length}
                </Text>
              </View>

              {/* Icon */}
              {currentStep.icon && (
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcon
                    name={currentStep.icon as any}
                    size={48}
                    color={colors.primary}
                  />
                </View>
              )}

              {/* Title */}
              <Text style={styles.title}>{currentStep.title}</Text>

              {/* Description */}
              <Text style={styles.description}>{currentStep.description}</Text>

              {/* Action buttons */}
              <View style={styles.buttonContainer}>
                {!isFirstStep && (
                  <Button
                    mode="outlined"
                    onPress={handlePrevious}
                    style={styles.secondaryButton}
                    compact
                  >
                    Previous
                  </Button>
                )}

                <View style={styles.primaryButtonContainer}>
                  {currentStep.skipable !== false && !isLastStep && (
                    <Button
                      mode="text"
                      onPress={handleSkip}
                      style={styles.skipButton}
                      compact
                    >
                      Skip Tour
                    </Button>
                  )}

                  <Button
                    mode="contained"
                    onPress={handleNext}
                    style={styles.primaryButton}
                  >
                    {isLastStep
                      ? 'Get Started!'
                      : currentStep.actionText || 'Next'}
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Utility function to check if a tour has been completed
export const hasCompletedTour = async (tourId: string): Promise<boolean> => {
  try {
    const completedTours = await getCompletedTours();
    return completedTours.includes(tourId);
  } catch (error) {
    console.error('Failed to check tour completion:', error);
    return false;
  }
};

// Utility function to get completed tours
export const getCompletedTours = async (): Promise<string[]> => {
  try {
    const completed = await AsyncStorage.getItem(TOUR_STORAGE_KEY);
    return completed ? JSON.parse(completed) : [];
  } catch (error) {
    console.error('Failed to get completed tours:', error);
    return [];
  }
};

// Utility function to reset tours (for development/testing)
export const resetTours = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOUR_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset tours:', error);
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  contentContainer: {
    maxWidth: screenWidth - 32,
    minWidth: screenWidth - 64,
  },
  contentTop: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 80,
    left: 16,
    right: 16,
  },
  contentBottom: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: 16,
    right: 16,
  },
  contentCenter: {
    // Default center positioning
  },
  tourCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    ...shadows.large,
    elevation: 8,
  },
  cardContent: {
    padding: spacing.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  primaryButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
  },
  secondaryButton: {
    borderColor: colors.border,
    borderRadius: 8,
  },
  skipButton: {
    paddingHorizontal: 0,
  },
});
