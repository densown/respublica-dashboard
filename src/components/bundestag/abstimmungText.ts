import type { I18nKey } from '../../design-system/i18n'
import {
  hatFraktionslinie,
  nachGroesse,
  shortFraktionName,
  type AbstimmungsDetailData,
  type FraktionsErgebnis,
} from './fraktion'
import { mehrheit, type Stimme, type StimmEintrag } from './stimmen'

/**
 * Saetze zur Abstimmung, aus den Zahlen gebaut: Vorspann unter dem Titel und
 * die rote Notiz unter jedem Fraktionsbalken. Seite und Teilbild benutzen
 * dieselben Funktionen, damit beide dasselbe sagen.
 */

type Uebersetzen = (key: I18nKey) => string

/** Ab diesem Anteil abweichender Stimmen gilt eine Fraktion als gespalten. */
const GESPALTEN_ANTEIL = 0.15
/** ... und erst ab so vielen Abweichenden, sonst kippt es bei Kleinstgruppen. */
const GESPALTEN_MINDESTENS = 5
/** Bis zu so vielen Abweichenden je Stimme stehen Namen, darueber die Zahl. */
const NAMEN_BIS = 3

/**
 * Ob der Antrag durchkam. abgeordnetenwatch fuehrt dafuer ein eigenes Feld,
 * das aber nicht verlaesslich ist (Abstimmung 6724: 132 zu 445, dort als
 * angenommen gefuehrt). Ohne geprueften Wert der API zaehlt Ja gegen Nein.
 */
export function istAngenommen(d: AbstimmungsDetailData): boolean {
  return d.angenommen ?? d.ergebnis.ja_gesamt > d.ergebnis.nein_gesamt
}

function linieVon(f: FraktionsErgebnis): Stimme | null {
  return mehrheit({ ja: f.ja, nein: f.nein, enthalten: f.enthalten })
}

function stimmenFuer(f: FraktionsErgebnis, s: Stimme): number {
  if (s === 'yes') return f.ja
  if (s === 'no') return f.nein
  if (s === 'abstain') return f.enthalten
  return f.abwesend
}

export function istGespalten(f: FraktionsErgebnis): boolean {
  if (!hatFraktionslinie(shortFraktionName(f.partei))) return false
  const linie = linieVon(f)
  const abgegeben = f.ja + f.nein + f.enthalten
  if (!linie || abgegeben === 0) return false
  const abweichend = abgegeben - stimmenFuer(f, linie)
  return abweichend >= GESPALTEN_MINDESTENS && abweichend / abgegeben >= GESPALTEN_ANTEIL
}

/** "A", "A und B", "A, B und C" */
export function aufzaehlen(teile: string[], t: Uebersetzen): string {
  if (teile.length <= 1) return teile.join('')
  return `${teile.slice(0, -1).join(', ')} ${t('listAnd')} ${teile[teile.length - 1]}`
}

function zahl(n: number, lang: 'de' | 'en'): string {
  return n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')
}

/**
 * Vorspann: Ergebnis, wer dafuer und wer dagegen war, wer gespalten war.
 * Etwa: "Abgelehnt mit 132 zu 445 Stimmen. Dafür: Grüne und Die Linke.
 * Dagegen: CDU/CSU, AfD und SPD."
 */
export function vorspann(d: AbstimmungsDetailData, t: Uebersetzen, lang: 'de' | 'en'): string {
  const saetze = [
    t('votePageDekResult')
      .replace('{ergebnis}', istAngenommen(d) ? t('accepted') : t('rejected'))
      .replace('{ja}', zahl(d.ergebnis.ja_gesamt, lang))
      .replace('{nein}', zahl(d.ergebnis.nein_gesamt, lang)),
  ]

  const mitLinie = nachGroesse(d.fraktionen).filter((f) =>
    hatFraktionslinie(shortFraktionName(f.partei)),
  )
  const lager: Record<'yes' | 'no' | 'abstain', string[]> = { yes: [], no: [], abstain: [] }
  for (const f of mitLinie) {
    const linie = linieVon(f)
    if (linie && linie !== 'no_show') lager[linie].push(shortFraktionName(f.partei))
  }
  const besetzt = (['yes', 'no', 'abstain'] as const).filter((s) => lager[s].length > 0)

  if (besetzt.length === 1 && mitLinie.length > 1) {
    const s = besetzt[0]
    saetze.push(
      t(s === 'yes' ? 'votePageDekAllYes' : s === 'no' ? 'votePageDekAllNo' : 'votePageDekAllAbstain'),
    )
  } else {
    if (lager.yes.length) saetze.push(t('votePageDekFor').replace('{liste}', aufzaehlen(lager.yes, t)))
    if (lager.no.length) saetze.push(t('votePageDekAgainst').replace('{liste}', aufzaehlen(lager.no, t)))
    if (lager.abstain.length)
      saetze.push(t('votePageDekAbstain').replace('{liste}', aufzaehlen(lager.abstain, t)))
  }

  const gespalten = mitLinie.filter(istGespalten).map((f) => shortFraktionName(f.partei))
  if (gespalten.length === 1) {
    saetze.push(t('votePageDekSplitOne').replace('{fraktion}', gespalten[0]))
  } else if (gespalten.length > 1) {
    saetze.push(t('votePageDekSplitMany').replace('{liste}', aufzaehlen(gespalten, t)))
  }

  return saetze.join(' ')
}

