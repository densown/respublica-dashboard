import { useState } from 'react'
import { Piktogramm, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'
import { hinweisErlaubt, hinweisSchliessen, useInstallieren } from '../../hooks/useInstallieren'

/**
 * "Res.Publica als App": Knopf, wo der Browser die Installation anbietet
 * (Android, Chrome und Edge am Rechner), sonst die zwei Handgriffe in
 * Safari. Zwei Formen:
 *
 * - hinweis: kleine Karte auf der Startseite. Erst ab dem zweiten
 *   Besuchstag, nur wenn es wirklich etwas zu tun gibt (Knopf oder iPhone),
 *   und nach "Nicht jetzt" 60 Tage Ruhe.
 * - zeile: fester Eintrag auf der Seite "Mehr", immer sichtbar.
 */
export function AppInstallieren({ form }: { form: 'hinweis' | 'zeile' }) {
  const { c, t } = useTheme()
  const { stand, installieren } = useInstallieren()
  const [zu, setZu] = useState(() => form === 'hinweis' && !hinweisErlaubt())

  if (form === 'hinweis' && (zu || stand === 'installiert' || stand === 'menue')) return null

  const knopf = (
    <button
      type="button"
      onClick={installieren}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 44,
        padding: `0 ${spacing.lg}px`,
        border: 'none',
        borderRadius: radius.sm,
        background: c.red,
        color: '#FFFFFF',
        fontFamily: fonts.body,
        fontWeight: 600,
        fontSize: fontSize.base,
        cursor: 'pointer',
      }}
    >
      <Piktogramm name="laden" size={18} />
      {t('appKnopf')}
    </button>
  )

  const iosSchritte = (
    <div style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.ink, lineHeight: lineHeight.normal }}>
      <span style={{ color: c.muted }}>{t('appIosHinweis')}</span>
      <ol style={{ listStyle: 'none', margin: `${spacing.xs}px 0 0`, padding: 0, display: 'grid', gap: spacing.xs }}>
        <li style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>1</span>
          <Piktogramm name="teilen" size={20} />
          {t('appIosSchritt1')}
        </li>
        <li style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>2</span>
          <Piktogramm name="hinzufuegen" size={20} />
          {t('appIosSchritt2')}
        </li>
      </ol>
    </div>
  )

  const handlung =
    stand === 'bereit' ? (
      knopf
    ) : stand === 'ios' ? (
      iosSchritte
    ) : stand === 'installiert' ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.sm, fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted }}>
        <Piktogramm name="haken" size={16} />
        {t('appInstalliert')}
      </span>
    ) : (
      <span style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted, lineHeight: lineHeight.normal }}>{t('appMenue')}</span>
    )

  const symbol = (
    <img
      src="/app-icon-192.png"
      alt=""
      width={44}
      height={44}
      style={{ borderRadius: 10, flexShrink: 0, display: 'block' }}
    />
  )

  const kopf = (
    <span style={{ minWidth: 0, flex: 1 }}>
      <span
        style={{
          display: 'block',
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: fontSize.lg,
          lineHeight: lineHeight.tight,
          color: c.ink,
        }}
      >
        {t('appTitel')}
      </span>
      <span
        style={{
          display: 'block',
          marginTop: spacing.xs,
          fontFamily: fonts.body,
          fontSize: fontSize.md,
          lineHeight: lineHeight.normal,
          color: c.muted,
        }}
      >
        {t('appText')}
      </span>
    </span>
  )

  if (form === 'zeile') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.lg, padding: `${spacing.lg}px 0`, borderBottom: `1px solid ${c.border}` }}>
        {symbol}
        <span style={{ minWidth: 0, flex: 1, display: 'grid', gap: spacing.md }}>
          {kopf}
          <span>{handlung}</span>
        </span>
      </div>
    )
  }

  return (
    <aside
      aria-label={t('appTitel')}
      style={{
        marginBottom: spacing.xxl,
        padding: spacing.lg,
        border: `1px solid ${c.border}`,
        borderRadius: radius.sm,
        background: c.cardBg,
        display: 'grid',
        gap: spacing.md,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
        {symbol}
        {kopf}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md }}>
        {handlung}
        <button
          type="button"
          onClick={() => {
            hinweisSchliessen()
            setZu(true)
          }}
          style={{
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
          {t('appSpaeter')}
        </button>
      </div>
    </aside>
  )
}
