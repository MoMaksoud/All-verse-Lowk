/**
 * AllVerse GPT — Mobile Design Tokens
 *
 * Single source of truth for colors, typography, spacing, radii, and shadows.
 * Mirrors `apps/web/tailwind.config.js` + `apps/web/src/app/globals.css` so
 * the mobile app and website stay visually consistent.
 *
 * Usage:
 *   import { colors, typography, spacing, radii, shadows, theme } from '@/constants/theme';
 *   <View style={{ backgroundColor: colors.bg.base, padding: spacing.lg }} />
 */

// ────────────────────────────────────────────────────────────────────────────
// PRIMITIVE PALETTE (mirrors tailwind.config.js)
// ────────────────────────────────────────────────────────────────────────────

export const palette = {
  // Primary brand blue (web: tailwind `primary`)
  primary: {
    50: '#f0f4ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#0063e1', // brand
    600: '#0052b8',
    700: '#00418f',
    800: '#003066',
    900: '#001f3d',
  },

  // Dark slate scale (web: tailwind `dark`)
  dark: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617', // app background
  },

  // Neutral gray (web: tailwind `gray`)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Semantic / state colors (match web usage in globals.css)
  red: {
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
  },
  green: {
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
  },
  amber: {
    400: '#fbbf24',
    500: '#f59e0b',
  },
  orange: {
    500: '#f97316',
  },
  violet: {
    400: '#a78bfa',
    500: '#8b5cf6', // used in web gradients
    600: '#7c3aed',
  },
  cyan: {
    400: '#22d3ee',
    500: '#06b6d4', // used in web gradients
  },

  // Pure
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ────────────────────────────────────────────────────────────────────────────
// ALPHA HELPERS — matches `rgba(255,255,255,0.xx)` and `rgba(0,99,225,0.xx)`
// patterns used throughout the app for glass/overlay surfaces.
// ────────────────────────────────────────────────────────────────────────────

export const alpha = {
  white05: 'rgba(255, 255, 255, 0.05)',
  white10: 'rgba(255, 255, 255, 0.10)',
  white15: 'rgba(255, 255, 255, 0.15)',
  white20: 'rgba(255, 255, 255, 0.20)',
  white30: 'rgba(255, 255, 255, 0.30)',
  white40: 'rgba(255, 255, 255, 0.40)',
  white50: 'rgba(255, 255, 255, 0.50)',
  white60: 'rgba(255, 255, 255, 0.60)',
  white70: 'rgba(255, 255, 255, 0.70)',
  white80: 'rgba(255, 255, 255, 0.80)',
  white90: 'rgba(255, 255, 255, 0.90)',

  black30: 'rgba(0, 0, 0, 0.30)',
  black40: 'rgba(0, 0, 0, 0.40)',
  black60: 'rgba(0, 0, 0, 0.60)',

  primary10: 'rgba(0, 99, 225, 0.10)',
  primary15: 'rgba(0, 99, 225, 0.15)',
  primary20: 'rgba(0, 99, 225, 0.20)',
  primary30: 'rgba(0, 99, 225, 0.30)',
  primary40: 'rgba(0, 99, 225, 0.40)',
  primary50: 'rgba(0, 99, 225, 0.50)',
  primary60: 'rgba(0, 99, 225, 0.60)',
  primary80: 'rgba(0, 99, 225, 0.80)',

  red10: 'rgba(239, 68, 68, 0.10)',
  red15: 'rgba(239, 68, 68, 0.15)',
  red20: 'rgba(239, 68, 68, 0.20)',
  red30: 'rgba(239, 68, 68, 0.30)',
  red95: 'rgba(239, 68, 68, 0.95)',

  green15: 'rgba(16, 185, 129, 0.15)',
  green20: 'rgba(16, 185, 129, 0.20)',

  amber15: 'rgba(251, 191, 36, 0.15)',
  amber20: 'rgba(251, 191, 36, 0.20)',
} as const;

