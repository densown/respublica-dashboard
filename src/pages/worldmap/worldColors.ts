/** Sequenzielle Skalen (hell → dunkel = niedrig → hoch). */
const SEQUENTIAL: Record<string, { lo: string; hi: string }> = {
  economy: { lo: '#f7fbff', hi: '#08306b' },
  population: { lo: '#fff5eb', hi: '#7f2704' },
  education: { lo: '#f7fcf5', hi: '#00441b' },
  health: { lo: '#e0f3f8', hi: '#084081' },
  environment: { lo: '#f7fcb1', hi: '#016c59' },
  military: { lo: '#fff5f0', hi: '#67000d' },
  inequality: { lo: '#ffffcc', hi: '#800026' },
  technology: { lo: '#f0f9e8', hi: '#0868ac' },
  trade: { lo: '#f7fcfd', hi: '#00441b' },
  /** Höher = schlechter (z. B. Tötungsrate): hell = niedrig, dunkel = hoch. */
  security: { lo: '#fff5f0', hi: '#67000d' },
}

const GOV_RED = '#b2182b'
const GOV_WHITE = '#f7f7f7'
const GOV_GREEN = '#1a9850'

const GOV_MIN = -2.5
const GOV_MAX = 2.5

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  const x = (n: number) => n.toString(16).padStart(2, '0')
  return `#${x(Math.round(r))}${x(Math.round(g))}${x(Math.round(b))}`
}

function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t,
  )
}

/** WCAG relative luminance (sRGB), ~0 = dark, ~1 = light */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const lin = (u: number) => {
    const x = u / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  const R = lin(r)
  const G = lin(g)
  const B = lin(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

const DARK_MAP_LUM_FLOOR_HEX = '#2a4a6a'
const DARK_MAP_LUM_FLOOR = relativeLuminance(DARK_MAP_LUM_FLOOR_HEX)
const DARK_MAP_LIFT_TOWARD = '#8ebfe8'

/**
 * Auf hellere Töne anheben, damit Choropleth auf fast schwarzem Basemap lesbar bleibt.
 * Ziel: keine Füllfarbe dunkler als ca. #2a4a6a (Luminanz-Floor).
 */
export function liftChoroplethColorForDarkBasemap(hex: string): string {
  let c = hex
  let guard = 0
  while (relativeLuminance(c) < DARK_MAP_LUM_FLOOR && guard < 14) {
    c = mix(c, DARK_MAP_LIFT_TOWARD, 0.22)
    guard += 1
  }
  return c
}

export type WorldFillColorOptions = {
  /** Choropleth auf dunklem MapLibre-Basemap (Dark Matter) */
  darkBasemap?: boolean
}

/**
 * Füllfarbe für ein Land: linear interpoliert nach Kategorie.
 * Governance: divergierend rot–weiß–grün für festes Intervall [-2.5, 2.5].
 */
export function worldFillColor(
  value: number,
  min: number,
  max: number,
  category: string,
  options?: WorldFillColorOptions,
): string {
  const darkMap = options?.darkBasemap === true

  if (category === 'governance') {
    const span = GOV_MAX - GOV_MIN
    const t = Math.min(1, Math.max(0, (value - GOV_MIN) / span))
    let c: string
    if (t <= 0.5) {
      c = mix(GOV_RED, GOV_WHITE, t * 2)
    } else {
      c = mix(GOV_WHITE, GOV_GREEN, (t - 0.5) * 2)
    }
    return darkMap ? liftChoroplethColorForDarkBasemap(c) : c
  }

  const span = max - min || 1
  const t = Math.min(1, Math.max(0, (value - min) / span))
  const scale = SEQUENTIAL[category] ?? SEQUENTIAL.economy
  const c = mix(scale.lo, scale.hi, t)
  return darkMap ? liftChoroplethColorForDarkBasemap(c) : c
}

/** @deprecated Nutze worldFillColor mit echten min/max. */
export function worldChoroplethColor(category: string, t: number): string {
  const scale = SEQUENTIAL[category] ?? SEQUENTIAL.economy
  return mix(scale.lo, scale.hi, Math.min(1, Math.max(0, t)))
}

/** Feste WB-Geographieregion → Farbe (Scatter + Legende). */
export const REGION_COLORS: Record<string, string> = {
  'Sub-Saharan Africa': '#2D8B4E',
  'Europe & Central Asia': '#3B82F6',
  'East Asia & Pacific': '#8B5CF6',
  'Middle East & North Africa': '#EF4444',
  'Latin America & Caribbean': '#F59E0B',
  'South Asia': '#EC4899',
  'North America': '#06B6D4',
}

/** API-Region (inkl. abweichender WB-Bezeichner) → Schlüssel in REGION_COLORS. */
const REGION_COLOR_KEY_ALIASES: Record<string, string> = {
  'Middle East, North Africa, Afghanistan & Pakistan':
    'Middle East & North Africa',
}

function canonicalRegionForScatterColor(region: string): string | null {
  const s = region.trim()
  if (s in REGION_COLORS) return s
  const alias = REGION_COLOR_KEY_ALIASES[s]
  return alias ?? null
}

/** Farbe für Streudiagramm-Punkte nach Weltbank-Region (Lookup, sonst grau). */
export function worldRegionScatterColor(
  region: string | null | undefined,
): string {
  if (!region?.trim()) return '#888888'
  const canon = canonicalRegionForScatterColor(region)
  if (!canon) return '#888888'
  return REGION_COLORS[canon] ?? '#888888'
}

export function worldChoroplethGradientCss(
  category: string,
  options?: WorldFillColorOptions,
): string {
  const darkMap = options?.darkBasemap === true
  if (category === 'governance') {
    if (darkMap) {
      return `linear-gradient(90deg, ${liftChoroplethColorForDarkBasemap(GOV_RED)} 0%, ${GOV_WHITE} 50%, ${liftChoroplethColorForDarkBasemap(GOV_GREEN)} 100%)`
    }
    return `linear-gradient(90deg, ${GOV_RED} 0%, ${GOV_WHITE} 50%, ${GOV_GREEN} 100%)`
  }
  const scale = SEQUENTIAL[category] ?? SEQUENTIAL.economy
  const hi = darkMap
    ? liftChoroplethColorForDarkBasemap(scale.hi)
    : scale.hi
  return `linear-gradient(90deg, ${scale.lo} 0%, ${hi} 100%)`
}
