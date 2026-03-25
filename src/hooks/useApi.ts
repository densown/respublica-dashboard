import { useCallback, useEffect, useMemo, useState } from 'react'

const DEFAULT_BASE = 'https://api.respublica.media'

function getBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE as string | undefined
  const base = (raw?.trim() || DEFAULT_BASE).replace(/\/$/, '')
  return base
}

function buildUrl(endpoint: string, params?: Record<string, string>): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = new URL(path, `${getBaseUrl()}/`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }
  return url.toString()
}

export interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(
  endpoint: string,
  params?: Record<string, string>,
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const paramsKey = useMemo(
    () => (params ? JSON.stringify(params) : ''),
    [params],
  )

  const refetch = useCallback(() => {
    setTick((n) => n + 1)
  }, [])

  useEffect(() => {
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
        const url = buildUrl(endpoint, params)
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = (await res.json()) as T
        if (cancelled) return
        setData(json)
        setError(null)
      } catch (e) {
        if (controller.signal.aborted) return
        const msg = e instanceof Error ? e.message : 'Fetch failed'
        setData(null)
        setError(msg)
        if (!isRetry && !didRetry) {
          didRetry = true
          retryTimer = window.setTimeout(() => {
            if (!cancelled) void load(true)
          }, 2000)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(false)

    return () => {
      cancelled = true
      controller.abort()
      if (retryTimer !== null) window.clearTimeout(retryTimer)
    }
  }, [endpoint, paramsKey, tick, params])

  return { data, loading, error, refetch }
}
