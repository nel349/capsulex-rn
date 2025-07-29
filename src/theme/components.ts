import { colors } from './colors';
import { spacing, borderRadius } from './spacing';
import { shadows } from './shadows';

// Component Styles
export const components = {
  // Premium Card (Netflix-inspired)
  premiumCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    ...shadows.large,
  },
  
  // Standard Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.medium,
  },
  
  // Ready Card (with glow)
  readyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 2,
    borderColor: colors.premiumOrange,
    ...shadows.readyGlow,
  },
  
  // Pending Card
  pendingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.warning,
    ...shadows.medium,
  },
  
  // Revealed Card
  revealedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.success,
    ...shadows.medium,
  },
  
  // Button Styles
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.medium,
  },
  
  premiumButton: {
    backgroundColor: colors.premiumOrange,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.medium,
  },
  
  // Chip Styles
  chipReady: {
    backgroundColor: colors.premiumOrange,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  
  chipPending: {
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  
  chipSuccess: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
} as const; 