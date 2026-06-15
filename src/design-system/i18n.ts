// Aggregierte i18n-Messages — pro Feature aufgeteilt (M-019).
// Die Feature-Module liegen unter ./i18n/. Reihenfolge egal (Keys sind disjunkt).
import { de as commonDe, en as commonEn } from './i18n/common'
import { de as overviewDe, en as overviewEn } from './i18n/overview'
import { de as worldDe, en as worldEn } from './i18n/world'
import { de as euDe, en as euEn } from './i18n/eu'
import { de as gesetzeDe, en as gesetzeEn } from './i18n/gesetze'
import { de as lobbyDe, en as lobbyEn } from './i18n/lobby'
import { de as electionsDe, en as electionsEn } from './i18n/elections'
import { de as sourcesDe, en as sourcesEn } from './i18n/sources'

export const de = {
  ...commonDe,
  ...overviewDe,
  ...worldDe,
  ...euDe,
  ...gesetzeDe,
  ...lobbyDe,
  ...electionsDe,
  ...sourcesDe,
} as const

export const en = {
  ...commonEn,
  ...overviewEn,
  ...worldEn,
  ...euEn,
  ...gesetzeEn,
  ...lobbyEn,
  ...electionsEn,
  ...sourcesEn,
} as const

export type I18nKey = keyof typeof de

export const messages = { de, en } as const

/** Replace `{name}` placeholders in translated strings. */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v))
  }
  return out
}
