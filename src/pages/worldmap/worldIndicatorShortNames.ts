import type { Lang } from '../../design-system/ThemeContext'

/** Kurzbezeichnungen für Dropdown und UI (langer WB-Name im title-Attribut). */
export const WORLD_INDICATOR_SHORT: Record<string, { de: string; en: string }> = {
  'NY.GDP.PCAP.CD': { de: 'BIP pro Kopf', en: 'GDP per capita' },
  'NY.GDP.MKTP.KD.ZG': { de: 'BIP-Wachstum', en: 'GDP growth' },
  'NY.GDP.MKTP.CD': { de: 'BIP gesamt', en: 'GDP (total)' },
  'FP.CPI.TOTL.ZG': { de: 'Inflation', en: 'Inflation' },
  'SL.UEM.TOTL.ZS': { de: 'Arbeitslosigkeit', en: 'Unemployment' },
  'NE.EXP.GNFS.ZS': { de: 'Exporte (BIP)', en: 'Exports (% GDP)' },
  'BN.CAB.XOKA.GD.ZS': { de: 'Leistungsbilanz', en: 'Current account' },
  'GC.DOD.TOTL.GD.ZS': { de: 'Staatsverschuldung', en: 'Gov. debt' },
  'GC.REV.XGRT.GD.ZS': { de: 'Staatseinnahmen', en: 'Gov. revenue' },
  'SP.POP.TOTL': { de: 'Bevölkerung', en: 'Population' },
  'SP.DYN.LE00.IN': { de: 'Lebenserwartung', en: 'Life expectancy' },
  'SP.DYN.CBRT.IN': { de: 'Geburtenrate', en: 'Birth rate' },
  'SP.DYN.CDRT.IN': { de: 'Sterberate', en: 'Death rate' },
  'SP.URB.TOTL.IN.ZS': { de: 'Urbanisierung', en: 'Urban population' },
  'SP.DYN.TFRT.IN': { de: 'Fertilität', en: 'Fertility rate' },
  'SP.POP.65UP.TO.ZS': { de: 'Bevölkerung 65+', en: 'Population 65+' },
  'SM.POP.NETM': { de: 'Netto-Migration', en: 'Net migration' },
  'SP.POP.DPND': { de: 'Altersabhängigkeit', en: 'Age dependency' },
  'SE.ADT.LITR.ZS': { de: 'Alphabetisierung', en: 'Literacy' },
  'SE.XPD.TOTL.GD.ZS': { de: 'Bildungsausgaben', en: 'Education spending' },
  'SE.PRM.ENRR': { de: 'Grundschule', en: 'Primary enrollment' },
  'SE.SEC.ENRR': { de: 'Sekundarstufe', en: 'Secondary enrollment' },
  'SH.XPD.CHEX.GD.ZS': { de: 'Gesundheitsausgaben', en: 'Health spending' },
  'SH.DYN.MORT': { de: 'Kindersterblichkeit', en: 'Child mortality' },
  'SH.MED.PHYS.ZS': { de: 'Ärzte', en: 'Physicians' },
  'SH.STA.MMRT': { de: 'Müttersterblichkeit', en: 'Maternal mortality' },
  'SH.H2O.BASW.ZS': { de: 'Trinkwasserzugang', en: 'Clean water access' },
  'EN.ATM.CO2E.PC': { de: 'CO₂ pro Kopf', en: 'CO₂ per capita' },
  'EG.FEC.RNEW.ZS': { de: 'Erneuerbare Energie', en: 'Renewable energy' },
  'AG.LND.FRST.ZS': { de: 'Waldfläche', en: 'Forest area' },
  'EG.USE.PCAP.KG.OE': { de: 'Energieverbrauch', en: 'Energy use' },
  'EG.ELC.ACCS.ZS': { de: 'Stromzugang', en: 'Electricity access' },
  'CC.EST': { de: 'Korruptionskontrolle', en: 'Control of corruption' },
  'RL.EST': { de: 'Rechtsstaatlichkeit', en: 'Rule of law' },
  'GE.EST': { de: 'Regierungseffektivität', en: 'Gov. effectiveness' },
  'PV.EST': { de: 'Politische Stabilität', en: 'Political stability' },
  'VA.EST': { de: 'Stimme & Rechenschaft', en: 'Voice & accountability' },
  'RQ.EST': { de: 'Regulierungsqualität', en: 'Regulatory quality' },
  'MS.MIL.XPND.GD.ZS': { de: 'Militärausgaben', en: 'Military spending' },
  'MS.MIL.TOTL.P1': { de: 'Streitkräfte', en: 'Armed forces' },
  'SI.POV.GINI': { de: 'Gini-Koeffizient', en: 'Gini index' },
  'SI.POV.DDAY': { de: 'Armut ($2,15/Tag)', en: 'Poverty ($2.15)' },
  'SG.GEN.PARL.ZS': { de: 'Frauen im Parlament', en: 'Women in parliament' },
  'IT.NET.USER.ZS': { de: 'Internetnutzer', en: 'Internet users' },
  'IT.CEL.SETS.P2': { de: 'Mobilfunk', en: 'Mobile subscriptions' },
  'GB.XPD.RSDV.GD.ZS': { de: 'FuE-Ausgaben', en: 'R&D spending' },
  'IP.PAT.RESD': { de: 'Patentanmeldungen', en: 'Patent applications' },
  'BX.KLT.DINV.WD.GD.ZS': { de: 'FDI-Zuflüsse', en: 'FDI inflows' },
  'DT.ODA.ODAT.GN.ZS': { de: 'ODA-Eingang', en: 'ODA received' },
  'TG.VAL.TOTL.GD.ZS': { de: 'Handel (BIP)', en: 'Trade (% GDP)' },
  'VC.IHR.PSRC.P5': { de: 'Tötungsdelikte', en: 'Homicide rate' },
}

export function worldIndicatorShortLabel(code: string, lang: Lang): string {
  const row = WORLD_INDICATOR_SHORT[code]
  if (!row) return code
  return lang === 'de' ? row.de : row.en
}

/** Kurzlabel aus Mapping, sonst API-Anzeigename (z. B. in Tabellen). */
export function worldIndicatorDisplayLabel(
  code: string,
  lang: Lang,
  apiName: string,
): string {
  if (WORLD_INDICATOR_SHORT[code]) return worldIndicatorShortLabel(code, lang)
  return apiName
}

export function worldIndicatorLongTitle(
  row: {
    code: string
    name: string
    description_de: string | null
    description_en: string | null
  },
  lang: Lang,
): string {
  const desc = lang === 'de' ? row.description_de : row.description_en
  if (desc?.trim()) return `${row.name}. ${desc}`.trim()
  return row.name
}
