import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { Portal, Modal, Text, Button } from 'react-native-paper';

import {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
} from '../../theme';

interface FlashyModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  iconName?: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export function FlashyModal({
  visible,
  onDismiss,
  title,
  message,
  onConfirm,
  loading = false,
  iconName = 'alert-circle',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}: FlashyModalProps) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (visible) {
      // Scale in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Pulse animation for the icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible, scaleAnim, pulseAnim]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalOverlay}
      >
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              isDangerous ? colors.error + '20' : colors.primary + '20',
              colors.surface,
              colors.surface,
            ]}
            locations={[0, 0.3, 1]}
            style={styles.gradientBackground}
          >
            <View style={styles.modalContent}>
              {/* Animated Icon */}
              <Animated.View 
                style={[
                  styles.iconContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    isDangerous ? colors.error : colors.primary,
                    isDangerous ? colors.error + '80' : colors.primary + '80',
                  ]}
                  style={styles.iconGradient}
                >
                  <MaterialCommunityIcon
                    name={iconName as any}
                    size={48}
                    color={colors.surface}
                  />
                </LinearGradient>
              </Animated.View>

              {/* Title with gradient text effect */}
              <View style={styles.titleContainer}>
                <Text style={[
                  styles.title,
                  isDangerous && styles.dangerousTitle
                ]}>
                  {title}
                </Text>
                <View style={[
                  styles.titleUnderline,
                  isDangerous && styles.dangerousUnderline
                ]} />
              </View>

              {/* Message */}
              <View style={styles.messageContainer}>
                {message.split('\n').map((line, index) => (
                  <Text key={index} style={styles.messageLine}>
                    {line}
                  </Text>
                ))}
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  onPress={onDismiss}
                  style={[styles.button, styles.cancelButton]}
                  labelStyle={styles.cancelButtonText}
                  disabled={loading}
                >
                  {cancelText}
                </Button>
                <LinearGradient
                  colors={[
                    isDangerous ? colors.error : colors.success,
                    isDangerous ? colors.error + 'CC' : colors.success + 'CC',
                  ]}
                  style={[styles.button, styles.confirmButtonGradient]}
                >
                  <Button
                    mode="contained"
                    onPress={onConfirm}
                    style={styles.confirmButton}
                    labelStyle={styles.confirmButtonText}
                    loading={loading}
                    disabled={loading}
                    buttonColor="transparent"
                  >
                    {confirmText}
                  </Button>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: spacing.xl,
    overflow: 'hidden',
    ...shadows.large,
    elevation: 20,
  },
  gradientBackground: {
    borderRadius: spacing.xl,
  },
  modalContent: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.medium,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineLarge,
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
    textShadowColor: colors.primary + '40',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dangerousTitle: {
    color: colors.error,
    textShadowColor: colors.error + '40',
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  dangerousUnderline: {
    backgroundColor: colors.error,
  },
  messageContainer: {
    marginBottom: spacing.xxxl,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  messageLine: {
    ...typography.bodyLarge,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: spacing.lg,
    minHeight: 48,
  },
  cancelButton: {
    borderColor: colors.border,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    ...typography.labelLarge,
    color: colors.text,
    fontWeight: '600',
  },
  confirmButtonGradient: {
    borderRadius: spacing.lg,
    ...shadows.medium,
    elevation: 4,
  },
  confirmButton: {
    backgroundColor: 'transparent',
    margin: 0,
    borderRadius: spacing.lg,
    minHeight: 48,
    minWidth: 120,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    ...typography.labelLarge,
    color: colors.text,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

