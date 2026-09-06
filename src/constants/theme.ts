import { Colors } from './colors';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  headingLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headingMedium: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  headingSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.text.muted,
  },
};

export const Theme = {
  colors: Colors,
  spacing: Spacing,
  borderRadius: BorderRadius,
  typography: Typography,
};

export default Theme;

