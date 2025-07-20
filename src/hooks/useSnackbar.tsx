import { useState } from 'react';

export type SnackbarType = 'success' | 'error' | 'info' | 'warning';

interface SnackbarState {
  visible: boolean;
  message: string;
  type: SnackbarType;
}

export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showSnackbar = (message: string, type: SnackbarType = 'info') => {
    setSnackbar({ visible: true, message, type });
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  };

  const showSuccess = (message: string) => showSnackbar(message, 'success');
  const showError = (message: string) => showSnackbar(message, 'error');
  const showInfo = (message: string) => showSnackbar(message, 'info');
  const showWarning = (message: string) => showSnackbar(message, 'warning');

  return {
    snackbar,
    showSnackbar,
    hideSnackbar,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
}
