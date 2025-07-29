// Color Palette - Twitter-inspired with premium touches
export const colors = {
  // Primary Colors
  background: '#000000', // Pure black
  surface: '#111111', // Slightly lighter black for cards
  surfaceVariant: '#1a1a1a', // For elevated surfaces
  
  // Text Colors
  text: '#FFFFFF', // Pure white
  textSecondary: '#8B98A5', // Minimal gray for secondary text
  textTertiary: '#5B7083', // Even more muted for metadata
  
  // Accent Colors
  primary: '#1DA1F2', // Twitter blue accent
  primaryVariant: '#1991DB', // Darker blue for pressed states
  
  // Status Colors
  success: '#00BA7C', // Green for success states
  warning: '#FFB400', // Amber for pending states
  error: '#F4212E', // Red for error states
  
  // Premium Card Colors (Netflix-inspired)
  premiumGold: '#E6B800', // Gold accent for premium content
  premiumOrange: '#FF6B35', // Warm orange for ready states
  
  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  
  // Border colors
  border: '#38444D',
  borderLight: '#2F3336',
} as const; 