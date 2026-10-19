import { useMemo, useState, type CSSProperties } from 'react'
import { Chip, EmptyState, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'
import { stimmFlaeche } from '../../design-system/palettes'
import { StimmMarke } from './StimmMarke'
import { fraktionsFlaeche, OHNE_FRAKTION, wahlkreisKurz } from './fraktion'
import { fuerSuche, STIMMEN, type Stimme, type StimmEintrag } from './stimmen'

/**
 * Durchsuchbare Liste aller Abgeordneten einer namentlichen Abstimmung.
 *
 * Die Balken zeigen das Bild, diese Liste beantwortet die Frage, mit der die
 * meisten kommen: Wie hat meine Abgeordnete, mein Abgeordneter gestimmt? Und:
 * Wer ist von der eigenen Fraktion abgewichen?
 */

const SEITE = 40

const STIMM_ART = {
  yes: 'ja',
  no: 'nein',
  abstain: 'enthalten',
  no_show: 'abwesend',
} as const

/**
 * Chip-Reihe, die auf dem Handy waagerecht in sich scrollt statt in vier
 * Zeilen umzubrechen: die Liste selbst soll ohne Daumenarbeit sichtbar sein.
 */
function chipLeiste(abstandUnten: number): CSSProperties {
  return {
    display: 'flex',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    gap: spacing.sm,
    marginBottom: abstandUnten,
    paddingBottom: spacing.xs,
    scrollbarWidth: 'thin',
  }
}

export interface AbgeordnetenStimmenProps {
  /** Aus stimmEintraege(), dieselben Eintraege wie fuer die Notizen am Balken. */
  eintraege: StimmEintrag[]
  onSelect: (awId: number) => void
  /**
   * Fraktionsfilter von aussen setzen, etwa per Tipp auf einen
   * Fraktionsbalken. Ohne diese Props filtert die Liste fuer sich.
   */
  fraktion?: string | null
  onFraktionChange?: (fraktion: string | null) => void
}

export function AbgeordnetenStimmen({
  eintraege,
  onSelect,
  fraktion,
  onFraktionChange,
}: AbgeordnetenStimmenProps) {
  const { c, t, theme } = useTheme()
  const dunkel = theme === 'dark'
  const [suche, setSuche] = useState('')
  const [stimmeFilter, setStimmeFilter] = useState<Stimme | null>(null)
  const [eigeneFraktion, setEigeneFraktion] = useState<string | null>(null)
  const [nurAbweichler, setNurAbweichler] = useState(false)
  const [sichtbar, setSichtbar] = useState(SEITE)

  const fraktionFilter = fraktion !== undefined ? fraktion : eigeneFraktion
  const setFraktionFilter = onFraktionChange ?? setEigeneFraktion

  const fraktionen = useMemo(() => {
    const zahl = new Map<string, number>()
    for (const e of eintraege) zahl.set(e.fraktion, (zahl.get(e.fraktion) ?? 0) + 1)
    return [...zahl.entries()].sort((a, b) => b[1] - a[1])
  }, [eintraege])

  const zahlJeStimme = useMemo(() => {
    const z: Record<Stimme, number> = { yes: 0, no: 0, abstain: 0, no_show: 0 }
    for (const e of eintraege) z[e.stimme] += 1
    return z
  }, [eintraege])

  const zahlAbweichler = useMemo(() => eintraege.filter((e) => e.abweichung).length, [eintraege])

  const gefiltert = useMemo(() => {
    const q = fuerSuche(suche.trim())
    return eintraege.filter((e) => {
      if (stimmeFilter && e.stimme !== stimmeFilter) return false
      if (fraktionFilter && e.fraktion !== fraktionFilter) return false
      if (nurAbweichler && !e.abweichung) return false
      if (q && !fuerSuche(`${e.name} ${e.wahlkreis}`).includes(q)) return false
      return true
    })
  }, [eintraege, suche, stimmeFilter, fraktionFilter, nurAbweichler])

  const stimmeLabel: Record<Stimme, string> = {
    yes: t('yes'),
    no: t('no'),
    abstain: t('abstain'),
    no_show: t('absentL'),
  }

  const fraktionsName = (f: string) => (f === OHNE_FRAKTION ? t('memberListNoGroup') : f)

  const zuruecksetzen = (fn: () => void) => {
    fn()
    setSichtbar(SEITE)
  }

  if (eintraege.length === 0) {
    return <EmptyState text={t('memberListEmpty')} />
  }

  return (
    <div>
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
        {t('memberListHint')}
      </p>

      <input
        type="search"
        value={suche}
        onChange={(e) => zuruecksetzen(() => setSuche(e.target.value))}
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

      <div role="group" aria-label={t('memberListFilterVote')} style={chipLeiste(spacing.sm)}>
        <Chip
          dense
          label={`${t('memberListAll')} ${eintraege.length}`}
          active={stimmeFilter == null && !nurAbweichler}
          onClick={() =>
            zuruecksetzen(() => {
              setStimmeFilter(null)
              setNurAbweichler(false)
            })
          }
        />
        {STIMMEN.filter((s) => zahlJeStimme[s] > 0).map((s) => (
          <Chip
            key={s}
            dense
            label={`${stimmeLabel[s]} ${zahlJeStimme[s]}`}
            // Chip kennt nur Farbpunkte; fuer "nicht abgestimmt" die Schraffurfarbe
            dot={s === 'no_show' ? c.hatch : stimmFlaeche(STIMM_ART[s], c)}
            active={stimmeFilter === s}
            onClick={() => zuruecksetzen(() => setStimmeFilter(stimmeFilter === s ? null : s))}
          />
        ))}
        {zahlAbweichler > 0 && (
          <Chip
            dense
            label={`${t('memberListDeviators')} ${zahlAbweichler}`}
            active={nurAbweichler}
            onClick={() => zuruecksetzen(() => setNurAbweichler(!nurAbweichler))}
          />
        )}
      </div>

      <div role="group" aria-label={t('memberListFilterParty')} style={chipLeiste(spacing.lg)}>
        {fraktionen.map(([f, n]) => (
          <Chip
            key={f}
            dense
            label={`${fraktionsName(f)} ${n}`}
            dot={fraktionsFlaeche(f, dunkel)}
            active={fraktionFilter === f}
            onClick={() => zuruecksetzen(() => setFraktionFilter(fraktionFilter === f ? null : f))}
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
          {gefiltert.slice(0, sichtbar).map((e) => (
            <li key={e.awId} style={{ borderBottom: `1px solid ${c.border}` }}>
              <button
                type="button"
                className="rp-chip"
                onClick={() => onSelect(e.awId)}
                style={{
                  width: '100%',
                  minHeight: 56,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm}px 0`,
                  background: 'transparent',
                  border: 'none',
                  color: c.ink,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    alignSelf: 'stretch',
                    width: 4,
                    background: fraktionsFlaeche(e.fraktion, dunkel),
                    flexShrink: 0,
                  }}
                />
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
                    {e.name}
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
                    {fraktionsName(e.fraktion)}
                    {e.wahlkreis ? `, ${wahlkreisKurz(e.wahlkreis)}` : ''}
                  </span>
                </span>
                <span
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: spacing.xs,
                    flexShrink: 0,
                  }}
                >
                  <StimmMarke stimme={e.stimme} />
                  {e.abweichung && (
                    <span
                      style={{
                        fontFamily: fonts.body,
                        fontStyle: 'italic',
                        fontWeight: 600,
                        fontSize: fontSize.xs,
                        color: c.red,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('memberListDeviates')}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {gefiltert.length > sichtbar && (
        <div style={{ marginTop: spacing.lg, display: 'flex', justifyContent: 'center' }}>
          <Chip
            label={t('memberListMore').replace('{n}', String(gefiltert.length - sichtbar))}
            onClick={() => setSichtbar(sichtbar + SEITE * 2)}
          />
        </div>
      )}
    </div>
  )
}
