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
import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';
import { shadows } from './shadows';
import { layout } from './layout';
import { components } from './components';
import { animations } from './animations';

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