import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chip, useTheme, VoteBar } from '../../design-system'
import { fontSize, fonts, light, lineHeight, spacing } from '../../design-system/tokens'
import type { I18nKey } from '../../design-system/i18n'
import { captureElement } from '../../design-system/export/exportCapture'
import { buildFilename, downloadBlob } from '../../design-system/export/exportDownload'
import {
  abweichlerNotiz,
  anzeigeTitel,
  ergebnisWort,
  ergebnisZeile,
  kurzfassung,
  stimmenKurz,
  ueberBeschlussempfehlung,
} from './abstimmungText'
import {
  fraktionsFlaeche,
  fraktionsSchrift,
  nachGroesse,
  shortFraktionName,
  type AbstimmungsDetailData,
} from './fraktion'
import type { StimmEintrag } from './stimmen'

/**
 * Teilbild zur Abstimmung im Hochformat 4:5, gebaut wie die Abstimmungskarten
 * fuer Instagram (namentliche-abstimmungen/slides/make.py).
 *
 * Das Bild hat feste 1080 x 1350 Pixel. Schriftgroessen und Abstaende sind
 * deshalb Pixel und nicht die rem-Token der Seite, und die Farben kommen aus
 * der hellen Palette: das Bild ist immer Papier und Tinte, auch wenn jemand
 * die Seite im Dunkelmodus ansieht.
 */

const BREITE = 1080
const HOEHE = 1350
const K = light
const LINK_BASIS = 'app.respublica.media'

function titelPx(titel: string): number {
  const n = titel.length
  if (n <= 50) return 70
  if (n <= 80) return 60
  if (n <= 110) return 52
  return 46
}

type KarteProps = {
  data: AbstimmungsDetailData
  abweichler: Map<string, StimmEintrag[]>
  kicker: string
  t: (key: I18nKey) => string
}

