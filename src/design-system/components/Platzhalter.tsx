import { radius, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type PlatzhalterProps = {
  /** Zahl der Karten oder Zeilen, die angedeutet werden. */
  zeilen?: number
  /** 'karte': Titel, Balken, zwei Zeilen. 'zeile': eine Listenzeile. */
  form?: 'karte' | 'zeile'
}

/**
 * Platzhalter beim ersten Laden in der Form des Inhalts. Ein Kreisel sagt
 * nur "warte", die Form sagt schon, was kommt, und die Seite springt nicht,
 * wenn die Daten da sind.
 */
export function Platzhalter({ zeilen = 3, form = 'karte' }: PlatzhalterProps) {
  const { c, t } = useTheme()
  const strich = (breite: string, hoehe: number) => (
    <div
      className="rp-skeleton-bar"
      style={{ width: breite, height: hoehe, background: c.border, borderRadius: radius.xs }}
    />
  )
  return (
    <div role="status" aria-label={t('loading')} style={{ display: 'grid', gap: spacing.lg }}>
      {Array.from({ length: zeilen }, (_, i) =>
        form === 'karte' ? (
          <div key={i} style={{ display: 'grid', gap: spacing.md, padding: `${spacing.lg}px 0`, borderTop: `1px solid ${c.border}` }}>
            {strich('72%', 20)}
            {strich('100%', 10)}
            {strich('46%', 12)}
            {strich('38%', 12)}
          </div>
        ) : (
          <div key={i} style={{ display: 'flex', gap: spacing.md, alignItems: 'center', padding: `${spacing.sm}px 0` }}>
            <div className="rp-skeleton-bar" style={{ width: 40, height: 40, borderRadius: '50%', background: c.border }} />
            <div style={{ flex: 1, display: 'grid', gap: spacing.sm }}>
              {strich('44%', 14)}
              {strich('62%', 10)}
            </div>
          </div>
        ),
      )}
    </div>
  )
}
