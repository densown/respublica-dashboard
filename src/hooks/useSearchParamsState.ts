import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

export function useSearchParamsState(
  key: string,
  defaultValue: string | null = null,
): [string | null, (value: string | null) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(key) ?? defaultValue
  const setValue = useCallback(
    (newValue: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (newValue === null || newValue === '') next.delete(key)
          else next.set(key, newValue)
          return next
        },
        { replace: false },
      )
    },
    [key, setSearchParams],
  )
  return [value, setValue]
}
