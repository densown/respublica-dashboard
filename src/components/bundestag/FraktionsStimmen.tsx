import { useTheme, VoteBar } from '../../design-system'
import { fontSize, fonts, lineHeight, motion, spacing } from '../../design-system/tokens'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { abweichlerNotiz, stimmenKurz } from './abstimmungText'
import {
  fraktionsFlaeche,
  fraktionsGroesse,
  fraktionsSchrift,
  nachGroesse,
  shortFraktionName,
  type FraktionsErgebnis,
} from './fraktion'
import type { StimmEintrag } from './stimmen'

export interface FraktionsStimmenProps {
  fraktionen: FraktionsErgebnis[]
  /** Abweichende je Fraktion (gekuerzter Name), aus abweichlerJeFraktion(). */
  abweichler: Map<string, StimmEintrag[]>
  /** Tipp auf eine Zeile: Liste auf diese Fraktion filtern. */
  onFraktion?: (kurzname: string) => void
}

/**
 * Eine Zeile je Fraktion wie auf den Abstimmungskarten: Name in Parteifarbe
 * mit Farbstreifen, durchgehender Balken, darunter rot, wer abgewichen ist.
 * Groesste Fraktion oben, Fraktionslose zuletzt. Alle Balken haben denselben
 * Massstab: die groesste Fraktion fuellt die Breite, jede Stimme ist in jeder
 * Zeile gleich breit.
 */
export function FraktionsStimmen({ fraktionen, abweichler, onFraktion }: FraktionsStimmenProps) {
  const { c, t, theme } = useTheme()
  const dunkel = theme === 'dark'
  const isMobile = useIsMobile()
  const zeilen = nachGroesse(fraktionen)
  const groesste = Math.max(0, ...zeilen.map(fraktionsGroesse))

  return (
    <div role="list">
      {zeilen.map((f) => {
        const kurz = shortFraktionName(f.partei)
        const notiz = abweichlerNotiz(f, abweichler.get(kurz), t)
        const kurzfassung = stimmenKurz(f, t)
        return (
          <div role="listitem" key={f.partei}>
            <button
              type="button"
              className="rp-chip"
              onClick={onFraktion ? () => onFraktion(kurz) : undefined}
              disabled={!onFraktion}
              aria-label={`${kurz}: ${kurzfassung}${notiz ? `. ${notiz}` : ''}`}
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '11rem minmax(0, 1fr)',
                alignItems: 'start',
                columnGap: spacing.lg,
                rowGap: spacing.xs,
                padding: `${spacing.sm}px 0`,
                minHeight: 44,
                background: 'transparent',
                border: 'none',
                color: c.ink,
                textAlign: 'left',
                cursor: onFraktion ? 'pointer' : 'default',
                transition: `background ${motion.fast} ${motion.easing}`,
              }}
              onMouseEnter={(e) => {
                if (onFraktion) e.currentTarget.style.background = c.bgHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  minHeight: 32,
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: fontSize.lg,
                  lineHeight: lineHeight.tight,
                  color: fraktionsSchrift(kurz, dunkel),
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    alignSelf: 'stretch',
                    background: fraktionsFlaeche(kurz, dunkel),
                    flexShrink: 0,
                  }}
                />
                {kurz}
              </span>
              <span style={{ display: 'block', minWidth: 0 }}>
                <VoteBar
                  ja={f.ja}
                  nein={f.nein}
                  enthalten={f.enthalten}
                  abwesend={f.abwesend}
                  height={32}
                  bezug={groesste}
                  ariaLabel={kurzfassung}
                />
                {notiz && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: spacing.xs,
                      fontFamily: fonts.body,
                      fontStyle: 'italic',
                      fontWeight: 600,
                      fontSize: fontSize.sm,
                      lineHeight: lineHeight.normal,
                      color: c.red,
                    }}
                  >
                    {notiz}
                  </span>
                )}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
