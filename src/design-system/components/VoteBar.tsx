import { useCallback, useMemo, useState } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type VoteBarProps = {
  label: string
  labelColor?: string
  ja: number
  nein: number
  enthalten: number
  abwesend: number
  /** Standard: grauer Track. outline = transparent mit Rand */
  trackVariant?: 'default' | 'outline'
  /** Stimmfarben im Balken (überschreibt Theme) */
  segmentColors?: {
    ja: string
    nein: string
    enthalten: string
    abwesend: string
  }
  /**
   * Ausklapp-Bereich unter dem Balken:
   * all = alle vier Zahlen (Default),
   * secondary = nur Enthalten/Abwesend
   */
  expandedDetails?: 'all' | 'secondary'
}

const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'

export function VoteBar({
  label,
  labelColor,
  ja,
  nein,
  enthalten,
  abwesend,
  trackVariant = 'default',
  segmentColors,
  expandedDetails = 'all',
}: VoteBarProps) {
  const { c, t } = useTheme()
  const [open, setOpen] = useState(false)

  const total = ja + nein + enthalten + abwesend
  const pct = useMemo(() => {
    if (total <= 0) return { ja: 0, nein: 0, enthalten: 0, abwesend: 0 }
    return {
      ja: (ja / total) * 100,
      nein: (nein / total) * 100,
      enthalten: (enthalten / total) * 100,
      abwesend: (abwesend / total) * 100,
    }
  }, [ja, nein, enthalten, abwesend, total])

  const toggle = useCallback(() => setOpen((v) => !v), [])

  const lc = labelColor ?? c.ink
  const colJa = segmentColors?.ja ?? c.yes
  const colNein = segmentColors?.nein ?? c.no
  const colEnthalten = segmentColors?.enthalten ?? c.abstain
  const colAbwesend = segmentColors?.abwesend ?? c.absent

  const trackBg =
    trackVariant === 'outline' ? 'transparent' : c.bgHover
  const trackBorder =
    trackVariant === 'outline' ? `1px solid ${c.border}` : undefined

  return (
    <div style={{ marginBottom: spacing.md }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
        aria-expanded={open}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
            marginBottom: spacing.xs,
          }}
        >
          <span
            style={{
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: '0.88rem',
              color: lc,
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.68rem',
              color: c.muted,
              flexShrink: 0,
              textAlign: 'right',
            }}
          >
            {ja} {t('yes')} / {nein} {t('no')}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            height: 10,
            borderRadius: 4,
            overflow: 'hidden',
            background: trackBg,
            border: trackBorder,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: `${pct.ja}%`,
              background: colJa,
              transition: `width 0.45s ${transition}`,
            }}
          />
          <div
            style={{
              width: `${pct.nein}%`,
              background: colNein,
              transition: `width 0.45s ${transition}`,
            }}
          />
          <div
            style={{
              width: `${pct.enthalten}%`,
              background: colEnthalten,
              transition: `width 0.45s ${transition}`,
            }}
          />
          <div
            style={{
              width: `${pct.abwesend}%`,
              background: colAbwesend,
              transition: `width 0.45s ${transition}`,
            }}
          />
        </div>
      </button>
      {open && (
        <div
          style={{
            marginTop: spacing.sm,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: spacing.sm,
            fontFamily: fonts.mono,
            fontSize: '0.65rem',
            color: c.muted,
          }}
        >
          {expandedDetails === 'all' ? (
            <>
              <span>
                {t('yes')}: {ja}
              </span>
              <span>
                {t('no')}: {nein}
              </span>
              <span>
                {t('abstained')}: {enthalten}
              </span>
              <span>
                {t('absentL')}: {abwesend}
              </span>
            </>
          ) : (
            <>
              <span>
                {t('abstained')}: {enthalten}
              </span>
              <span>
                {t('absentL')}: {abwesend}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
