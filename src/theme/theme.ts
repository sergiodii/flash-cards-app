export const colors = {
  background: "#0F172A",
  surface: "#1E293B",
  surfaceElevated: "#293548",
  border: "#334155",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  accent: "#6366F1",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  title: 30,
  subtitle: 22,
  body: 17,
  caption: 14,
} as const;

export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const theme = { colors, spacing, radii, typography, shadow } as const;

export type Theme = typeof theme;
