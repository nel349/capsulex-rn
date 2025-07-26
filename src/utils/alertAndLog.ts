// Replaced intrusive alerts with console logging only
// UI components should handle error display via snackbars or other non-intrusive methods

export function alertAndLog(title: string, message: any) {
  // Log the error for debugging
  console.error(`${title}: ${message}`);

  // Note: Removed Alert.alert() - UI components should handle error display
  // via snackbars, toasts, or other non-intrusive notification methods
}

// Helper function for components that want to show user-friendly error messages
export function logErrorForSnackbar(
  title: string,
  message: any
): { title: string; message: string } {
  console.error(`${title}: ${message}`);
  return {
    title,
    message: typeof message === 'string' ? message : JSON.stringify(message),
  };
}
