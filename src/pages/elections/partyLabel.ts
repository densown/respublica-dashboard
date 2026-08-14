/**
 * Ordnet die Partei-Bezeichnungen aus abgeordnetenwatch den Slugs aus
 * partyColors.ts zu, damit Kandidaturen dieselben Farben tragen wie Umfragen
 * und Wahlergebnisse.
 *
 * Nur Darstellung: Parteien ohne eigene Farbe landen auf `other` und werden
 * grau gezeichnet — sie verschwinden dadurch nicht, sie sind nur nicht
 * eingefaerbt.
 */

/** abgeordnetenwatch setzt weiche Trennstriche in Labels ("BÜNDNIS 90/­DIE GRÜNEN"). */
function normalisiere(label: string): string {
  return label
    .replace(/­/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function partyLabelToSlug(label: string | null | undefined): string {
  if (!label) return 'other'
  const s = normalisiere(label)

  if (s.includes('grün') || s.includes('bündnis 90')) return 'gruene'
  if (s.includes('linke') || s.includes('pds')) return 'linke_pds'
  if (s.includes('freie wähler')) return 'freie_waehler'
  if (s.includes('die partei')) return 'die_partei'
  // "Die Heimat" ist die 2023 umbenannte NPD und teilt deren Slug.
  if (s.includes('heimat') || s === 'npd') return 'npd'
  if (s.includes('bsw') || s.includes('bündnis sahra')) return 'bsw'
  if (s.startsWith('cdu') || s.startsWith('csu') || s.includes('cdu/csu')) return 'cdu_csu'
  if (s === 'spd' || s.startsWith('spd ')) return 'spd'
  if (s === 'fdp' || s.startsWith('fdp ')) return 'fdp'
  if (s === 'afd' || s.startsWith('afd ')) return 'afd'
  if (s.includes('piraten')) return 'piraten'
  return 'other'
}

/** Anzeigename ohne weiche Trennstriche. */
export function cleanPartyLabel(label: string | null | undefined): string {
  if (!label) return '—'
  return label.replace(/­/g, '').replace(/\s+/g, ' ').trim()
}
