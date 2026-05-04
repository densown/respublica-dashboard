import type { CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
import { fonts, spacing } from '../tokens'

export type TradePartnerOption = {
  iso3: string
  name: string
  value_usd: number
}

export type PartnerPickerProps = {
  partners: TradePartnerOption[]
  selected: string | null
  onChange: (iso3: string | null) => void
  style?: CSSProperties
}

function fmtUsd(v: number, locale: string, lang: string) {
  if (v >= 1e9) {
    const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v / 1e9)
    return lang === 'de' ? `${n} Mrd. $` : `${n} bn $`
  }
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v / 1e6)
  return lang === 'de' ? `${n} Mio. $` : `${n} m $`
}

export default function PartnerPicker({
  partners,
  selected,
  onChange,
  style,
}: PartnerPickerProps) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'

  return (
    <label
      style={{
        display: 'block',
        marginBottom: spacing.md,
        ...style,
      }}
    >
      <span
        style={{
          display: 'block',
          marginBottom: spacing.xs,
          fontFamily: fonts.mono,
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: c.muted,
        }}
      >
        {t('worldConsoleTradePartnerLabel')}
      </span>
      <select
        value={selected ?? ''}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
        style={{
          width: '100%',
          minHeight: 44,
          borderRadius: 6,
          border: `1px solid ${c.border}`,
          background: c.bg,
          color: c.ink,
          fontFamily: fonts.body,
          fontSize: 13,
          padding: `0 ${spacing.md}px`,
        }}
      >
        <option value="">{t('worldConsoleTradeAllPartners')}</option>
        {partners.map((p) => (
          <option key={p.iso3} value={p.iso3}>
            {p.name} ({p.iso3}) · {fmtUsd(p.value_usd, locale, lang)}
          </option>
        ))}
      </select>
    </label>
  )
}
