import { Video, ResizeMode } from 'expo-av';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useSnackbar } from '../../hooks/useSnackbar';
import { AppSnackbar } from '../ui/AppSnackbar';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  // snackbar for errors
  const { snackbar, hideSnackbar } = useSnackbar();

  return (
    <View style={styles.container}>
      <Video
        style={styles.backgroundVideo}
        source={require('../../../assets/capsulex-5-video.mp4')}
        shouldPlay
        isLooping
        isMuted
        resizeMode={ResizeMode.COVER}
      />
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent overlay
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 100,
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: 'white', // White text for better contrast
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  ctaContainer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  getStartedButton: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  signInContainer: {
    marginBottom: 16,
  },
  signInText: {
    textAlign: 'center',
    color: 'white', // White text for better contrast
  },
  signInLink: {
    color: '#64b5f6', // Lighter blue for better contrast on dark background
    fontWeight: '600',
  },
});
