/** Antworten der Europa-Endpunkte (respublica-api, Migrationen 022 bis 024). */

export type Quelle = {
  slug: string
  name: string
  /** Wer die Daten erhoben hat, wenn das ein anderer ist als der Anbieter. */
  daten?: string
  url: string
  lizenz: string | null
  lizenz_url: string | null
}

export type QuellenStand = {
  slug: string
  name: string
  herausgeber: string | null
  url: string
  lizenz: string | null
  lizenz_url: string | null
  bereich: string | null
  hinweis: string | null
  letzter_erfolg: string | null
  zustand: 'aktuell' | 'veraltet' | 'unbekannt' | 'ohne_takt'
  alter_stunden: number | null
  grenze_stunden: number | null
}

export type MitQuelle = { stand: string | null; quelle: Quelle }

export type Stimmen = { ja: number; nein: number; enthaltung: number; nicht: number }
export type Position = 'ja' | 'nein' | 'enthaltung' | 'nicht'
export type EpArt = 'text' | 'einigung' | 'ablehnungsantrag' | 'verhandlungsmandat' | 'dringlichkeit'

export type EpAbstimmung = {
  id: number
  zeit: string
  datum: string
  titel: string
  titel_uebersetzt: boolean
  titel_original: string
  art: EpArt
  ergebnis: 'angenommen' | 'abgelehnt' | null
  referenz: string | null
  verfahren: string | null
  verfahren_typ: string | null
  lesung: number | null
  stimmen: Stimmen
  deutschland: Stimmen
  url: string
}

export type EpStand = MitQuelle & {
  abstimmungen: number
  letzte_abstimmung: string | null
  abgeordnete: number
  deutsche_abgeordnete: number
}

export type EpListe = MitQuelle & { gesamt: number; limit: number; offset: number; abstimmungen: EpAbstimmung[] }

export type EpDetail = EpAbstimmung &
  MitQuelle & {
    fraktionen: (Stimmen & { code: string; kurz: string; name: string })[]
    laender: (Stimmen & { land: string })[]
    deutsche: { id: number; name: string; partei: string | null; fraktion: string; fraktion_kurz: string; position: Position }[]
    verwandt: EpAbstimmung[]
  }

export type EpAbgeordneterKurz = {
  id: number
  name: string
  nachname: string
  partei: string | null
  fraktion: string
  fraktion_kurz: string
  stimmen: Stimmen
  teilnahme: number | null
}

export type EpAbgeordnetenListe = MitQuelle & { land: string; abgeordnete: EpAbgeordneterKurz[] }

export type EpAbgeordneter = MitQuelle & {
  id: number
  name: string
  land: string
  partei: string | null
  fraktion: string
  fraktion_kurz: string
  fraktion_name: string
  im_amt: boolean
  stimmen: Stimmen
  abstimmungen: number
  teilnahme: number | null
  mit_fraktion: number | null
  profil_url: string
  limit: number
  offset: number
  letzte: (EpAbstimmung & { position: Position })[]
}

export type StromZone = {
  code: string
  land: string
  name: string
  spalte: number
  zeile: number
  stunden: (number | null)[]
  mittel: number | null
  min: number | null
  max: number | null
  vortag_mittel: number | null
}

export type StromTag = MitQuelle & {
  datum: string
  verfuegbar: { von: string | null; bis: string | null }
  einheit: string
  zonen: StromZone[]
}

export type StromVerlauf = MitQuelle & {
  zone: { code: string; land: string; name: string }
  tage: { datum: string; mittel: number | null; min: number | null; max: number | null; negativ_stunden: number }[]
}

export type StromTagesbericht = {
  zonen: number
  mittel: Record<string, number>
  billigste: { zone: string; eur_mwh: number } | null
  teuerste: { zone: string; eur_mwh: number } | null
  negativ: string[]
  heimat: {
    zone: string
    mittel: number
    billigste_stunde: { stunde: number; eur_mwh: number }
    teuerste_stunde: { stunde: number; eur_mwh: number }
    fenster: { von: number; bis: number; eur_mwh: number } | null
    negative_stunden: number
  } | null
}

export type StromKennzahlen = MitQuelle & {
  einheit: string
  kennzahlen: {
    jahr: number
    von: string
    bis: string
    negativ: Record<string, { stunden: number; tage: number }>
    einheitspreis: {
      stunden: number
      gleich: number
      anteil: number
      mittlere_spanne_eur_mwh: number
      schwelle_eur_mwh: number
      zonen: string[]
    } | null
    tage: Record<string, StromTagesbericht>
  } | null
}
