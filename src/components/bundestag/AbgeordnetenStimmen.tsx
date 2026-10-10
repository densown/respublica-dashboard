import { useMemo, useState, type CSSProperties } from 'react'
import { Badge, Chip, EmptyState, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'
import { labelColorForLegendDot, shortFraktionName } from './AbstimmungsDetail'

/**
 * Durchsuchbare Liste aller Abgeordneten einer namentlichen Abstimmung.
 *
 * Das Halbrund zeigt das Bild, diese Liste beantwortet die Frage, mit der die
 * meisten kommen: Wie hat meine Abgeordnete, mein Abgeordneter gestimmt? Und:
 * Wer ist von der eigenen Fraktion abgewichen?
 */

export type Stimme = 'yes' | 'no' | 'abstain' | 'no_show'

export type StimmenZeile = {
  mandate_id: number
  vote: string
  abgeordneter_name: string
}

export type AbgeordneterInfo = {
  aw_id: number
  name: string
  fraktion: string
  wahlkreis: string
}

type Eintrag = {
  awId: number
  name: string
  nachname: string
  fraktion: string
  wahlkreis: string
  stimme: Stimme
  abweichung: boolean
}

const STIMMEN: Stimme[] = ['yes', 'no', 'abstain', 'no_show']
const SEITE = 40
const SSW_NAME = 'Stefan Seidler'

function normalizeStimme(raw: string): Stimme {
  const v = raw.trim().toLowerCase()
  if (v === 'yes') return 'yes'
  if (v === 'no') return 'no'
  if (v === 'abstain' || v === 'abstention') return 'abstain'
  return 'no_show'
}

function nachnameAus(name: string): string {
  const parts = name.trim().replace(/\s+/g, ' ').split(' ')
  return parts[parts.length - 1] ?? name
}

function fuerSuche(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
}

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

/** Fraktionen ohne gemeinsame Linie: dort gibt es keine Abweichung. */
function hatFraktionslinie(fraktion: string): boolean {
  return fraktion !== 'Fraktionslos' && fraktion !== 'SSW'
}

export interface AbgeordnetenStimmenProps {
  votes: StimmenZeile[]
  abgeordnete: Map<number, AbgeordneterInfo>
  sitzverteilung: { partei: string; farbe: string }[]
  onSelect: (awId: number) => void
}

export function AbgeordnetenStimmen({
  votes,
  abgeordnete,
  sitzverteilung,
  onSelect,
}: AbgeordnetenStimmenProps) {
  const { c, t, theme } = useTheme()
  const [suche, setSuche] = useState('')
  const [stimmeFilter, setStimmeFilter] = useState<Stimme | null>(null)
  const [fraktionFilter, setFraktionFilter] = useState<string | null>(null)
  const [nurAbweichler, setNurAbweichler] = useState(false)
  const [sichtbar, setSichtbar] = useState(SEITE)

  const eintraege = useMemo<Eintrag[]>(() => {
    const basis = votes.map((v) => {
      const info = abgeordnete.get(v.mandate_id)
      const name = info?.name ?? v.abgeordneter_name
      const fraktion =
        name.trim() === SSW_NAME
          ? 'SSW'
          : info
            ? shortFraktionName(info.fraktion)
            : '–'
      return {
        awId: v.mandate_id,
        name,
        nachname: nachnameAus(name),
        fraktion,
        wahlkreis: info?.wahlkreis ?? '',
        stimme: normalizeStimme(v.vote),
        abweichung: false,
      }
    })

    // Mehrheit je Fraktion unter den abgegebenen Stimmen. Nichtteilnahme ist
    // keine inhaltliche Abweichung, wie im Themenprofil der Abgeordneten.
    const zaehler = new Map<string, Record<Stimme, number>>()
    for (const e of basis) {
      if (e.stimme === 'no_show') continue
      const z = zaehler.get(e.fraktion) ?? { yes: 0, no: 0, abstain: 0, no_show: 0 }
      z[e.stimme] += 1
      zaehler.set(e.fraktion, z)
    }
    const mehrheit = new Map<string, Stimme>()
    for (const [fraktion, z] of zaehler) {
      const top = (['yes', 'no', 'abstain'] as Stimme[]).sort((a, b) => z[b] - z[a])[0]
      mehrheit.set(fraktion, top)
    }

    return basis
      .map((e) => ({
        ...e,
        abweichung:
          e.stimme !== 'no_show' &&
          hatFraktionslinie(e.fraktion) &&
          mehrheit.get(e.fraktion) !== e.stimme,
      }))
      .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de', { sensitivity: 'base' }))
  }, [votes, abgeordnete])

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

  const zahlAbweichler = useMemo(
    () => eintraege.filter((e) => e.abweichung).length,
    [eintraege],
  )

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
  const stimmeBadge: Record<Stimme, 'yes' | 'no' | 'muted' | 'gray'> = {
    yes: 'yes',
    no: 'no',
    abstain: 'muted',
    no_show: 'gray',
  }

  const farbe = (fraktion: string) =>
    labelColorForLegendDot(fraktion, sitzverteilung, theme === 'dark' ? 'dark' : 'light')

  const zuruecksetzen = (fn: () => void) => {
    fn()
    setSichtbar(SEITE)
  }

  if (votes.length === 0) {
    return <EmptyState text={t('memberListEmpty')} />
  }

  return (
    <div>
      <h2
        style={{
          margin: `0 0 ${spacing.xs}px`,
          fontFamily: fonts.display,
          fontSize: fontSize.xl,
          lineHeight: lineHeight.tight,
          color: c.ink,
        }}
      >
        {t('memberListTitle')}
      </h2>
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

      <div
        role="group"
        aria-label={t('memberListFilterVote')}
        style={chipLeiste(spacing.sm)}
      >
        <Chip
          dense
          label={`${t('memberListAll')} ${eintraege.length}`}
          active={stimmeFilter == null}
          onClick={() => zuruecksetzen(() => setStimmeFilter(null))}
        />
        {STIMMEN.filter((s) => zahlJeStimme[s] > 0).map((s) => (
          <Chip
            key={s}
            dense
            label={`${stimmeLabel[s]} ${zahlJeStimme[s]}`}
            dot={s === 'yes' ? c.yes : s === 'no' ? c.no : s === 'abstain' ? c.abstain : c.absent}
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

      <div
        role="group"
        aria-label={t('memberListFilterParty')}
        style={chipLeiste(spacing.lg)}
      >
        {fraktionen.map(([f, n]) => (
          <Chip
            key={f}
            dense
            label={`${f} ${n}`}
            dot={farbe(f)}
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
                    borderRadius: radius.xs,
                    background: farbe(e.fraktion),
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
                    {e.fraktion}
                    {e.wahlkreis ? `, ${e.wahlkreis}` : ''}
                  </span>
                </span>
                {e.abweichung && (
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: fontSize.micro,
                      color: c.red,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('memberListDeviates')}
                  </span>
                )}
                <Badge text={stimmeLabel[e.stimme]} variant={stimmeBadge[e.stimme]} />
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
