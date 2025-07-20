import React from 'react';
import { StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';

import type { SnackbarType } from '../../hooks/useSnackbar';

interface AppSnackbarProps {
  visible: boolean;
  message: string;
  type: SnackbarType;
  onDismiss: () => void;
  duration?: number;
}

export function AppSnackbar({
  visible,
  message,
  type,
  onDismiss,
  duration,
}: AppSnackbarProps) {
  const getDuration = () => {
    if (duration) return duration;
    switch (type) {
      case 'success':
        return 4000;
      case 'error':
        return 6000;
      case 'warning':
        return 5000;
      default:
        return 4000;
    }
  };

  const getStyle = () => {
    switch (type) {
      case 'success':
        return [styles.snackbar, styles.successSnackbar];
      case 'error':
        return [styles.snackbar, styles.errorSnackbar];
      case 'warning':
        return [styles.snackbar, styles.warningSnackbar];
      default:
        return styles.snackbar;
    }
  };

  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={getDuration()}
      style={getStyle()}
      action={{
        label: 'Dismiss',
        onPress: onDismiss,
      }}
    >
      {message}
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 16,
  },
  successSnackbar: {
    backgroundColor: '#4CAF50',
  },
  errorSnackbar: {
    backgroundColor: '#F44336',
  },
  warningSnackbar: {
    backgroundColor: '#FF9800',
  },
});
