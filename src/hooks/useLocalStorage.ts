import { useCallback, useEffect, useState } from 'react'

const EREIGNIS = 'rp-gemerkt'

function lesen<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

/**
 * Wert im Browser merken. Mehrere Stellen der Seite, die denselben
 * Schluessel benutzen, bleiben gleich: wer schreibt, meldet es den anderen.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => lesen(key, defaultValue))

  useEffect(() => {
    const hoeren = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) setState(lesen(key, defaultValue))
    }
    window.addEventListener(EREIGNIS, hoeren)
    return () => window.removeEventListener(EREIGNIS, hoeren)
    // defaultValue ist bei jedem Aufruf ein neues Objekt, der Schluessel reicht
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const set = useCallback(
    (value: T) => {
      setState(value)
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent(EREIGNIS, { detail: key }))
    },
    [key],
  )

  return [state, set]
}
