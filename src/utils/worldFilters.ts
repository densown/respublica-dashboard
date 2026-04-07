/**
 * Filtert World-Bank-Aggregate raus. Nur echte Länder durchlassen.
 * Prüft das `region` Feld aus der World Bank API.
 */
export function isRealCountry(entry: { region?: string | null }): boolean {
  if (!entry.region) return false
  if (entry.region === 'Aggregates') return false
  return true
}

/**
 * True wenn mindestens eine Zeile ein nicht-leeres `region` hat (z. B. Ranking-API mit WB-Region).
 * Sonst liefern wir keine Regionsdaten — dann soll isRealCountry nicht alles entfernen.
 */
export function hasWorldBankRegionOnAnyRow<
  T extends { region?: string | null },
>(rows: T[]): boolean {
  return rows.some(
    (r) => r.region != null && String(r.region).trim() !== '',
  )
}