// ────────────────────────────────────────────────────────────────────────────
// SEMANTIC COLORS — the layer the app should use directly.
// This abstracts intent from raw palette values so themes can evolve.
// ────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Surfaces
  bg: {
    base: palette.dark[950],        // #020617 — app background
    raised: palette.dark[900],      // #0f172a — elevated sections
    surface: palette.dark[800],     // #1e293b — cards, modals
    surfaceHover: palette.dark[700],// #334155 — hover / pressed
    overlay: alpha.black60,         // #000000 @ 60% — scrims / modals backdrop
    glass: alpha.white05,           // translucent glass cards
    glassHover: alpha.white10,
  },

  // Text
  text: {
    primary: palette.white,          // #ffffff — body / headings
    secondary: palette.dark[200],    // #e2e8f0 — subtitles
    tertiary: palette.dark[300],     // #cbd5e1 — meta / hints
    muted: palette.dark[400],        // #94a3b8 — placeholders / disabled
    disabled: palette.dark[500],     // #64748b
    inverse: palette.dark[950],      // on-primary backgrounds
    link: palette.primary[500],      // #0063e1
  },

  // Borders
  border: {
    subtle: alpha.white10,           // default card border
    default: alpha.white15,
    strong: alpha.white20,
    focused: palette.primary[500],   // focus ring / active input
    divider: palette.dark[800],      // list dividers
  },

  // Brand / primary
  brand: {
    DEFAULT: palette.primary[500],   // #0063e1
    hover: palette.primary[600],     // #0052b8
    pressed: palette.primary[700],   // #00418f
    soft: alpha.primary15,           // subtle background
    softer: alpha.primary10,
    ring: alpha.primary30,
    onBrand: palette.white,
  },

  // State
  success: {
    DEFAULT: palette.green[500],
    soft: alpha.green15,
    border: alpha.green20,
    text: palette.green[400],
  },
  warning: {
    DEFAULT: palette.amber[500],
    soft: alpha.amber15,
    border: alpha.amber20,
    text: palette.amber[400],
  },
  error: {
    DEFAULT: palette.red[500],
    hover: palette.red[600],
    soft: alpha.red10,
    softStrong: alpha.red15,
    border: alpha.red20,
    text: palette.red[400],
  },
  info: {
    DEFAULT: palette.primary[500],
    soft: alpha.primary10,
    border: alpha.primary20,
    text: palette.primary[400],
  },

  // Accents (match web gradient stops in globals.css)
  accent: {
    violet: palette.violet[500],
    cyan: palette.cyan[500],
    indigo: palette.primary[400],
  },

  // Tab bar (matches current `(tabs)/_layout.tsx` values)
  tab: {
    active: palette.primary[500],
    inactive: palette.gray[500],   // was #71717a — mapped to gray-500
    background: palette.dark[950],
    border: alpha.white10,
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY — mirrors web's Inter scale.
// Mobile can load Inter via expo-font; if not loaded, strings fall back to
// the platform system font automatically.
// ────────────────────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    sans: 'Inter',             // loaded via expo-font (falls back to system)
    sansMedium: 'Inter-Medium',
    sansSemibold: 'Inter-SemiBold',
    sansBold: 'Inter-Bold',
  },

  // Weight values (React Native expects these as strings)
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Type scale — tuned for mobile (slightly smaller than web defaults)
  size: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 22,
    '4xl': 24,
    '5xl': 28,
    '6xl': 32,
    '7xl': 36,
    '8xl': 42,
  },

  // Line-heights (unitless multiplier * font size → RN uses pixel values)
  lineHeight: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.45,
    relaxed: 1.6,
  },

  letterSpacing: {
    tight: -0.4,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// SPACING — mirrors tailwind default scale (4px base unit).
// ────────────────────────────────────────────────────────────────────────────

export const spacing = {
  none: 0,
  '2xs': 2,   // tailwind 0.5
  xs: 4,      // 1
  sm: 8,      // 2
  md: 12,     // 3
  lg: 16,     // 4
  xl: 20,     // 5
  '2xl': 24,  // 6
  '3xl': 32,  // 8
  '4xl': 40,  // 10
  '5xl': 48,  // 12
  '6xl': 64,  // 16
  '7xl': 80,  // 20
  '8xl': 96,  // 24
} as const;

// ────────────────────────────────────────────────────────────────────────────
// RADII — mirrors tailwind extended borderRadius.
// ────────────────────────────────────────────────────────────────────────────

export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,   // tailwind xl: 1rem
  '2xl': 24,// tailwind 2xl: 1.5rem
  '3xl': 32,// tailwind 3xl: 2rem
  full: 9999,
  pill: 9999,
} as const;

// ────────────────────────────────────────────────────────────────────────────
// SHADOWS — cross-platform (iOS uses shadow*, Android uses elevation).
// Spread the returned object into a StyleSheet.
// ────────────────────────────────────────────────────────────────────────────

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  glow: {
    shadowColor: palette.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// OPACITY — reusable values for disabled / overlays.
// ────────────────────────────────────────────────────────────────────────────

export const opacity = {
  disabled: 0.5,
  pressed: 0.7,
  hover: 0.85,
} as const;

// ────────────────────────────────────────────────────────────────────────────
// THEME — single export bundling everything.
// ────────────────────────────────────────────────────────────────────────────

export const theme = {
  palette,
  alpha,
  colors,
  typography,
  spacing,
  radii,
  shadows,
  opacity,
} as const;

export type Theme = typeof theme;
export default theme;
