import type { ReactNode } from 'react'
import { Chip, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { PARTY_LABELS } from '../../pages/elections/partyColors'
import type { Standing } from '../../pages/elections/pollMath'

const OHNE = '-'

/**
 * "Erst tippen, dann aufdecken": vor dem Umfragestand die Frage, wer vorn
 * liegt. Wer getippt hat, schaut genauer hin. Der Tipp wird je Wahl im
 * Browser gemerkt, beim naechsten Besuch steht der Stand gleich da.
 */
export function ErstTippen({
  slug,
  werte,
  lang,
  children,
}: {
  slug: string
  werte: Standing[]
  lang: 'de' | 'en'
  children: ReactNode
}) {
  const { c, t } = useTheme()
  const [tipp, setTipp] = useLocalStorage<string | null>(`rp-tipp-${slug}`, null)
  const name = (partei: string) => PARTY_LABELS[partei]?.[lang] ?? partei
  const vorn = werte[0]
  if (!vorn || werte.length < 3) return <>{children}</>

  if (tipp == null) {
    const auswahl = werte
      .slice(0, 4)
      .map((w) => w.partei)
      .sort((a, b) => name(a).localeCompare(name(b), lang))
    return (
      <div
        style={{
          padding: spacing.lg,
          border: `1px solid ${c.ink}`,
          borderRadius: radius.sm,
          background: c.cardBg,
          maxWidth: 560,
        }}
      >
        <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: fontSize.xl, lineHeight: lineHeight.tight, color: c.ink }}>
          {t('tippFrage')}
        </div>
        <p style={{ margin: `${spacing.xs}px 0 ${spacing.md}px`, fontFamily: fonts.body, fontSize: fontSize.md, color: c.inkSoft }}>
          {t('tippText')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {auswahl.map((p) => (
            <Chip key={p} label={name(p)} onClick={() => setTipp(p)} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTipp(OHNE)}
          style={{
            marginTop: spacing.sm,
            minHeight: 44,
            padding: 0,
            border: 'none',
            background: 'transparent',
            fontFamily: fonts.body,
            fontSize: fontSize.sm,
            color: c.muted,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: 'pointer',
          }}
        >
          {t('tippOhne')}
        </button>
      </div>
    )
  }

  const wert = vorn.wert.toFixed(1).replace('.', lang === 'de' ? ',' : '.')
  return (
    <>
      {tipp !== OHNE && (
        <p
          className="rp-ein"
          style={{
            margin: `0 0 ${spacing.md}px`,
            padding: `${spacing.sm}px ${spacing.md}px`,
            borderLeft: `3px solid ${tipp === vorn.partei ? c.yes : c.red}`,
            fontFamily: fonts.body,
            fontSize: fontSize.md,
            lineHeight: lineHeight.normal,
            color: c.ink,
            maxWidth: 560,
          }}
        >
          {(tipp === vorn.partei ? t('tippRichtig') : t('tippFalsch'))
            .replace('{tipp}', name(tipp))
            .replace('{partei}', name(vorn.partei))
            .replace('{wert}', wert)}
        </p>
      )}
      {children}
    </>
  )
}
