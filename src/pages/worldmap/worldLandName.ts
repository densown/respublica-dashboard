/**
 * Laendernamen in der Sprache der Oberflaeche. Die Geodaten und die API
 * liefern nur englische Namen; der Browser kennt die deutschen ueber
 * Intl.DisplayNames (ISO 3166 alpha-2). Wo das fehlt, bleibt der gelieferte Name.
 */
type Sprache = 'de' | 'en'

const cache = new Map<Sprache, Intl.DisplayNames | null>()

function namen(lang: Sprache): Intl.DisplayNames | null {
  if (!cache.has(lang)) {
    try {
      cache.set(lang, new Intl.DisplayNames([lang], { type: 'region' }))
    } catch {
      cache.set(lang, null)
    }
  }
  return cache.get(lang) ?? null
}

export function landName(
  iso2: string | null | undefined,
  lang: string,
  fallback: string,
): string {
  const code = iso2?.trim().toUpperCase()
  if (!code || !/^[A-Z]{2}$/.test(code)) return fallback
  try {
    const n = namen(lang === 'de' ? 'de' : 'en')?.of(code)
    return n && n !== code ? n : fallback
  } catch {
    return fallback
  }
}
