/** Indikatoren bei denen niedrigere Werte global „besser“ sind (Ranking / Heatmap). */
const LOWER_IS_BETTER = new Set<string>([
  'EN.ATM.CO2E.PC',
  'SL.UEM.TOTL.ZS',
  'SI.POV.GINI',
  'SI.POV.DDAY',
  'FP.CPI.TOTL.ZG',
  'SH.DYN.MORT',
  'SH.STA.MMRT',
  'SP.DYN.CDRT.IN',
  'VC.IHR.PSRC.P5',
  'GC.DOD.TOTL.GD.ZS',
  'SP.POP.DPND',
])

export function worldIndicatorLowerIsBetter(code: string): boolean {
  return LOWER_IS_BETTER.has(code)
}
