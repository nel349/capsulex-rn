import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Modal, Text, Button } from 'react-native-paper';

import {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
} from '../../theme';

interface ConfirmationModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmationModal({
  visible,
  onDismiss,
  title,
  message,
  onConfirm,
  loading = false,
}: ConfirmationModalProps) {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

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
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              style={[styles.button, styles.confirmButton]}
              labelStyle={styles.confirmButtonText}
              loading={loading}
              disabled={loading}
            >
              Confirm
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: 0,
    ...shadows.large,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  messageLine: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xs,
  },
  cancelButton: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.premiumOrange,
    ...shadows.medium,
  },
  confirmButtonText: {
    ...typography.labelLarge,
    color: colors.text,
    fontWeight: 'bold',
  },
});
