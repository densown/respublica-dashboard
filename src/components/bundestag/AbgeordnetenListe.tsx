import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Chip, EmptyState, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, measure, radius, spacing } from '../../design-system/tokens'
import { Portraet } from './Portraet'
import { fraktionsFlaeche, OHNE_FRAKTION, wahlkreisKurz } from './fraktion'
import type { SitzAbgeordneter } from './sitzplaetze'
import { fuerSuche, nachnameAus } from './stimmen'

/**
 * Alle heutigen Abgeordneten zum Durchsuchen: nach Name oder Wahlkreis, nach
 * Fraktion gefiltert, nach Nachname sortiert. Jede Zeile fuehrt zum Profil
 * unter /bundestag/abgeordnete/:awId. Aufgebaut wie die Liste auf der
 * Abstimmungsseite, nur ohne Stimme.
 */

const SEITE = 40

/** Wie in AbgeordnetenStimmen: auf dem Handy waagerecht scrollen statt umbrechen. */
const CHIP_LEISTE: CSSProperties = {
  display: 'flex',
  flexWrap: 'nowrap',
  overflowX: 'auto',
  gap: spacing.sm,
  marginBottom: spacing.lg,
  paddingBottom: spacing.xs,
  scrollbarWidth: 'thin',
}

export interface AbgeordnetenListeProps {
  /** Aus nachAwId(), Fraktion schon gekuerzt */
  abgeordnete: SitzAbgeordneter[]
}

export function AbgeordnetenListe({ abgeordnete }: AbgeordnetenListeProps) {
  const { c, t, theme } = useTheme()
  const dunkel = theme === 'dark'
  const [suche, setSuche] = useState('')
  const [fraktion, setFraktion] = useState<string | null>(null)
  const [sichtbar, setSichtbar] = useState(SEITE)

  const sortiert = useMemo(
    () =>
      [...abgeordnete].sort((a, b) =>
        nachnameAus(a.name).localeCompare(nachnameAus(b.name), 'de', { sensitivity: 'base' }),
      ),
    [abgeordnete],
  )

  const fraktionen = useMemo(() => {
    const zahl = new Map<string, number>()
    for (const a of abgeordnete) zahl.set(a.fraktion, (zahl.get(a.fraktion) ?? 0) + 1)
    return [...zahl.entries()].sort((a, b) => b[1] - a[1])
  }, [abgeordnete])

  const gefiltert = useMemo(() => {
    const q = fuerSuche(suche.trim())
    return sortiert.filter((a) => {
      if (fraktion && a.fraktion !== fraktion) return false
      // Wahlkreis mit Nummer, damit auch "92" oder "Köln" trifft
      if (q && !fuerSuche(`${a.name} ${a.wahlkreis}`).includes(q)) return false
      return true
    })
  }, [sortiert, suche, fraktion])

  const fraktionsName = (f: string) => (f === OHNE_FRAKTION || !f ? t('memberListNoGroup') : f)
  const neu = (fn: () => void) => {
    fn()
    setSichtbar(SEITE)
  }

  if (abgeordnete.length === 0) return <EmptyState text={t('dataLoadError')} />

  return (
    <div style={{ maxWidth: measure.liste }}>
      <p
        style={{
          margin: `0 0 ${spacing.lg}px`,
          fontFamily: fonts.body,
          fontSize: fontSize.md,
          lineHeight: lineHeight.normal,
          color: c.inkSoft,
          maxWidth: '68ch',
        }}
      >
        {t('bundestagMembersHint')}
      </p>
      <input
        type="search"
        value={suche}
        onChange={(e) => neu(() => setSuche(e.target.value))}
        placeholder={t('memberListSearch')}
        aria-label={t('memberListSearch')}
        autoComplete="off"
        style={{
          width: '100%',
          minHeight: 44,
          boxSizing: 'border-box',
          padding: `0 ${spacing.md}px`,
          border: `1px solid ${c.inputBorder}`,
          borderRadius: radius.md,
          background: c.inputBg,
          color: c.ink,
          fontFamily: fonts.body,
          fontSize: fontSize.base,
          marginBottom: spacing.md,
        }}
      />

      <div role="group" aria-label={t('memberListFilterParty')} style={CHIP_LEISTE}>
        <Chip
          dense
          label={`${t('memberListAll')} ${abgeordnete.length}`}
          active={fraktion == null}
          onClick={() => neu(() => setFraktion(null))}
        />
        {fraktionen.map(([f, n]) => (
          <Chip
            key={f}
            dense
            label={`${fraktionsName(f)} ${n}`}
            dot={fraktionsFlaeche(f, dunkel)}
            active={fraktion === f}
            onClick={() => neu(() => setFraktion(fraktion === f ? null : f))}
          />
        ))}
      </div>

      <div
        aria-live="polite"
        style={{
          fontFamily: fonts.mono,
          fontSize: fontSize.xs,
          color: c.muted,
          paddingBottom: spacing.sm,
          borderBottom: `1px solid ${c.ink}`,
        }}
      >
        {t('memberListCount').replace('{n}', String(gefiltert.length))}
      </div>

      {gefiltert.length === 0 ? (
        <EmptyState text={t('memberListNoMatch')} />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {gefiltert.slice(0, sichtbar).map((a) => (
            <li key={a.aw_id} style={{ borderBottom: `1px solid ${c.border}` }}>
              <Link
                to={`/bundestag/abgeordnete/${a.aw_id}`}
                className="rp-chip"
                style={{
                  minHeight: 56,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm}px 0`,
                  color: c.ink,
                  textDecoration: 'none',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    alignSelf: 'stretch',
                    width: 4,
                    background: fraktionsFlaeche(a.fraktion, dunkel),
                    flexShrink: 0,
                  }}
                />
                <Portraet name={a.name} fotoUrl={a.foto_url} groesse={40} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: fonts.body,
                      fontSize: fontSize.base,
                      fontWeight: 600,
                      lineHeight: lineHeight.tight,
                    }}
                  >
                    {a.name}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: spacing.xs,
                      fontFamily: fonts.mono,
                      fontSize: fontSize.xs,
                      color: c.muted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fraktionsName(a.fraktion)}
                    {a.wahlkreis ? `, ${wahlkreisKurz(a.wahlkreis)}` : ''}
                  </span>
                </span>
                <span aria-hidden style={{ color: c.muted, fontFamily: fonts.mono, flexShrink: 0 }}>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {gefiltert.length > sichtbar && (
        <div style={{ marginTop: spacing.lg, display: 'flex', justifyContent: 'center' }}>
          <Chip
            label={t('memberListMore').replace(
              '{n}',
              String(Math.min(gefiltert.length - sichtbar, SEITE * 2)),
            )}
            onClick={() => setSichtbar(sichtbar + SEITE * 2)}
          />
        </div>
      )}
    </div>
  )
}
