import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useDualAuth } from '../../providers/DualAuthProvider';
import { dynamicClientService } from '../../services/dynamicClientService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  const navigation = useNavigation();
  const { walletAddress, userName } = useDualAuth();


  // for ios, we should check if the user is authenticated and take the user to the home screen
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('auth-token');

      console.log('🔍 token', token);
      if (token) {
        navigation.navigate('HomeStack' as never);
      }
    };
    if (Platform.OS === 'ios') {
      console.log('🔍 Checking auth for ios');
      console.log('🔍 userName', userName);
      console.log('🔍 walletAddress', walletAddress);
      checkAuth();
    }
  }, [userName, walletAddress]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="displayMedium" style={styles.title}>
          Welcome to CapsuleX
        </Text>
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
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
  },
  signInLink: {
    color: '#1976d2',
    fontWeight: '600',
  },
});
