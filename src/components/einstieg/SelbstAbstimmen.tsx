import { useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'
import { useEigeneStimmen, type EigeneStimme } from '../../hooks/useMeins'
import { aufzaehlen, istAngenommen, lagerDerFraktionen } from '../bundestag/abstimmungText'
import type { AbstimmungsDetailData } from '../bundestag/fraktion'

const WAHL: { stimme: EigeneStimme; wort: 'yes' | 'no' | 'abstain' }[] = [
  { stimme: 'yes', wort: 'yes' },
  { stimme: 'no', wort: 'no' },
  { stimme: 'abstain', wort: 'abstain' },
]

/**
 * "Wie haettest du gestimmt?" Drei Knoepfe, danach ein Satz, mit welchen
 * Fraktionen man gestimmt haette und ob man bei der Mehrheit gewesen waere.
 * Die Stimme bleibt im Browser. Keine Punkte, keine Rangliste: der Reiz ist
 * der Vergleich, nicht das Sammeln.
 */
export function SelbstAbstimmen({ data }: { data: AbstimmungsDetailData }) {
  const { c, t } = useTheme()
  const { stimmen, setze } = useEigeneStimmen()
  const meine = stimmen[String(data.poll_id)] ?? null
  const { lager } = lagerDerFraktionen(data.fraktionen)

  const farbe = (s: EigeneStimme) => (s === 'yes' ? c.yes : s === 'no' ? c.no : c.abstain)

  let satz: string | null = null
  if (meine) {
    const mit = lager[meine]
    const wort = t(meine === 'yes' ? 'selbstMitJa' : meine === 'no' ? 'selbstMitNein' : 'selbstEnthalten')
    const teile = [
      mit.length > 0
        ? t('selbstWie').replace('{wort}', wort).replace('{liste}', aufzaehlen(mit, t))
        : t('selbstAllein').replace('{wort}', wort),
    ]
    if (meine !== 'abstain') {
      const gewonnen = (meine === 'yes') === istAngenommen(data)
      teile.push(t(gewonnen ? 'selbstMehrheit' : 'selbstMinderheit'))
    }
    satz = teile.join(' ')
  }

  return (
    <div
      id="selbst"
      style={{
        scrollMarginTop: spacing.xl,
        padding: spacing.lg,
        border: `1px solid ${c.ink}`,
        borderRadius: radius.sm,
        background: c.cardBg,
        maxWidth: '68ch',
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: fontSize.xl,
          lineHeight: lineHeight.tight,
          color: c.ink,
        }}
      >
        {t('selbstFrage')}
      </div>
      <div role="group" aria-label={t('selbstFrage')} style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
        {WAHL.map((w) => {
          const aktiv = meine === w.stimme
          return (
            <button
              key={w.stimme}
              type="button"
              aria-pressed={aktiv}
              onClick={() => setze(data.poll_id, aktiv ? null : w.stimme)}
              className="rp-chip"
              style={{
                flex: '1 1 88px',
                minHeight: 48,
                padding: `0 ${spacing.md}px`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                border: `1.5px solid ${c.ink}`,
                borderRadius: radius.sm,
                background: aktiv ? c.ink : 'transparent',
                color: aktiv ? c.bg : c.ink,
                fontFamily: fonts.body,
                fontWeight: 600,
                fontSize: fontSize.base,
                cursor: 'pointer',
              }}
            >
              <span aria-hidden style={{ width: 12, height: 12, background: farbe(w.stimme), flexShrink: 0 }} />
              {t(w.wort)}
            </button>
          )
        })}
      </div>
      <p
        aria-live="polite"
        className={satz ? 'rp-ein' : undefined}
        key={meine ?? 'leer'}
        style={{
          margin: `${spacing.md}px 0 0`,
          fontFamily: fonts.body,
          fontSize: satz ? fontSize.base : fontSize.sm,
          lineHeight: lineHeight.normal,
          color: satz ? c.ink : c.muted,
        }}
      >
        {satz ?? t('selbstHinweis')}
      </p>
    </div>
  )
}
