// Theme System - Modular Architecture
// Import all theme modules
export { colors } from './colors';
export { typography } from './typography';
export { spacing, borderRadius } from './spacing';
export { shadows } from './shadows';
export { layout } from './layout';
export { components } from './components';
export { animations } from './animations';

// Import modules for theme object
import { animations } from './animations';
import { colors } from './colors';
import { components } from './components';
import { layout } from './layout';
import { shadows } from './shadows';
import { spacing, borderRadius } from './spacing';
import { typography } from './typography';

// Create a comprehensive theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
  layout,
  animations,
} as const;

export default theme;
