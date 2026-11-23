import { useId, useMemo, useState } from 'react'
import { Piktogramm, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import type { MeinOrt } from '../../hooks/useMeins'
import { wahlkreisTeile } from '../bundestag/fraktion'
import type { AbgeordnetenApiRow } from '../bundestag/sitzplaetze'
import { fuerSuche } from '../bundestag/stimmen'

/**
 * "Wo wohnst du?": Feld mit Vorschlaegen aus den Namen der 299 Wahlkreise.
 * Eine Zuordnung von Postleitzahlen gibt es in der API nicht, deshalb der
 * Name: Wahlkreise heissen nach Stadt oder Landkreis. Die Liste der
 * Abgeordneten wird erst geladen, wenn jemand das Feld anfasst.
 */
export function WahlkreisFrage({
  onWahl,
  autoFocus,
}: {
  onWahl: (ort: MeinOrt) => void
  autoFocus?: boolean
}) {
  const { c, t } = useTheme()
  const [text, setText] = useState('')
  const [angefasst, setAngefasst] = useState(Boolean(autoFocus))
  const listeId = useId()
  const { data } = useApi<AbgeordnetenApiRow[]>(angefasst ? '/api/abgeordnete' : '')

  const wahlkreise = useMemo(() => {
    const nachName = new Map<string, MeinOrt>()
    for (const a of data ?? []) {
      const w = wahlkreisTeile(a.wahlkreis)
      if (w && !nachName.has(w.name)) nachName.set(w.name, w)
    }
    return [...nachName.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [data])

  const q = fuerSuche(text.trim())
  const treffer = useMemo(() => {
    if (q.length < 2) return []
    const vorn = wahlkreise.filter((w) => fuerSuche(w.name).startsWith(q))
    const mitten = wahlkreise.filter((w) => !fuerSuche(w.name).startsWith(q) && fuerSuche(w.name).includes(q))
    return [...vorn, ...mitten].slice(0, 6)
  }, [q, wahlkreise])

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <span
          aria-hidden
          style={{ position: 'absolute', left: spacing.md, top: 14, color: c.red, display: 'inline-flex' }}
        >
          <Piktogramm name="ort" size={20} />
        </span>
        <input
          type="search"
          value={text}
          autoFocus={autoFocus}
          onFocus={() => setAngefasst(true)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && treffer[0]) onWahl(treffer[0])
          }}
          placeholder={t('ortPlatzhalter')}
          aria-label={t('ortFrage')}
          aria-controls={listeId}
          autoComplete="off"
          enterKeyHint="search"
          style={{
            width: '100%',
            minHeight: 48,
            boxSizing: 'border-box',
            padding: `0 ${spacing.md}px 0 ${spacing.md + 28}px`,
            border: `1px solid ${c.ink}`,
            borderRadius: radius.sm,
            background: c.inputBg,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: fontSize.base,
          }}
        />
      </div>
      <ul id={listeId} aria-live="polite" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {treffer.map((w) => (
          <li key={w.name}>
            <button
              type="button"
              className="rp-zeile"
              onClick={() => onWahl(w)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: spacing.md,
                width: '100%',
                minHeight: 44,
                padding: `${spacing.sm}px ${spacing.xs}px`,
                border: 'none',
                borderBottom: `1px solid ${c.border}`,
                background: 'transparent',
                color: c.ink,
                fontFamily: fonts.body,
                fontSize: fontSize.base,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span>{w.name}</span>
              {w.nummer && (
                <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, whiteSpace: 'nowrap' }}>
                  {t('ortWahlkreisNr').replace('{n}', w.nummer)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p
        style={{
          margin: `${spacing.sm}px 0 0`,
          fontFamily: fonts.body,
          fontSize: fontSize.sm,
          lineHeight: lineHeight.normal,
          color: c.muted,
        }}
      >
        {q.length >= 2 && data && treffer.length === 0 ? t('ortKeinTreffer') : t('ortHinweis')}
      </p>
    </div>
  )
}
