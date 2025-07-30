# CapsuleX Theme System

A modular, maintainable theme architecture inspired by Twitter's clean design and Netflix's premium aesthetics.

## 📁 Structure

```
src/theme/
├── colors.ts          # Color palette and semantic colors
├── typography.ts      # Font scales and text styles
├── spacing.ts         # Spacing system and border radius
├── shadows.ts         # Elevation and glow effects
├── layout.ts          # Common layout patterns
├── components.ts      # Reusable component styles
├── animations.ts      # Timing and easing values
└── index.ts           # Main theme export
```

## 🎨 Usage

### Import the complete theme:
```typescript
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
});
```

### Import specific modules:
```typescript
import { colors, spacing } from '../theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
});
```

### Use component presets:
```typescript
import { components } from '../theme';

const styles = StyleSheet.create({
  premiumCard: {
    ...components.premiumCard,
    // Add custom overrides
  },
});
```

## 🛠 Customization

Each module can be independently modified:

- **colors.ts**: Update brand colors, add new semantic colors
- **typography.ts**: Adjust font scales, add new text styles
- **spacing.ts**: Modify spacing scale, add component-specific values
- **shadows.ts**: Create new elevation levels, adjust glow effects
- **components.ts**: Add new component presets, modify existing ones

## 📱 Design Principles

- **Twitter-inspired**: Clean, information-dense layout with minimal colors
- **Netflix-inspired**: Premium cards with generous spacing and visual hierarchy
- **Consistent**: Unified spacing, typography, and color system
- **Scalable**: Easy to extend and maintain
- **Type-safe**: Full TypeScript support with const assertions

## 🚀 Benefits

- ✅ **Maintainable**: Each concern is separated into its own module
- ✅ **Reusable**: Import only what you need
- ✅ **Consistent**: Single source of truth for design tokens
- ✅ **Type-safe**: Full IDE support and compile-time checking
- ✅ **Extensible**: Easy to add new design tokens and patterns 