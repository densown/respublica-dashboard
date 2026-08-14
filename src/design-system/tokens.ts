export const light = {
  bg: '#F5F0E8',
  bgAlt: '#FFFFFF',
  bgHover: '#EDE8DF',
  ink: '#0F0F0F',
  /** Primärer Fließtext / Überschriften (semantisch; gleicher Kontrast wie ink) */
  text: '#0F0F0F',
  inkSoft: '#3D3D3D',
  muted: '#525960',
  subtle: '#71767D',
  red: '#C8102E',
  redHover: '#A30D24',
  yes: '#2D7D46',
  no: '#B91C1C',
  abstain: '#94A3B8',
  absent: '#D1D5DB',
  border: '#E8E4DC',
  borderHover: '#D0CBC2',
  badgeBg: '#1A1A1A',
  badgeText: '#FFFFFF',
  cardBg: '#FFFFFF',
  /** Flächen für Overlays / Such-Dropdowns (Dark Mode: wie cardBg) */
  surface: '#FFFFFF',
  cardBorder: '#E8E4DC',
  sidebarBg: '#1A1A1A',
  sidebarText: 'rgba(255,255,255,0.55)',
  sidebarActive: '#C8102E',
  inputBg: '#FFFFFF',
  inputBorder: '#D0CCC4',
  footerBg: '#1A1A1A',
  footerText: 'rgba(255,255,255,0.45)',
  footerLink: 'rgba(255,255,255,0.65)',
  navMobileBg: '#FFFFFF',
  navMobileBorder: '#E8E4DC',
  overlay: 'rgba(0,0,0,0.3)',
  shadow: '0 1px 3px rgba(0,0,0,0.06)',
} as const

export const dark = {
  bg: '#111111',
  bgAlt: '#1A1A1A',
  bgHover: '#222222',
  ink: '#E8E4DC',
  text: '#E8E4DC',
  inkSoft: '#C8C4BC',
  muted: '#8B8B8B',
  subtle: '#6B6B6B',
  red: '#E8384F',
  redHover: '#FF4D63',
  yes: '#3DA85A',
  no: '#E53E3E',
  abstain: '#718096',
  absent: '#4A5568',
  border: '#2D2D2D',
  borderHover: '#404040',
  badgeBg: '#E8E4DC',
  badgeText: '#111111',
  cardBg: '#1A1A1A',
  surface: '#1A1A1A',
  cardBorder: '#2D2D2D',
  sidebarBg: '#0A0A0A',
  sidebarText: 'rgba(255,255,255,0.45)',
  sidebarActive: '#E8384F',
  inputBg: '#222222',
  inputBorder: '#333333',
  footerBg: '#0A0A0A',
  footerText: 'rgba(255,255,255,0.35)',
  footerLink: 'rgba(255,255,255,0.55)',
  navMobileBg: '#1A1A1A',
  navMobileBorder: '#2D2D2D',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '0 1px 3px rgba(0,0,0,0.3)',
} as const

export type ThemeColors = typeof light | typeof dark

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xl2: 40,
  xxxl: 48,
} as const

export const fonts = {
  display: "'Playfair Display', serif",
  body: "'Source Serif 4', serif",
  mono: "'IBM Plex Mono', monospace",
} as const

/**
 * Schriftgroessen. Siehe docs/DESIGN.md, Abschnitt 3.
 *
 * Neu geschnitten im August 2026: die alte Skala stand auf 0.625 / 0.8125 /
 * 0.9375 rem und wurde in pages/ und components/ NULLMAL verwendet — dafuer
 * 381 rohe rem-Angaben, die sich um 0.7, 0.75, 0.8, 0.85, 0.9 und 0.95
 * gruppierten. Kein Token traf einen tatsaechlich gebrauchten Wert. Token,
 * die man beim Schreiben umrechnen muss, benutzt niemand.
 */
export const fontSize = {
  /** 11px — Mono-Label in Versalien, Legenden */
  micro: '0.6875rem',
  /** 12px — Metazeile, Fussnote, Quellenangabe */
  xs: '0.75rem',
  /** 13px — Tabellendaten, Chips, Hilfstext */
  sm: '0.8125rem',
  /** 14px — sekundaerer Fliesstext */
  md: '0.875rem',
  /** 15px — Fliesstext */
  base: '0.9375rem',
  /** 17px — Vorspann, hervorgehobene Zahl */
  lg: '1.0625rem',
  /** 20px — Abschnittsueberschrift */
  xl: '1.25rem',
  /** 24px — Seitentitel auf dem Handy */
  xxl: '1.5rem',
  /** 36px — Seitentitel auf dem Desktop */
  hero: '2.25rem',
} as const

export const fontWeight = {
  normal: 400,
  medium: 600,
  bold: 700,
  black: 900,
} as const

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const

/**
 * Eckenradien. Die Werte decken den gemessenen Bedarf bereits ab (8 kommt
 * 77x vor, 4 41x, 6 31x) — ergaenzt ist nur `xs` fuer die 2- und 3-Pixel-
 * Faelle an Farbpunkten und Miniaturbalken.
 */
export const radius = {
  /** 2px — Farbpunkte, Miniaturbalken */
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  pill: 999,
} as const

export const elevation = {
  sm: '0 1px 3px rgba(0,0,0,0.06)',
  md: '0 2px 8px rgba(0,0,0,0.1)',
  lg: '0 4px 16px rgba(0,0,0,0.12)',
} as const

export const elevationDark = {
  sm: '0 1px 3px rgba(0,0,0,0.3)',
  md: '0 2px 8px rgba(0,0,0,0.4)',
  lg: '0 4px 16px rgba(0,0,0,0.5)',
} as const

export const motion = {
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  fast: '0.15s',
  normal: '0.25s',
  slow: '0.35s',
} as const

export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  wide: 1280,
} as const
