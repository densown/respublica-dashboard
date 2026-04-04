export const PARTY_COLORS_LIGHT: Record<string, string> = {
  cdu_csu: '#1A1A1A',
  spd: '#E3000F',
  gruene: '#46962B',
  fdp: '#FFED00',
  linke_pds: '#BE3075',
  afd: '#009EE0',
  bsw: '#572887',
  freie_waehler: '#F29400',
  npd: '#8B4513',
  piraten: '#FF820A',
  die_partei: '#B92837',
  other: '#999999',
}

export const PARTY_COLORS_DARK: Record<string, string> = {
  ...PARTY_COLORS_LIGHT,
  cdu_csu: '#8899AA',
}

/** @deprecated Verwende `partyColorsForTheme` oder PARTY_COLORS_LIGHT */
export const PARTY_COLORS = PARTY_COLORS_LIGHT

export function partyColorsForTheme(isDark: boolean): Record<string, string> {
  return isDark ? PARTY_COLORS_DARK : PARTY_COLORS_LIGHT
}

export const PARTY_LABELS: Record<string, { de: string; en: string }> = {
  cdu_csu: { de: 'CDU/CSU', en: 'CDU/CSU' },
  spd: { de: 'SPD', en: 'SPD' },
  gruene: { de: 'Grüne', en: 'Greens' },
  fdp: { de: 'FDP', en: 'FDP' },
  linke_pds: { de: 'Linke', en: 'Left Party' },
  afd: { de: 'AfD', en: 'AfD' },
  bsw: { de: 'BSW', en: 'BSW' },
  freie_waehler: { de: 'Freie Wähler', en: 'Free Voters' },
  npd: { de: 'NPD', en: 'NPD' },
  piraten: { de: 'Piraten', en: 'Pirates' },
  die_partei: { de: 'Die PARTEI', en: 'The PARTY' },
  other: { de: 'Sonstige', en: 'Others' },
}

/** Sequential scale for turnout (light to dark). */
export const TURNOUT_SCALE = [
  '#FFF5EB',
  '#FDD49E',
  '#FDBB84',
  '#FC8D59',
  '#E34A33',
  '#B30000',
]

/** Diverging scale for losses. */
export const CHANGE_SCALE_NEG = ['#B30000', '#E34A33', '#FC8D59', '#FDBB84']

/** Diverging scale for gains. */
export const CHANGE_SCALE_POS = ['#D9F0A3', '#78C679', '#31A354', '#006837']

export const MAIN_PARTIES = [
  'cdu_csu',
  'spd',
  'gruene',
  'fdp',
  'linke_pds',
  'afd',
  'bsw',
] as const

export type MainParty = (typeof MAIN_PARTIES)[number]

/** Distinct colors for German states (AGS first two digits). */
export const STATE_PREFIX_COLORS: Record<string, string> = {
  '01': '#4E79A7',
  '02': '#F28E2B',
  '03': '#E15759',
  '04': '#76B7B2',
  '05': '#59A14F',
  '06': '#EDC948',
  '07': '#B07AA1',
  '08': '#FF9DA7',
  '09': '#9C755F',
  '10': '#BAB0AC',
  '11': '#6B9AC4',
  '12': '#C44E52',
  '13': '#8172B3',
  '14': '#CCBE93',
  '15': '#86BCB6',
  '16': '#D37295',
}

/** Bundesland aus AGS-Präfix (erste zwei Ziffern). */
export const STATE_NAMES: Record<string, string> = {
  '01': 'Schleswig-Holstein',
  '02': 'Hamburg',
  '03': 'Niedersachsen',
  '04': 'Bremen',
  '05': 'Nordrhein-Westfalen',
  '06': 'Hessen',
  '07': 'Rheinland-Pfalz',
  '08': 'Baden-Württemberg',
  '09': 'Bayern',
  '10': 'Saarland',
  '11': 'Berlin',
  '12': 'Brandenburg',
  '13': 'Mecklenburg-Vorpommern',
  '14': 'Sachsen',
  '15': 'Sachsen-Anhalt',
  '16': 'Thüringen',
}

export function statePrefixFromAgs(ags: string): string {
  const s = ags.replace(/\s/g, '')
  return s.length >= 2 ? s.slice(0, 2) : s
}

export function colorForStatePrefix(prefix: string): string {
  return STATE_PREFIX_COLORS[prefix] ?? '#888888'
}