/** Das Bild selbst, in voller Groesse. Die Seite zeigt es verkleinert. */
export const AbstimmungsKarte = forwardRef<HTMLDivElement, KarteProps>(function AbstimmungsKarte(
  { data, abweichler, kicker, t },
  ref,
) {
  const { ergebnis } = data
  const titel = anzeigeTitel(data.poll_titel)
  const zeilen = nachGroesse(data.fraktionen)
  const worum = kurzfassung(data.intro)
  // Ohne Einleitung rutschen die Abschnitte eine Nummer vor
  let nummer = 0
  const abschnitt = (titel: string) => {
    nummer += 1
    return (
      <div
        style={{
          marginTop: 22,
          marginBottom: 14,
          paddingTop: 12,
          borderTop: `2px solid ${K.ink}`,
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          fontSize: 27,
          fontWeight: 600,
        }}
      >
        <span style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: 34, color: K.red }}>
          {nummer}
        </span>
        {titel}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      style={{
        width: BREITE,
        height: HOEHE,
        boxSizing: 'border-box',
        padding: '64px 84px 52px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: K.bg,
        color: K.ink,
        fontFamily: fonts.body,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 22, color: K.inkSoft }}>
        <img src="/icon-192x192.jpg" alt="" width={40} height={40} style={{ display: 'block' }} />
        <span style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: 26, color: K.ink }}>
          Res<span style={{ color: K.red }}>.</span>Publica
        </span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>{kicker}</span>
      </div>

      <div
        style={{
          marginTop: 28,
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: titelPx(titel),
          lineHeight: 1.04,
          letterSpacing: -1.2,
          maxWidth: 900,
        }}
      >
        {titel}
      </div>

      {worum && (
        <>
          {abschnitt(t('votePageWhat'))}
          <div style={{ fontSize: 25, lineHeight: 1.4 }}>{worum}</div>
        </>
      )}

      {abschnitt(ergebnisWort(data, t))}
      <VoteBar
        ja={ergebnis.ja_gesamt}
        nein={ergebnis.nein_gesamt}
        enthalten={ergebnis.enthalten_gesamt}
        abwesend={ergebnis.abwesend_gesamt}
        height={62}
        beschriftung="wort"
        schriftPx={22}
        farben={K}
        animiert={false}
        ariaLabel={stimmenKurz(
          {
            ja: ergebnis.ja_gesamt,
            nein: ergebnis.nein_gesamt,
            enthalten: ergebnis.enthalten_gesamt,
            abwesend: ergebnis.abwesend_gesamt,
          },
          t,
        )}
      />
      <div style={{ marginTop: 10, fontSize: 20, color: K.inkSoft }}>
        {/* Das Bild wird ohne Seite geteilt, also steht hier, wofuer Ja stand */}
        {ueberBeschlussempfehlung(data.poll_titel) && `${t('votePageDekRecommendation')} `}
        {ergebnisZeile(ergebnis, t)}
      </div>

      {abschnitt(t('votePageGroups'))}
      <div>
        {zeilen.map((f) => {
          const kurz = shortFraktionName(f.partei)
          // Eine Zeile bei 21 px auf 634 px Breite, etwa 62 Zeichen
          const notiz = abweichlerNotiz(f, abweichler.get(kurz), t, 62)
          return (
            <div key={f.partei} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
              <div
                style={{
                  width: 278,
                  height: 44,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: 32,
                  color: fraktionsSchrift(kurz, false),
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{ width: 18, height: 44, flexShrink: 0, background: fraktionsFlaeche(kurz, false) }}
                />
                {kurz}
              </div>
              <div style={{ width: 634 }}>
                <VoteBar
                  ja={f.ja}
                  nein={f.nein}
                  enthalten={f.enthalten}
                  abwesend={f.abwesend}
                  height={44}
                  schriftPx={19}
                  farben={K}
                  animiert={false}
                  ariaLabel={stimmenKurz(f, t)}
                />
                {notiz && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 21,
                      fontWeight: 600,
                      fontStyle: 'italic',
                      color: K.no,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {notiz}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 14,
          borderTop: `1px solid ${K.ink}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 24,
          fontSize: 18,
          lineHeight: 1.5,
          color: K.inkSoft,
        }}
      >
        <div>{t('votePageCardSource')}</div>
        <div style={{ textAlign: 'right' }}>
          {t('votePageCardQuestion')}
          <br />
          <span style={{ fontWeight: 600, color: K.ink }}>
            {LINK_BASIS}/bundestag/{data.poll_id}
          </span>
        </div>
      </div>
    </div>
  )
})

type Zustand = 'leer' | 'rechnet' | 'fertig' | 'fehler'

export interface AbstimmungsBildProps {
  data: AbstimmungsDetailData
  abweichler: Map<string, StimmEintrag[]>
  kicker: string
}

/**
 * Verkleinerte Vorschau des Teilbilds mit "Bild speichern" und, wo das Handy
 * es kann, "Bild teilen" direkt ins Teilen-Menue (Instagram, WhatsApp ...).
 *
 * Das Bild wird gerechnet, sobald die Vorschau ins Bild scrollt. Teilen
 * muss unmittelbar auf den Tipp folgen; ein Bild erst danach zu rechnen,
 * dauert auf dem Handy zu lange, und der Browser verweigert dann das Teilen.
 */
export function AbstimmungsBild({ data, abweichler, kicker }: AbstimmungsBildProps) {
  const { c, t, lang } = useTheme()
  const rahmenRef = useRef<HTMLDivElement>(null)
  const karteRef = useRef<HTMLDivElement>(null)
  const [massstab, setMassstab] = useState(0.3)
  const [zustand, setZustand] = useState<Zustand>('leer')
  const [bild, setBild] = useState<Blob | null>(null)
  const [sichtbar, setSichtbar] = useState(false)

  const dateiname = useMemo(
    () => buildFilename('abstimmung', `${data.poll_id} ${data.poll_titel}`, '4x5'),
    [data.poll_id, data.poll_titel],
  )

  const kannTeilen = useMemo(() => {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false
    try {
      return navigator.canShare({ files: [new File([''], 'probe.png', { type: 'image/png' })] })
    } catch {
      return false
    }
  }, [])

  // Vorschau auf die Breite des Rahmens skalieren
  useEffect(() => {
    const el = rahmenRef.current
    if (!el) return
    const messen = () => setMassstab(el.getBoundingClientRect().width / BREITE)
    messen()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = rahmenRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSichtbar(true)
      return
    }
    const io = new IntersectionObserver(
      (eintraege) => {
        if (eintraege.some((e) => e.isIntersecting)) {
          setSichtbar(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const rechnen = useCallback(async (): Promise<Blob | null> => {
    const el = karteRef.current
    if (!el) return null
    setZustand('rechnet')
    try {
      await document.fonts.ready
      const url = await captureElement(el, {
        pixelRatio: 2,
        backgroundColor: K.bg,
        cacheBust: false,
      })
      const blob = await (await fetch(url)).blob()
      setBild(blob)
      setZustand('fertig')
      return blob
    } catch (err) {
      console.error('[abstimmungsbild]', err)
      setZustand('fehler')
      return null
    }
  }, [])

  // Neu rechnen, wenn Abstimmung oder Sprache wechseln
  useEffect(() => {
    setBild(null)
    setZustand('leer')
  }, [data.poll_id, lang])

  useEffect(() => {
    if (!sichtbar || zustand !== 'leer') return
    const id = window.setTimeout(() => void rechnen(), 400)
    return () => window.clearTimeout(id)
  }, [sichtbar, zustand, rechnen])

  const speichern = async () => {
    const blob = bild ?? (await rechnen())
    if (blob) downloadBlob(blob, dateiname)
  }

  const teilen = async () => {
    const blob = bild ?? (await rechnen())
    if (!blob) return
    try {
      await navigator.share({
        files: [new File([blob], dateiname, { type: 'image/png' })],
        title: anzeigeTitel(data.poll_titel),
        text: `https://${LINK_BASIS}/bundestag/${data.poll_id}`,
      })
    } catch (err) {
      // Abbrechen im Teilen-Menue ist kein Fehler
      if (err instanceof DOMException && err.name === 'AbortError') return
      downloadBlob(blob, dateiname)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.xl,
        alignItems: 'flex-start',
      }}
    >
      <div
        ref={rahmenRef}
        role="img"
        aria-label={t('votePageImageAlt')}
        style={{
          position: 'relative',
          width: 'min(100%, 360px)',
          aspectRatio: '4 / 5',
          overflow: 'hidden',
          border: `1px solid ${c.border}`,
          boxShadow: c.shadow,
          background: K.bg,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${massstab})`,
            transformOrigin: 'top left',
          }}
        >
          <AbstimmungsKarte ref={karteRef} data={data} abweichler={abweichler} kicker={kicker} t={t} />
        </div>
      </div>

      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <p
          style={{
            margin: `0 0 ${spacing.lg}px`,
            fontFamily: fonts.body,
            fontSize: fontSize.md,
            lineHeight: lineHeight.normal,
            color: c.inkSoft,
            maxWidth: '40ch',
          }}
        >
          {t('votePageImageHint')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {kannTeilen && (
            <Chip
              label={t('votePageImageShare')}
              active
              disabled={zustand === 'rechnet'}
              onClick={() => void teilen()}
            />
          )}
          <Chip
            label={zustand === 'rechnet' ? t('votePageImageBusy') : t('votePageImageSave')}
            active={!kannTeilen}
            disabled={zustand === 'rechnet'}
            onClick={() => void speichern()}
          />
        </div>
        {zustand === 'fehler' && (
          <p
            role="alert"
            style={{
              margin: `${spacing.md}px 0 0`,
              fontFamily: fonts.body,
              fontSize: fontSize.sm,
              color: c.red,
            }}
          >
            {t('votePageImageError')}
          </p>
        )}
      </div>
    </div>
  )
}
