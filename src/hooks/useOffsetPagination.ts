import { useState, useMemo, useCallback } from 'react'

export type OffsetPagination = {
  page: number
  limit: number
  offset: number
  setPage: (p: number) => void
  reset: () => void
}

export function useOffsetPagination(limit = 20, initialPage = 1): OffsetPagination {
  const [page, setPage] = useState(initialPage)
  const offset = useMemo(() => (page - 1) * limit, [page, limit])
  const reset = useCallback(() => setPage(1), [])
  return { page, limit, offset, setPage, reset }
}
