// Design tokens — mirrors DESIGN.md front matter (colors, typography,
// spacing, radius) plus the light-only implementation deviations the web
// build ships. This module is the only place raw design values may appear;
// components reference tokens, never literal colors or sizes.

// Inter 400/700 is the documented open-source pairing for the proprietary
// NVIDIA-EMEA face (DESIGN.md, "Note on Font Substitutes"). Both weights are
// bundled via @expo-google-fonts/inter and registered in App.js.
export const FONTS = Object.freeze({
  regular: 'Inter_400Regular',
  bold: 'Inter_700Bold',
})

// Values copied verbatim from the DESIGN.md colors front matter. Dark-surface
// and editorial accents stay in the set (they are referenced by future
// surfaces/content) but nothing on the current landing renders them.
export const COLORS = Object.freeze({
  primary: '#76b900',
  onPrimary: '#000000',
  primaryDark: '#5a8d00',
  ink: '#000000',
  canvas: '#ffffff',
  surfaceDark: '#000000',
  surfaceSoft: '#f7f7f7',
  surfaceElevated: '#1a1a1a',
  hairline: '#cccccc',
  hairlineStrong: '#5e5e5e',
  body: '#1a1a1a',
  mute: '#757575',
  stone: '#898989',
  ash: '#a7a7a7',
  onDark: '#ffffff',
  onDarkMute: 'rgba(255, 255, 255, 0.7)',
  linkBlue: '#0046a4',
  blue700: '#0046a4',
  error: '#e52020',
  errorDeep: '#650b0b',
  warning: '#df6500',
  warningBright: '#ef9100',
  successDeep: '#3f8500',
  accentYellowPale: '#feeeb2',
  accentPurple: '#952fc6',
  accentPurpleDeep: '#4d1368',
  accentPurplePale: '#f9d4ff',
  accentGreenPale: '#bff230',
})

export const SPACING = Object.freeze({
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 64,
})

export const RADIUS = Object.freeze({
  none: 0,
  xs: 1,
  sm: 2,
  full: 9999,
})

// Hairline borders separate cards and chrome in place of shadows.
export const BORDER_WIDTH = Object.freeze({
  hairline: 1,
  focus: 2,
})

// Minimum WCAG AA touch target, per DESIGN.md responsive rules.
export const TOUCH_TARGET = 44

// Screen gutters and vertical rhythm on phones: DESIGN.md collapses the
// universal section rhythm to 32px and grid gutters to 16px at <= 480px wide,
// and every phone viewport is inside that band.
export const GUTTER = 24
export const SECTION_VERTICAL_PADDING = 32
export const CARD_GAP = 16

const typeToken = ({
  weight,
  size,
  lineHeightScale,
  letterSpacing = 0,
  textTransform = 'none',
}) => ({
  fontFamily: weight === 700 ? FONTS.bold : FONTS.regular,
  fontWeight: weight,
  fontSize: size,
  lineHeight: Math.round(size * lineHeightScale * 100) / 100,
  letterSpacing,
  textTransform,
})

// The DESIGN.md typography hierarchy. display-xl is rendered at the 32px
// mobile collapse DESIGN.md specifies for <= 480px viewports; every other
// token renders at its front-matter size. textTransform carries over where
// DESIGN.md marks a role uppercase.
export const TYPE = Object.freeze({
  displayXl: typeToken({ weight: 700, size: 32, lineHeightScale: 1.25 }),
  displayLg: typeToken({ weight: 700, size: 36, lineHeightScale: 1.25 }),
  headingXl: typeToken({ weight: 700, size: 24, lineHeightScale: 1.25 }),
  headingLg: typeToken({ weight: 400, size: 22, lineHeightScale: 1.75 }),
  headingMd: typeToken({ weight: 700, size: 20, lineHeightScale: 1.25 }),
  headingSm: typeToken({ weight: 700, size: 18, lineHeightScale: 1.4 }),
  cardTitle: typeToken({ weight: 700, size: 17, lineHeightScale: 1.47 }),
  bodyMd: typeToken({ weight: 400, size: 16, lineHeightScale: 1.5 }),
  bodyStrong: typeToken({ weight: 700, size: 16, lineHeightScale: 1.5 }),
  bodySm: typeToken({ weight: 400, size: 15, lineHeightScale: 1.67 }),
  buttonLg: typeToken({ weight: 700, size: 18, lineHeightScale: 1.25 }),
  buttonMd: typeToken({ weight: 700, size: 16, lineHeightScale: 1.25 }),
  buttonSm: typeToken({
    weight: 700,
    size: 14.4,
    lineHeightScale: 1,
    letterSpacing: 0.144,
  }),
  linkMd: typeToken({ weight: 400, size: 15, lineHeightScale: 1.5 }),
  captionMd: typeToken({
    weight: 700,
    size: 14,
    lineHeightScale: 1.43,
    textTransform: 'uppercase',
  }),
  captionSm: typeToken({ weight: 400, size: 12, lineHeightScale: 1.25 }),
  captionXs: typeToken({ weight: 700, size: 11, lineHeightScale: 1 }),
  utilityXs: typeToken({
    weight: 700,
    size: 10,
    lineHeightScale: 1.5,
    textTransform: 'uppercase',
  }),
})

Object.freeze(TYPE)
