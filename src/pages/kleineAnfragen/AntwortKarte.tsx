import { useTheme } from '../../design-system'
import { fonts, fontSize, lineHeight, radius, spacing } from '../../design-system/tokens'
import { fraktionsSchrift } from '../../components/bundestag/fraktion'
import { ressortKurz, type Antwort } from './types'

/**
 * Eine Antwort der Bundesregierung als Karte. Karte statt Tabelle, weil die
 * Zusammenfassung der eigentliche Inhalt ist und Tabellen ab vier Spalten auf
 * dem Handy ohnehin zur Karten-Liste werden muessten (DESIGN.md, 7).
 */
export function AntwortKarte({ a, kompakt = false }: { a: Antwort; kompakt?: boolean }) {
  const { c, t, lang, theme } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const datum = new Date(`${a.datum}T00:00:00Z`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const zusammenfassung = lang === 'en' ? a.zusammenfassung_en ?? a.zusammenfassung : a.zusammenfassung
  // Schlagzeile gibt es nur auf Deutsch; auf Englisch steht der Titel der Anfrage oben
  const ueberschrift = lang === 'de' && a.schlagzeile ? a.schlagzeile : a.titel
  const zeigeTitelExtra = ueberschrift !== a.titel

  const meta = { fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, letterSpacing: '0.02em' } as const
  const marke = {
    ...meta,
    fontSize: fontSize.micro,
    border: `1px solid ${c.border}`,
    borderRadius: radius.pill,
    padding: `${spacing.xs / 2}px ${spacing.sm}px`,
    whiteSpace: 'nowrap',
  } as const
  const link = { color: c.ink, fontFamily: fonts.mono, fontSize: fontSize.xs } as const

  return (
    <article
      style={{
        borderTop: `1px solid ${c.border}`,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
        display: 'grid',
        gap: spacing.md,
      }}
    >
      <div style={{ ...meta, display: 'flex', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'baseline' }}>
        <span>{datum}</span>
        <span>·</span>
        <span>{a.dokumentnummer}</span>
        {a.fraktion_name && (
          <>
            <span>·</span>
            <span style={{ color: fraktionsSchrift(a.fraktion_name, theme === 'dark'), fontWeight: 700 }}>
              {a.fraktion_name}
            </span>
          </>
        )}
        {a.ressort && (
          <>
            <span>·</span>
            <span>{ressortKurz(a.ressort)}</span>
          </>
        )}
      </div>

      <h3
        style={{
          margin: 0,
          fontFamily: fonts.body,
          fontWeight: 600,
          fontSize: kompakt ? fontSize.base : fontSize.lg,
          lineHeight: lineHeight.tight,
          color: c.ink,
          maxWidth: '68ch',
        }}
      >
        {ueberschrift}
      </h3>
      {zeigeTitelExtra && (
        <div style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted, fontStyle: 'italic', maxWidth: '68ch' }}>
          {a.titel}
        </div>
      )}
      {!kompakt && a.fragesteller.length > 0 && (
        <div style={meta}>
          {t('kaKarteGefragt')} {a.fragesteller.join(', ')}
        </div>
      )}

      {zusammenfassung ? (
        <p
          style={{
            margin: 0,
            fontFamily: fonts.body,
            fontSize: fontSize.base,
            lineHeight: lineHeight.relaxed,
            color: c.inkSoft,
            maxWidth: '68ch',
          }}
        >
          {zusammenfassung}
        </p>
      ) : (
        <p style={{ margin: 0, fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted, maxWidth: '68ch' }}>
          {a.volltext_vorhanden ? t('kaKarteOhneAuswertung') : t('kaKarteOhneText')}
        </p>
      )}

      {a.kernzahlen.length > 0 && !kompakt && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: spacing.sm, maxWidth: '68ch' }}>
          {a.kernzahlen.map((k, i) => (
            <li key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(5.5em, auto) 1fr', gap: spacing.md }}>
              <span style={{ fontFamily: fonts.mono, fontSize: fontSize.base, color: c.ink, fontWeight: 700 }}>
                {k.wert}
              </span>
              <span style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.inkSoft, lineHeight: lineHeight.normal }}>
                {k.einheit} · {k.bedeutung}
                <details style={{ marginTop: spacing.xs }}>
                  <summary style={{ ...meta, cursor: 'pointer', minHeight: 24 }}>{t('kaKarteZitat')}</summary>
                  <q style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted, fontStyle: 'italic' }}>{k.zitat}</q>
                </details>
              </span>
            </li>
          ))}
        </ul>
      )}
      {a.kernzahlen.length > 0 && kompakt && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md }}>
          {a.kernzahlen.slice(0, 3).map((k, i) => (
            <span key={i} style={{ fontFamily: fonts.mono, fontSize: fontSize.sm, color: c.ink }}>
              <strong>{k.wert}</strong> <span style={{ color: c.muted }}>{k.einheit}</span>
            </span>
          ))}
        </div>
      )}

      {a.treffer && (
        <div style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted, maxWidth: '68ch' }}>
          <span style={meta}>{t('kaKarteTreffer')}: </span>…{a.treffer}…
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }}>
        {a.nicht_erhoben > 0 && (
          <span style={marke} title={t('kaKarteNichtErhobenTitel')}>
            {t('kaKarteNichtErhoben').replace('{n}', String(a.nicht_erhoben))}
          </span>
        )}
        {a.hat_anlage && <span style={marke}>{t('kaKarteAnlage')}</span>}
        {a.eingestuft && <span style={marke}>{t('kaKarteEingestuft')}</span>}
        {a.story_wert != null && (
          <span style={marke} title={a.story_grund ?? undefined}>
            {t('kaKarteWert').replace('{w}', String(a.story_wert))}
          </span>
        )}
        {a.ausgewertet && <span style={{ ...meta, fontStyle: 'italic' }}>{t('kaKarteAutomatisch')}</span>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.lg }}>
        {/* Das DIP meldet die PDF-Adresse sofort, der Bundestag legt die Datei aber erst
            einige Werktage spaeter ab (bis dahin 404). Volltext und PDF kommen gemeinsam. */}
        {a.pdf_url && a.volltext_vorhanden && (
          <a href={a.pdf_url} target="_blank" rel="noopener noreferrer" style={{ ...link, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
            {t('kaKartePdf')} ↗
          </a>
        )}
        {a.dip_url && (
          <a href={a.dip_url} target="_blank" rel="noopener noreferrer" style={{ ...link, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
            {t('kaKarteDip')} ↗
          </a>
        )}
      </div>
    </article>
  )
}
