import { Link } from 'react-router-dom'
import { Piktogramm, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'
import { useRundgang } from '../../hooks/useMeins'

/**
 * Rundgang in drei Handgriffen statt einer Tour mit Sprechblasen: wer die
 * drei Dinge einmal getan hat, kennt die App. Jeder Schritt hakt sich von
 * selbst ab, und die Karte laesst sich jederzeit schliessen.
 */
export function Rundgang({ ersteAbstimmung }: { ersteAbstimmung?: number }) {
  const { c, t } = useTheme()
  const { schritte, zu, schliessen } = useRundgang()
  if (zu) return null

  const zeilen = [
    { fertig: schritte.ort, titel: t('rundgangOrt'), text: t('rundgangOrtText'), ziel: null },
    {
      fertig: schritte.geoeffnet,
      titel: t('rundgangOeffnen'),
      text: t('rundgangOeffnenText'),
      ziel: ersteAbstimmung ? `/bundestag/${ersteAbstimmung}` : '/bundestag',
    },
    {
      fertig: schritte.gestimmt,
      titel: t('rundgangStimmen'),
      text: t('rundgangStimmenText'),
      ziel: ersteAbstimmung ? `/bundestag/${ersteAbstimmung}#selbst` : '/bundestag',
    },
  ]
  const erledigt = zeilen.filter((z) => z.fertig).length
  const alles = erledigt === zeilen.length

  return (
    <aside
      aria-label={t('rundgangTitel')}
      style={{
        padding: spacing.lg,
        border: `1px solid ${c.ink}`,
        borderRadius: radius.sm,
        background: c.cardBg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md }}>
        <h2
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: fontSize.xl,
            lineHeight: lineHeight.tight,
            color: c.ink,
          }}
        >
          {alles ? t('rundgangFertig') : t('rundgangTitel')}
        </h2>
        <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, whiteSpace: 'nowrap' }}>
          {t('rundgangStand').replace('{n}', String(erledigt))}
        </span>
      </div>
      <ol style={{ listStyle: 'none', margin: `${spacing.md}px 0 0`, padding: 0, display: 'grid', gap: spacing.sm }}>
        {zeilen.map((z, i) => {
          const inhalt = (
            <>
              <span
                aria-hidden
                style={{
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  border: `1.5px solid ${z.fertig ? c.yes : c.ink}`,
                  background: z.fertig ? c.yes : 'transparent',
                  color: z.fertig ? c.bg : c.ink,
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                }}
              >
                {z.fertig ? <Piktogramm name="haken" size={14} /> : i + 1}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontFamily: fonts.body,
                    fontWeight: 600,
                    fontSize: fontSize.base,
                    color: z.fertig ? c.muted : c.ink,
                    textDecoration: z.fertig ? 'line-through' : 'none',
                  }}
                >
                  {z.titel}
                </span>
                {!z.fertig && (
                  <span style={{ display: 'block', fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted, lineHeight: lineHeight.normal }}>
                    {z.text}
                  </span>
                )}
              </span>
            </>
          )
          const stil = {
            display: 'flex',
            alignItems: 'flex-start',
            gap: spacing.md,
            minHeight: 44,
            padding: `${spacing.xs}px 0`,
            color: c.ink,
            textDecoration: 'none',
          } as const
          return (
            <li key={z.titel}>
              {z.ziel && !z.fertig ? (
                <Link to={z.ziel} style={stil}>
                  {inhalt}
                </Link>
              ) : (
                <div style={stil}>{inhalt}</div>
              )}
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        onClick={schliessen}
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
        {alles ? t('rundgangSchliessen') : t('rundgangSpaeter')}
      </button>
    </aside>
  )
}
