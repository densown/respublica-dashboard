import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import { fonts, fontSize, lineHeight, radius, spacing } from '../../design-system/tokens'
import { cleanPartyLabel, partyLabelToSlug } from './partyLabel'
import { partyColorsForTheme } from './partyColors'

export type Spitzenkandidatur = {
  aw_id: number
  name: string
  partei: string
  wahlkreis: string | null
  foto_url: string | null
  profil_url: string | null
}

type Props = {
  kandidaturen: Spitzenkandidatur[]
  constituencyLabel: string
}

/** "Susan Sziborra-Seidlitz" -> "SS". Ersatz, wo kein Foto vorliegt. */
function initialen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean)
  if (!teile.length) return '?'
  if (teile.length === 1) return teile[0].slice(0, 2).toUpperCase()
  return (teile[0][0] + teile[teile.length - 1][0]).toUpperCase()
}

/**
 * Spitzenkandidaturen einer Wahl.
 *
 * Abgeleitet aus Listenplatz 1 der Landesliste — abgeordnetenwatch kennzeichnet
 * Spitzenkandidaturen nicht. Wer eine Landesliste anfuehrt, ist das Gesicht der
 * Partei im Wahlkampf; Parteien ohne Landesliste erscheinen deshalb nicht.
 *
 * Fotos sind die Ausnahme, nicht die Regel: Wikidata fuehrt Landtagskandidaten
 * praktisch nicht. Der Entwurf setzt deshalb auf Initialen in der Parteifarbe
 * und wirkt vollstaendig, auch wenn kein einziges Foto vorliegt — ein Raster
 * aus grauen Platzhaltern haette unfertig ausgesehen.
 */
export function TopCandidates({ kandidaturen, constituencyLabel }: Props) {
  const { c, theme } = useTheme()
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  if (!kandidaturen.length) return null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: spacing.md,
      }}
    >
      {kandidaturen.map((k) => {
        const farbe = partyColors[partyLabelToSlug(k.partei)] ?? partyColors.other
        const inhalt = (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                marginBottom: spacing.md,
              }}
            >
              {k.foto_url ? (
                <img
                  src={k.foto_url}
                  alt=""
                  loading="lazy"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: radius.pill,
                    objectFit: 'cover',
                    border: `2px solid ${farbe}`,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  aria-hidden
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: radius.pill,
                    background: farbe,
                    color: c.badgeText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: fonts.mono,
                    fontSize: fontSize.lg,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initialen(k.name)}
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSize.micro,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: farbe,
                    marginBottom: 2,
                  }}
                >
                  {cleanPartyLabel(k.partei)}
                </div>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: fontSize.lg,
                    lineHeight: lineHeight.tight,
                    color: c.ink,
                  }}
                >
                  {k.name}
                </div>
              </div>
            </div>

            {k.wahlkreis && (
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                  color: c.muted,
                }}
              >
                {constituencyLabel} {k.wahlkreis}
              </div>
            )}
          </>
        )

        const rahmen: React.CSSProperties = {
          display: 'block',
          padding: spacing.lg,
          border: `1px solid ${c.border}`,
          // Farbkante links statt farbiger Flaeche: die Karte bleibt ruhig,
          // die Partei ist trotzdem auf einen Blick erkennbar.
          borderLeft: `3px solid ${farbe}`,
          borderRadius: radius.lg,
          background: c.cardBg,
          textDecoration: 'none',
          minWidth: 0,
        }

        return k.profil_url ? (
          <a
            key={k.aw_id}
            href={k.profil_url}
            target="_blank"
            rel="noopener noreferrer"
            style={rahmen}
          >
            {inhalt}
          </a>
        ) : (
          <div key={k.aw_id} style={rahmen}>
            {inhalt}
          </div>
        )
      })}
    </div>
  )
}