const NOTIZ_REIHE: { stimme: Stimme; wort: I18nKey; zahl: I18nKey }[] = [
  { stimme: 'yes', wort: 'yes', zahl: 'votePageCountYes' },
  { stimme: 'no', wort: 'no', zahl: 'votePageCountNo' },
  { stimme: 'abstain', wort: 'abstain', zahl: 'votePageCountAbstain' },
]

/**
 * Rote Notiz unter einem Fraktionsbalken. Gespaltene Fraktionen bekommen nur
 * diesen Hinweis, die Zahlen stehen im Balken. Sonst die Abweichenden, bis
 * drei je Stimme mit Namen: "Nein: Sabine Dittmar. Enthalten: Anna Beispiel".
 *
 * `maxZeichen` fuer das Teilbild, wo die Notiz in eine Zeile passen muss:
 * dann zuerst Enthaltungen nur zaehlen, notfalls alles nur zaehlen. Wer mit
 * Ja oder Nein gegen die Fraktion stimmt, ist die interessantere Nachricht.
 */
export function abweichlerNotiz(
  f: FraktionsErgebnis,
  abweichler: StimmEintrag[] | undefined,
  t: Uebersetzen,
  maxZeichen = Infinity,
): string | null {
  if (istGespalten(f)) return t('votePageSplit')
  if (!abweichler?.length) return null

  const fassung = (namenFuer: (s: Stimme) => boolean) => {
    const teile: string[] = []
    for (const { stimme, wort, zahl: zahlKey } of NOTIZ_REIHE) {
      const namen = abweichler.filter((e) => e.stimme === stimme).map((e) => e.name)
      if (!namen.length) continue
      teile.push(
        namen.length <= NAMEN_BIS && namenFuer(stimme)
          ? `${t(wort)}: ${namen.join(', ')}`
          : t(zahlKey).replace('{n}', String(namen.length)),
      )
    }
    return teile.join('. ')
  }

  const fassungen = [
    fassung(() => true),
    fassung((s) => s !== 'abstain'),
    fassung(() => false),
  ]
  const passend = fassungen.find((x) => x.length <= maxZeichen) ?? fassungen[fassungen.length - 1]
  return passend || null
}

/** "527 Ja, 18 Nein, 23 Enthaltungen" fuer Screenreader. */
export function stimmenKurz(
  z: { ja: number; nein: number; enthalten: number; abwesend: number },
  t: Uebersetzen,
): string {
  return [
    t('votePageCountYes').replace('{n}', String(z.ja)),
    t('votePageCountNo').replace('{n}', String(z.nein)),
    t('votePageCountAbstain').replace('{n}', String(z.enthalten)),
    t('votePageCountAbsent').replace('{n}', String(z.abwesend)),
  ].join(', ')
}

/** Zeile unter dem Ergebnisbalken, ohne "(gelb)", wenn sich niemand enthielt. */
export function ergebnisZeile(e: AbstimmungsDetailData['ergebnis'], t: Uebersetzen): string {
  return t(e.enthalten_gesamt > 0 ? 'votePageResultCaption' : 'votePageResultCaptionNoAbstain')
    .replace('{ja}', String(e.ja_gesamt))
    .replace('{nein}', String(e.nein_gesamt))
    .replace('{enth}', String(e.enthalten_gesamt))
    .replace('{abw}', String(e.abwesend_gesamt))
}

/** Die ersten ganzen Saetze bis etwa 240 Zeichen, fuer "Worum es ging" im Bild. */
export function kurzfassung(intro: string | null | undefined, max = 240): string | null {
  if (!intro) return null
  const absatz = intro.split(/\n\s*\n/)[0]?.trim() ?? ''
  if (!absatz) return null
  const saetze = absatz.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [absatz]
  let out = ''
  for (const s of saetze) {
    if (out && (out + s).length > max) break
    out += s
  }
  return out.trim() || null
}
