import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { dark, light, type ThemeColors } from './tokens'
import { messages, type I18nKey } from './i18n'

const THEME_KEY = 'rp-theme'
const LANG_KEY = 'rp-lang'

export type ThemeMode = 'light' | 'dark'
export type Lang = 'de' | 'en'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
  lang: Lang
  setLang: (lang: Lang) => void
  c: ThemeColors
  t: (key: I18nKey) => string
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'light'
}

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY)
    if (v === 'de') return 'de'
    if (v === 'en') return 'en'
  } catch {
    /* ignore */
  }
  return 'de'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme())
  const [lang, setLangState] = useState<Lang>(() => readStoredLang())

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
  }, [])

  const c = theme === 'dark' ? dark : light

  const t = useCallback(
    (key: I18nKey) => messages[lang][key] ?? key,
    [lang],
  )

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      lang,
      setLang,
      c,
      t,
    }),
    [theme, setTheme, lang, setLang, c, t],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
