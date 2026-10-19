import { useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ExportableContainer,
  LoadingSpinner,
  PageHeader,
  Section,
  useTheme,
  ViewToggle,
} from '../design-system'
import { fontSize, fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useSeo } from '../hooks/useSeo'
import { AbgeordnetenListe } from '../components/bundestag/AbgeordnetenListe'
import { AbstimmungsListe } from '../components/bundestag/AbstimmungsListe'
import { datumLang } from '../components/bundestag/abstimmungText'
import type { AbstimmungsListenEintrag } from '../components/bundestag/fraktion'
import { Hemicycle, type SitzverteilungRow } from '../components/bundestag/Hemicycle'
import {
  nachAwId,
  sitzeZuordnen,
  type AbgeordnetenApiRow,
} from '../components/bundestag/sitzplaetze'
import { RAW_SEAT_COUNT } from '../data/bundestag-seats'

type Ansicht = 'abstimmungen' | 'abgeordnete'

/**
 * Bundestag: alle namentlichen Abstimmungen als Karten oder alle
 * Abgeordneten mit Suche. Die Ansicht steht in der Adresse
 * (?ansicht=abgeordnete), damit Zurueck aus einem Profil wieder in der Liste
 * landet. Jede Abstimmung hat ihre Seite unter /bundestag/:pollId, jede
 * Person ihr Profil unter /bundestag/abgeordnete/:awId.
 * Konzept: projekte/app-redesign/tabs/bundestag.md im Brain.
 */
export default function Bundestag() {
  const navigate = useNavigate()
  const { c, t, lang } = useTheme()
  const [params, setParams] = useSearchParams()
  const ansicht: Ansicht = params.get('ansicht') === 'abgeordnete' ? 'abgeordnete' : 'abstimmungen'

  const setAnsicht = useCallback(
    (next: Ansicht) => {
      setParams(
        (prev) => {
          const neu = new URLSearchParams(prev)
          if (next === 'abgeordnete') neu.set('ansicht', next)
          else neu.delete('ansicht')
          return neu
        },
        { replace: true },
      )
    },
    [setParams],
  )

  useSeo({
    titel: ansicht === 'abgeordnete' ? 'Abgeordnete im Bundestag' : 'Namentliche Abstimmungen im Bundestag',
    beschreibung:
      'Wie jede und jeder Abgeordnete im Bundestag abgestimmt hat, mit Ergebnis, Fraktionen und allen Einzelstimmen, und wo sie von der eigenen Fraktion abweichen.',
    pfad: ansicht === 'abgeordnete' ? '/bundestag?ansicht=abgeordnete' : '/bundestag',
  })

  const liste = useApi<AbstimmungsListenEintrag[]>(
    ansicht === 'abstimmungen' ? '/api/bundestag/abstimmungen' : '',
  )
  const personen = useApi<AbgeordnetenApiRow[]>(ansicht === 'abgeordnete' ? '/api/abgeordnete' : '')
  const sitzverteilung = useApi<SitzverteilungRow[]>(
    ansicht === 'abgeordnete' ? '/api/bundestag/sitzverteilung' : '',
  )

  const sitze = useMemo(() => sitzeZuordnen(personen.data ?? []), [personen.data])
  const alle = useMemo(() => [...nachAwId(personen.data ?? []).values()], [personen.data])

  const zumProfil = useCallback(
    (sitz: number) => {
      const abg = sitze.get(sitz)
      if (abg) navigate(`/bundestag/abgeordnete/${abg.aw_id}`)
    },
    [sitze, navigate],
  )

  const abstimmungen = liste.data ?? []
  const dek =
    ansicht === 'abstimmungen'
      ? abstimmungen.length > 0
        ? t('bundestagDekVotes')
            .replace('{n}', String(abstimmungen.length))
            .replace('{datum}', datumLang(abstimmungen[0].poll_datum, lang))
        : undefined
      : alle.length > 0
        ? t('bundestagDekMembers').replace('{n}', String(alle.length))
        : undefined

  const fehler = (
    <p style={{ fontFamily: fonts.body, fontSize: fontSize.base, color: c.inkSoft, margin: 0 }}>
      {t('dataLoadError')}
    </p>
  )

  return (
    <>
      <PageHeader kicker={t('bundestagKicker')} title="Bundestag" subtitle={dek} />

      <ViewToggle<Ansicht>
        value={ansicht}
        onChange={setAnsicht}
        ariaLabel={t('bundestagViewLabel')}
        options={[
          { value: 'abstimmungen', label: t('bundestagViewVotes') },
          { value: 'abgeordnete', label: t('bundestagViewMembers') },
        ]}
        style={{ marginBottom: spacing.xl }}
      />

      {ansicht === 'abstimmungen' && (
        <Section last>
          {liste.loading && !liste.data ? (
            <LoadingSpinner />
          ) : liste.error && !liste.data ? (
            fehler
          ) : (
            <AbstimmungsListe abstimmungen={abstimmungen} />
          )}
        </Section>
      )}

      {ansicht === 'abgeordnete' && (
        <>
          {sitzverteilung.data && sitzverteilung.data.length > 0 && personen.data && (
            <Section
              title={t('seatDistribution')}
              aside={`${RAW_SEAT_COUNT} ${t('seats')}`}
              note={t('bundestagSeatsNote')}
            >
              <ExportableContainer title={t('seatDistribution')}>
                <Hemicycle
                  sitzverteilung={sitzverteilung.data}
                  abgeordnete={sitze}
                  onSeatSelect={zumProfil}
                />
              </ExportableContainer>
            </Section>
          )}

          <Section title={t('bundestagMembersTitle')} last>
            {personen.loading && !personen.data ? (
              <LoadingSpinner />
            ) : personen.error && !personen.data ? (
              fehler
            ) : (
              <AbgeordnetenListe abgeordnete={alle} />
            )}
          </Section>
        </>
      )}
    </>
  )
}
