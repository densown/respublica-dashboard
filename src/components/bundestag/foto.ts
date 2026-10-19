/**
 * Fotos der Abgeordneten: sie kommen ueber Wikidata von Wikimedia Commons
 * (scripts/fetch_abgeordnete_fotos.py in der API) und sind dort als
 * Special:Redirect-Adresse gespeichert. Commons rechnet sie per ?width=
 * auf die gebrauchte Groesse herunter; die Liste laedt sonst 630 Originale.
 */
const COMMONS_REDIRECT = /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:Redirect\/file\/([^?#]+)/

/** Kleinere Fassung fuer Commons-Fotos, andere Adressen bleiben, wie sie sind. */
export function fotoInGroesse(url: string, breitePx: number): string {
  if (!COMMONS_REDIRECT.test(url) || url.includes('?')) return url
  return `${url}?width=${breitePx}`
}

/** Dateiseite auf Commons mit Urheber und Lizenz, null bei anderen Quellen. */
export function fotoDateiseite(url: string | null | undefined): string | null {
  const m = url ? COMMONS_REDIRECT.exec(url) : null
  return m ? `https://commons.wikimedia.org/wiki/File:${m[1]}` : null
}

export function initialen(name: string): string {
  const teile = name.split(' ').filter(Boolean)
  const auswahl = teile.length > 1 ? [teile[0], teile[teile.length - 1]] : teile
  return auswahl.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

