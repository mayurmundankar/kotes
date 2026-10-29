// kotes · one hue, many depths. Mirrors src/app/globals.css on the web:
// everything is a shade of the same red-pink (hue ≈ 348°).
import { Platform, type TextStyle } from 'react-native';

export const C = {
  rose: '#e8365f', // primary
  roseDeep: '#c21f48',
  roseSoft: '#f6c3cf',
  roseMist: '#fbe3e9',
  paper: '#fff6f7',
  blush: '#fdecf0',
  wine: '#2a0711', // ink
  wine2: '#4b0f22',
  ink60: 'rgba(42,7,17,0.6)',
  ink40: 'rgba(42,7,17,0.4)',
  ink12: 'rgba(42,7,17,0.12)',
  ink06: 'rgba(42,7,17,0.06)',
} as const;

// One family per file (Android names each embedded font after its file), so
// weight and style are picked by family, never faked with fontWeight.
export const F = {
  display: 'dmserif-400',
  displayItalic: 'dmserif-400-italic',
  read: 'garamond-400',
  readItalic: 'garamond-400-italic',
  readMedium: 'garamond-500',
  readMediumItalic: 'garamond-500-italic',
  ui: 'manrope-400',
  uiMedium: 'manrope-500',
  uiSemi: 'manrope-600',
  uiBold: 'manrope-700',
} as const;

// Embedded at build time by the expo-font plugin (app.json); loaded at runtime
// too so the web preview and Expo Go get them under the same names.
export const FONT_FILES = {
  'dmserif-400': require('@/assets/fonts/dmserif-400.ttf'),
  'dmserif-400-italic': require('@/assets/fonts/dmserif-400-italic.ttf'),
  'garamond-400': require('@/assets/fonts/garamond-400.ttf'),
  'garamond-400-italic': require('@/assets/fonts/garamond-400-italic.ttf'),
  'garamond-500': require('@/assets/fonts/garamond-500.ttf'),
  'garamond-500-italic': require('@/assets/fonts/garamond-500-italic.ttf'),
  'manrope-400': require('@/assets/fonts/manrope-400.ttf'),
  'manrope-500': require('@/assets/fonts/manrope-500.ttf'),
  'manrope-600': require('@/assets/fonts/manrope-600.ttf'),
  'manrope-700': require('@/assets/fonts/manrope-700.ttf'),
};

export const GUTTER = 24;
export const NAV_H = 68;
export const SITE = 'https://kotes.mayurmundankar.com';

// CSS letter-spacing is in em; React Native's is in points.
export const em = (size: number, value: number) => size * value;

// Android pads text for accents by default, which pushes tight serif lines apart.
const tight: TextStyle = Platform.OS === 'android' ? { includeFontPadding: false } : {};

export const T = {
  wordmark: { fontFamily: F.displayItalic, fontSize: 26, letterSpacing: em(26, -0.02), color: C.wine, ...tight },
  eyebrow: {
    fontFamily: F.uiSemi,
    fontSize: 11,
    letterSpacing: em(11, 0.22),
    textTransform: 'uppercase',
    color: C.ink60,
  },
  lede: { fontFamily: F.read, fontSize: 21, lineHeight: 21 * 1.45, color: C.ink60 },
  fine: { fontFamily: F.ui, fontSize: 12.5, color: C.ink40, letterSpacing: em(12.5, 0.01) },
  error: { fontFamily: F.ui, fontSize: 13.5, color: C.roseDeep, minHeight: 20 },
  // The display face ships one weight; the italic carries the emphasis.
  title: (size: number): TextStyle => ({
    fontFamily: F.display,
    fontSize: size,
    lineHeight: size * 1.04,
    letterSpacing: em(size, -0.035),
    color: C.wine,
    ...tight,
  }),
  em: { fontFamily: F.displayItalic, color: C.rose },
} satisfies Record<string, TextStyle | ((n: number) => TextStyle)>;
