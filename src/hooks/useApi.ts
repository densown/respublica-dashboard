import { useCallback, useEffect, useMemo, useState } from 'react'

const DEFAULT_BASE = typeof window !== 'undefined' ? window.location.origin : ''

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
        // #region agent log
        fetch('http://localhost:7473/ingest/3e7d6dd8-438b-410c-92d5-fd3cc0268322', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '817973',
          },
          body: JSON.stringify({
            sessionId: '817973',
            runId: 'pre-fix',
            hypothesisId: 'A',
            location: 'useApi.ts:load:start',
            message: 'fetch start',
            data: {
              endpoint,
              paramsKey,
              base: getBaseUrl(),
              url,
              isRetry,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion
        const res = await fetch(url, { signal: controller.signal })
        // #region agent log
        fetch('http://localhost:7473/ingest/3e7d6dd8-438b-410c-92d5-fd3cc0268322', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '817973',
          },
          body: JSON.stringify({
            sessionId: '817973',
            runId: 'pre-fix',
            hypothesisId: 'B',
            location: 'useApi.ts:load:response',
            message: 'fetch response',
            data: { endpoint, ok: res.ok, status: res.status },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion
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
        // #region agent log
        fetch('http://localhost:7473/ingest/3e7d6dd8-438b-410c-92d5-fd3cc0268322', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '817973',
          },
          body: JSON.stringify({
            sessionId: '817973',
            runId: 'pre-fix',
            hypothesisId: 'C',
            location: 'useApi.ts:load:catch',
            message: 'fetch error',
            data: { endpoint, msg },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion
        setData(null)
        setError(msg)
        if (!isRetry && !didRetry) {
          didRetry = true
          retryTimer = window.setTimeout(() => {
            if (!cancelled) void load(true)
          }, 2000)
        }
      } finally {
        // #region agent log
        fetch('http://localhost:7473/ingest/3e7d6dd8-438b-410c-92d5-fd3cc0268322', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '817973',
          },
          body: JSON.stringify({
            sessionId: '817973',
            runId: 'pre-fix',
            hypothesisId: 'D',
            location: 'useApi.ts:load:finally',
            message: 'load finally',
            data: {
              endpoint,
              cancelled,
              willSetLoadingFalse: !cancelled,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion
        if (!cancelled) setLoading(false)
      }
    }

    void load(false)

    return () => {
      // #region agent log
      fetch('http://localhost:7473/ingest/3e7d6dd8-438b-410c-92d5-fd3cc0268322', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '817973',
        },
        body: JSON.stringify({
          sessionId: '817973',
          runId: 'pre-fix',
          hypothesisId: 'A',
          location: 'useApi.ts:cleanup',
          message: 'effect cleanup (abort in-flight)',
          data: { endpoint, paramsKey },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      cancelled = true
      controller.abort()
      if (retryTimer !== null) window.clearTimeout(retryTimer)
    }
  }, [endpoint, paramsKey, tick, params])

  return { data, loading, error, refetch }
}
