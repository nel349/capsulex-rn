import { Video, ResizeMode } from 'expo-av';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useSnackbar } from '../../hooks/useSnackbar';
import { colors, typography, spacing, components, layout } from '../../theme';
import { AppSnackbar } from '../ui/AppSnackbar';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  // snackbar for errors
  const { snackbar, hideSnackbar } = useSnackbar();

  // State to control video rendering and playback to ensure main thread initialization
  const [showVideo, setShowVideo] = useState(false);
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false);

  useEffect(() => {
    // Delay video initialization to ensure we're on the main thread
    const timer = setTimeout(() => {
      setShowVideo(true);
      // Additional delay for Android to start playback safely
      if (Platform.OS === 'android') {
        const playTimer = setTimeout(() => {
          setShouldPlayVideo(true);
        }, 200);
        return () => clearTimeout(playTimer);
      } else {
        setShouldPlayVideo(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {showVideo && (
        <Video
          style={styles.backgroundVideo}
          source={require('../../../assets/capsulex-5-video.mp4')}
          shouldPlay={shouldPlayVideo}
          isLooping
          isMuted
          resizeMode={ResizeMode.COVER}
        />
      )}
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text variant="displayMedium" style={styles.title}>
            CapsuleX
          </Text>
        </View>
        <AppSnackbar
          visible={snackbar.visible}
          message={snackbar.message}
          type={snackbar.type}
          onDismiss={hideSnackbar}
        />
        <View style={styles.ctaContainer}>
          <Button
            mode="contained"
            onPress={onGetStarted}
            style={styles.getStartedButton}
            contentStyle={styles.buttonContent}
          >
            Get Started
          </Button>

          {Platform.OS === 'android' && (
            <View style={styles.signInContainer}>
              <Text variant="bodyMedium" style={styles.signInText}>
                Already have an account?{' '}
                <Text
                  variant="bodyMedium"
                  style={styles.signInLink}
                  onPress={onSignIn}
                >
                  Sign in
                </Text>
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    padding: spacing.sectionPadding,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxxl + spacing.xl, // 100px equivalent
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    ...typography.displayLarge,
    textAlign: 'center',
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  ctaContainer: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    ...layout.premiumSpacing,
  },
  getStartedButton: {
    width: '100%',
    maxWidth: 300,
    marginBottom: spacing.md,
    ...components.primaryButton,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    paddingVertical: spacing.md,
  },
  signInContainer: {
    marginBottom: spacing.md,
  },
  signInText: {
    ...typography.bodyMedium,
    textAlign: 'center',
    color: colors.text,
  },
  signInLink: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
});
