import type { BadgeVariant } from '../../design-system'

export type RechtGebietFilter =
  | 'all'
  | 'zivil'
  | 'straf'
  | 'sozial'
  | 'verfassung'
  | 'steuer_arbeit'
  | 'bundes'

export function normalizeKuerzelCode(k: string): string {
  return String(k ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** Heuristik aus Kürzel (Bundesrecht-Katalog), wie vereinbart. */
export function rechtGebietFromKuerzel(kuerzel: string): RechtGebietFilter {
  const u = normalizeKuerzelCode(kuerzel)
  if (!u) return 'bundes'

  const zivil = new Set(['BGB', 'ZPO', 'HGB', 'INSO', 'FAMFG', 'WEG'])
  if (zivil.has(u)) return 'zivil'

  const straf = new Set(['STGB', 'STPO', 'JGG', 'BTMG'])
  if (straf.has(u)) return 'straf'

  if (u.startsWith('SGB')) return 'sozial'

  const verf = new Set(['GG', 'BVERFGG'])
  if (verf.has(u)) return 'verfassung'

  const steuerArbeit = new Set(['ESTG', 'AO', 'ARBGG', 'BETRVG'])
  if (steuerArbeit.has(u)) return 'steuer_arbeit'

  return 'bundes'
}

export function courtBadgeVariant(gericht: string): BadgeVariant {
  const s = normalizeKuerzelCode(gericht)
  if (!s) return 'muted'
  if (s.startsWith('BVERFG') || s === 'BVERFG') return 'no'
  if (s.startsWith('BGH')) return 'blue'
  if (s.startsWith('BVERWG')) return 'yes'
  if (s.startsWith('BAG')) return 'amber'
  if (s.startsWith('BSG')) return 'purple'
  if (s.startsWith('BFH')) return 'teal'
  if (s.startsWith('BPATG')) return 'gray'
  return 'muted'
}

/** API-Query `rechtsgebiet` exakt (Dropdown-Werte). */
export const URTEIL_RECHTSGEBIET_OPTIONS = [
  'Verfassungsrecht',
  'Zivilrecht',
  'Strafrecht',
  'Sozialrecht',
  'Verwaltungsrecht',
  'Arbeitsrecht',
  'Steuerrecht',
  'Patentrecht',
  'Öffentliches Recht',
] as const

export type UrteilRechtsgebietApi = (typeof URTEIL_RECHTSGEBIET_OPTIONS)[number]

export function parseIsoDate(raw: string | null | undefined): Date | null {
  const s = String(raw ?? '').trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return null
  const y = Number.parseInt(m[1], 10)
  const mo = Number.parseInt(m[2], 10) - 1
  const d = Number.parseInt(m[3], 10)
  const dt = new Date(y, mo, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export function formatDisplayDate(
  raw: string | null | undefined,
  lang: 'de' | 'en',
): string {
  const dt = parseIsoDate(raw)
  if (!dt) return String(raw ?? '').trim() || '—'
  if (lang === 'en') {
    return dt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  const months = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ]
  const d = dt.getDate()
  const mo = dt.getMonth()
  const y = dt.getFullYear()
  const dayStr = d < 10 ? `0${d}` : String(d)
  return `${dayStr}. ${months[mo]} ${y}`
}

export function buildUrteilListEndpoint(
  gericht: string,
  rechtsgebiet: string,
): string {
  const parts: string[] = []
  if (gericht !== 'all') {
    parts.push(`gericht=${encodeURIComponent(gericht)}`)
  }
  if (rechtsgebiet !== 'all') {
    parts.push(`rechtsgebiet=${encodeURIComponent(rechtsgebiet)}`)
  }
  if (!parts.length) return '/api/urteile'
  return `/api/urteile?${parts.join('&')}`
}

export function rechtsprechungFullTextUrl(docId: string): string {
  const id = String(docId ?? '').trim()
  return `https://www.rechtsprechung-im-internet.de/jportal/portal/page/bsjrsprod?showdoccase=1&doc.id=jb-${encodeURIComponent(id)}`
}
