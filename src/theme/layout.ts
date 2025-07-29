import { colors } from './colors';
import { spacing } from './spacing';

// Layout helpers
export const layout = {
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  centered: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  
  // Netflix-inspired sections
  heroSection: {
    padding: spacing.sectionPadding,
    backgroundColor: colors.background,
  },
  
  contentSection: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  
  // Generous margins for premium feel
  premiumSpacing: {
    marginVertical: spacing.xl,
    paddingHorizontal: spacing.sectionPadding,
  },
} as const; 