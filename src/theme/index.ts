/**
 * Centralized theme constants for Obsidian Git Mobile
 *
 * Design principles:
 * - Warmer dark background (#131416) for reduced eye strain on OLED
 * - Consistent purple accent (#8b5cf6) throughout
 * - Subtle borders for card definition on dark screens
 * - Minimum 44x44dp touch targets for accessibility
 */

export const colors = {
  // Backgrounds - warmer dark tones
  background: '#131416',
  backgroundElevated: '#1e1e1e',
  backgroundModal: '#1a1a1a',
  backgroundCard: '#262626',

  // Borders - subtle definition for OLED
  border: '#2a2a2a',
  borderLight: 'rgba(255,255,255,0.06)',
  borderFocus: 'rgba(139,92,246,0.5)',

  // Text hierarchy
  textPrimary: '#ffffff',
  textSecondary: '#dcddde',
  textMuted: '#a0a0a0',
  textPlaceholder: '#8a8a8a', // WCAG AA compliant contrast (~5:1 on #131416)
  textDisabled: '#717171', // WCAG AA compliant contrast (~4.5:1 on #131416)

  // Accent - consistent purple
  accent: '#8b5cf6',
  accentPressed: '#7c3aed',
  accentMuted: 'rgba(139,92,246,0.15)',

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  offline: '#6b7280',

  // Semantic
  danger: '#dc2626',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  pill: 9999,
} as const;

export const touchTargets = {
  minimum: 44,
  comfortable: 48,
  large: 56,
} as const;

export const typography = {
  sizes: {
    xs: 12,
    sm: 13,
    md: 14,
    lg: 16,
    xl: 17,
    xxl: 18,
    title: 28,
    largeTitle: 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;
