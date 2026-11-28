/**
 * Bereinigt KI-Zusammenfassungen fuer die Anzeige.
 *
 * Die Modelle liefern teils Markdown mit: eine fette Vorzeile wie
 * "**Kurzfassung (2-3 Saetze):**", Sternchen mitten im Text, Rautenzeilen.
 * Die App zeigt Fliesstext, also fliegt das Markup raus. Die Daten in der
 * Datenbank bleiben unveraendert.
 */

// Vorzeilen, die nur die Aufgabe aus dem Prompt wiederholen
const WORT = '(?:Kurzfassung|Zusammenfassung|Erkl(?:ä|ae)rung|Summary|Short summary|Brief summary|Overview)'
// fett: "**Kurzfassung (2-3 Saetze):**" oder "**Zusammenfassung**", danach beliebig weiter
const VORZEILE_FETT = new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:\\*\\*|__)\\s*${WORT}\\b[^*\\n]{0,60}?(?:\\*\\*|__)\\s*:?\\s*`, 'i')
// ohne Markup nur, wenn die Vorzeile allein in ihrer Zeile steht
const VORZEILE_ZEILE = new RegExp(`^\\s*(?:#{1,6}\\s*)?${WORT}\\b[^\\n]{0,60}?:?[ \\t]*\\n+`, 'i')

export function kiText(roh: string | null | undefined): string {
  let s = (roh ?? '').trim()
  if (!s) return ''
  s = s.replace(VORZEILE_FETT, '').replace(VORZEILE_ZEILE, '')
  s = s
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/__(.+?)__/gs, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
  return s.trim()
}
