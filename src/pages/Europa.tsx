import { Link } from 'react-router-dom'
import { PageHeader, Section, useTheme } from '../design-system'
import { Piktogramm, type PiktogrammName } from '../design-system/components/Piktogramm'
import { fonts, fontSize, lineHeight, measure, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useSeo } from '../hooks/useSeo'
import { datumKurz, fuelle, heuteInBerlin, preis, zahl, type Einheit } from '../components/europa/format'
import type { EpStand, QuellenStand, StromTag } from '../components/europa/typen'

/**
 * Einstieg in den Bereich Europa: zwei Ansichten mit je einer Zahl von
 * heute, darunter der Stand aller Quellen des Bereichs. Neue Ansichten
 * (Rat, Gasspeicher) bekommen hier eine Zeile.
 */
export default function Europa() {
  const { c, t, lang } = useTheme()
  useSeo({ titel: t('europaTitel'), beschreibung: t('europaSeoBeschreibung'), pfad: '/europa' })

  const [einheit] = useLocalStorage<Einheit>('rp-strom-einheit', 'ct')
  const [zone] = useLocalStorage<string>('rp-strom-zone', 'DE-LU')
  const { data: strom } = useApi<StromTag>(`/api/strom/tag?datum=${heuteInBerlin()}&lang=${lang}`)
  const { data: ep } = useApi<EpStand>('/api/ep/stand')
  const { data: quellen } = useApi<{ quellen: QuellenStand[] }>('/api/quellen?bereich=europa')

  const z = strom?.zonen.find((x) => x.code === zone) ?? strom?.zonen.find((x) => x.code === 'DE-LU')
  const zustandWort = (q: QuellenStand) =>
    q.zustand === 'veraltet' ? t('quelleZustandVeraltet') : q.zustand === 'unbekannt' ? t('quelleZustandUnbekannt') : t('quelleZustandAktuell')

  const eintrag = (pfad: string, icon: PiktogrammName, titel: string, text: string, zahlZeile?: string) => (
    <Link
      to={pfad}
      className="rp-zeile"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.lg,
        padding: `${spacing.xl}px 0`,
        borderTop: `1px solid ${c.border}`,
        textDecoration: 'none',
        minHeight: 44,
      }}
    >
      <span style={{ color: c.red, marginTop: 2 }}>
        <Piktogramm name={icon} size={28} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{ display: 'block', fontFamily: fonts.display, fontWeight: 700, fontSize: fontSize.xl, lineHeight: lineHeight.tight, color: c.ink }}
        >
          {titel}
        </span>
        <span
          style={{ display: 'block', marginTop: spacing.xs, fontFamily: fonts.body, fontSize: fontSize.base, lineHeight: lineHeight.normal, color: c.muted }}
        >
          {text}
        </span>
        {zahlZeile && (
          <span style={{ display: 'block', marginTop: spacing.sm, fontFamily: fonts.mono, fontSize: fontSize.sm, fontWeight: 700, color: c.ink }}>
            {zahlZeile}
          </span>
        )}
      </span>
      <span className="rp-pfeil" style={{ color: c.subtle, alignSelf: 'center' }}>
        <Piktogramm name="pfeil" size={18} />
      </span>
    </Link>
  )

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <PageHeader kicker={t('europaKicker')} title={t('europaTitel')} subtitle={t('europaIntro')} />

      <div style={{ maxWidth: measure.liste, borderBottom: `1px solid ${c.border}`, marginBottom: spacing.xxl }}>
        {eintrag(
          '/europa/strom',
          'strom',
          t('europaStromTitel'),
          t('europaStromText'),
          z?.mittel != null ? fuelle(t('europaStromZahl'), { land: z.name, preis: preis(z.mittel, einheit, lang) }) : undefined,
        )}
        {eintrag(
          '/europa/parlament',
          'europa',
          t('europaParlamentTitel'),
          t('europaParlamentText'),
          ep?.letzte_abstimmung
            ? fuelle(t('europaParlamentZahl'), { n: zahl(ep.abstimmungen, lang), datum: datumKurz(ep.letzte_abstimmung, lang) })
            : undefined,
        )}
      </div>

      <Section title={t('europaKommtTitel')}>
        <p style={{ margin: 0, fontFamily: fonts.body, fontSize: fontSize.base, lineHeight: lineHeight.relaxed, color: c.inkSoft, maxWidth: '68ch' }}>
          {t('europaKommtText')}
        </p>
      </Section>

      {quellen && quellen.quellen.length > 0 && (
        <Section title={t('europaStandTitel')} note={t('europaStandNote')} last>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: measure.liste }}>
            {quellen.quellen.map((q) => (
              <li
                key={q.slug}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.xs}px 0`,
                  borderTop: `1px solid ${c.border}`,
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                  color: c.muted,
                }}
              >
                <a href={q.url} target="_blank" rel="noopener noreferrer" style={{ color: c.ink, fontWeight: 700, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
                  {q.name}
                </a>
                <span>
                  {q.lizenz ? `${q.lizenz} · ` : ''}
                  <span style={{ color: q.zustand === 'veraltet' ? c.red : c.muted, fontWeight: q.zustand === 'veraltet' ? 700 : 400 }}>
                    {zustandWort(q)}
                  </span>
                  {q.letzter_erfolg
                    ? ` · ${new Date(q.letzter_erfolg).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
