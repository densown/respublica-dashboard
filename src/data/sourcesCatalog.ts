import type { I18nKey } from '../design-system/i18n'

export type SourceCatalogEntry = {
  nameKey: I18nKey
  url: string
  licenseKey: I18nKey
  descKey: I18nKey
}

export type SourceCatalogPage = {
  pageTitleKey: I18nKey
  href: string
  sources: SourceCatalogEntry[]
}

/** Datenquellen gruppiert nach Dashboard-Seite (i18n-Keys für sichtbare Texte). */
export const SOURCES_BY_PAGE: SourceCatalogPage[] = [
  {
    pageTitleKey: 'featureElectionsTitle',
    href: '/wahlen',
    sources: [
      {
        nameKey: 'sourcesNmGerda',
        url: 'https://gerda.uni-mannheim.de',
        licenseKey: 'sourcesLicCcBy40',
        descKey: 'sourcesDescGerda',
      },
    ],
  },
  {
    pageTitleKey: 'bundestag',
    href: '/bundestag',
    sources: [
      {
        nameKey: 'sourcesNmAbgeordnetenwatchApi',
        url: 'https://www.abgeordnetenwatch.de/api',
        licenseKey: 'sourcesLicCc0',
        descKey: 'sourcesDescAbwBundestag',
      },
      {
        nameKey: 'sourcesNmBundestagOpenData',
        url: 'https://www.bundestag.de/services/opendata',
        licenseKey: 'sourcesLicDlDeBy',
        descKey: 'sourcesDescBundestagOpenData',
      },
      {
        nameKey: 'sourcesNmWikidataCommons',
        url: 'https://www.wikidata.org',
        licenseKey: 'sourcesLicCc0',
        descKey: 'sourcesDescWikidataMdb',
      },
    ],
  },
  {
    pageTitleKey: 'legislation',
    href: '/gesetzgebung',
    sources: [
      {
        nameKey: 'sourcesNmDipApi',
        url: 'https://dip.bundestag.de',
        licenseKey: 'sourcesLicDlDeBy',
        descKey: 'sourcesDescDipApi',
      },
      {
        nameKey: 'sourcesNmAbgeordnetenwatchApi',
        url: 'https://www.abgeordnetenwatch.de/api',
        licenseKey: 'sourcesLicCc0',
        descKey: 'sourcesDescAbwLegislation',
      },
    ],
  },
  {
    pageTitleKey: 'coalition',
    href: '/koalitionsvertrag',
    sources: [
      {
        nameKey: 'sourcesNmCoalitionTreaty2025',
        url: 'https://www.bundesregierung.de',
        licenseKey: 'sourcesLicPublicDoc',
        descKey: 'sourcesDescCoalitionManual',
      },
    ],
  },
  {
    pageTitleKey: 'worldMap',
    href: '/weltkarte',
    sources: [
      {
        nameKey: 'sourcesNmWorldBank',
        url: 'https://data.worldbank.org',
        licenseKey: 'sourcesLicCcBy40',
        descKey: 'sourcesDescWorldBank',
      },
    ],
  },
  {
    pageTitleKey: 'euLaw',
    href: '/eu-recht',
    sources: [
      {
        nameKey: 'sourcesNmEurlex',
        url: 'https://eur-lex.europa.eu',
        licenseKey: 'sourcesLicEuReuse',
        descKey: 'sourcesDescEurlex',
      },
    ],
  },
  {
    pageTitleKey: 'euParliament',
    href: '/eu-parlament',
    sources: [
      {
        nameKey: 'sourcesNmAbgeordnetenwatchApi',
        url: 'https://www.abgeordnetenwatch.de/api',
        licenseKey: 'sourcesLicCc0',
        descKey: 'sourcesDescAbwEuParliament',
      },
    ],
  },
  {
    pageTitleKey: 'lobby',
    href: '/lobbyregister',
    sources: [
      {
        nameKey: 'sourcesNmLobbyregisterBt',
        url: 'https://www.lobbyregister.bundestag.de',
        licenseKey: 'sourcesLicOdbl',
        descKey: 'sourcesDescLobbyregister',
      },
      {
        nameKey: 'sourcesNmWikidataCommons',
        url: 'https://www.wikidata.org',
        licenseKey: 'sourcesLicCc0',
        descKey: 'sourcesDescWikidataLobby',
      },
    ],
  },
]

const FOOTER_LINE_BY_ROUTE_SEGMENT: Record<string, I18nKey> = {
  wahlen: 'footerSourcesLineWahlen',
  bundestag: 'footerSourcesLineBundestag',
  gesetzgebung: 'footerSourcesLineGesetzgebung',
  gesetze: 'footerSourcesLineGesetzgebung',
  koalitionsvertrag: 'footerSourcesLineKoalition',
  koalition: 'footerSourcesLineKoalition',
  weltkarte: 'footerSourcesLineWeltkarte',
  'eu-recht': 'footerSourcesLineEuRecht',
  'eu-parlament': 'footerSourcesLineEuParlament',
  lobbyregister: 'footerSourcesLineLobby',
}

/** i18n-Key für die Footer-Quellenzeile abhängig von der aktuellen Route. */
export function footerSourcesLineKey(pathname: string): I18nKey {
  const seg = pathname.replace(/\/$/, '').split('/').filter(Boolean)[0] ?? ''
  return FOOTER_LINE_BY_ROUTE_SEGMENT[seg] ?? 'footerSourcesLineDefault'
}
