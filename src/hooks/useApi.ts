import { useCallback, useEffect, useState } from 'react'

const DEFAULT_BASE = typeof window !== 'undefined' ? window.location.origin : ''

function getBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE as string | undefined
  const base = (raw?.trim() || DEFAULT_BASE).replace(/\/$/, '')
  return base
}

function buildUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = new URL(path, `${getBaseUrl()}/`)
  return url.toString()
}

export interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(endpoint: string): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(
    () => Boolean(endpoint && endpoint.trim()),
  )
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => {
    setTick((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!endpoint || endpoint.trim() === '') {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    let didRetry = false

    async function load(isRetry: boolean) {
      if (!isRetry) {
        setLoading(true)
        setError(null)
      }
      try {
        const url = buildUrl(endpoint)
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = (await res.json()) as T
        if (cancelled) return
        setData(json)
        setError(null)
        setLoading(false)
      } catch (e) {
        if (controller.signal.aborted || cancelled) return
        if (!isRetry && !didRetry) {
          // Retry geplant: alten Datenstand + loading=true behalten,
          // Fehler erst nach finalem Fehlschlag melden.
          didRetry = true
          retryTimer = window.setTimeout(() => {
            if (!cancelled) void load(true)
          }, 2000)
          return
        }
        const msg = e instanceof Error ? e.message : 'Fetch failed'
        setData(null)
        setError(msg)
        setLoading(false)
      }
    }

    void load(false)

    return () => {
      cancelled = true
      controller.abort()
      if (retryTimer !== null) window.clearTimeout(retryTimer)
    }
  }, [endpoint, tick])

  return { data, loading, error, refetch }
}
