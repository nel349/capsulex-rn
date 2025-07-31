// Replaced intrusive alerts with console logging only
// UI components should handle error display via snackbars or other non-intrusive methods

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
