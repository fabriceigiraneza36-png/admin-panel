import { useState, useCallback } from 'react'
import { DEFAULT_PAGE_SIZE } from '@utils/constants'

export const usePagination = (initialPage = 1, initialLimit = DEFAULT_PAGE_SIZE) => {
  const [page,  setPage]  = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [total, setTotal] = useState(0)

  const totalPages = Math.ceil(total / limit) || 1
  const hasNext    = page < totalPages
  const hasPrev    = page > 1

  const goTo    = useCallback((p) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages])
  const next    = useCallback(() => hasNext && setPage((p) => p + 1), [hasNext])
  const prev    = useCallback(() => hasPrev && setPage((p) => p - 1), [hasPrev])
  const reset   = useCallback(() => setPage(1), [])

  const setPageSize = useCallback((s) => {
    setLimit(s)
    setPage(1)
  }, [])

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    setTotal,
    goTo,
    next,
    prev,
    reset,
    setPageSize,
  }
}