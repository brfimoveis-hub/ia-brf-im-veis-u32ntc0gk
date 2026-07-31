import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import pb from '@/lib/pocketbase/client'

interface UsePaginatedListOptions {
  collection: string
  perPage?: number
  initialSort?: string
  searchFields?: string[]
  expand?: string
}

export function usePaginatedList<T = any>(options: UsePaginatedListOptions) {
  const {
    collection,
    perPage: initialPerPage = 20,
    initialSort = '-created',
    searchFields = ['name', 'phone', 'email'],
    expand,
  } = options

  const [items, setItems] = useState<T[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(initialPerPage)
  const [sort, setSort] = useState(initialSort)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearch(searchInput)
      setCurrentPage(1)
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchInput])

  const filterString = useMemo(() => {
    const parts: string[] = []
    const q = search.trim()
    if (q) {
      const safeQ = q.replace(/"/g, '\\"')
      const searchParts = searchFields.map((f) => `${f} ~ "${safeQ}"`)
      parts.push(`(${searchParts.join(' || ')})`)
    }
    for (const expr of Object.values(filters)) {
      if (expr) parts.push(expr)
    }
    return parts.join(' && ')
  }, [search, filters, searchFields])

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(false)
    try {
      const result = await pb.collection(collection).getList<T>(currentPage, perPage, {
        sort,
        filter: filterString || undefined,
        expand,
      })
      if (requestId !== requestIdRef.current || !isMountedRef.current) return
      setItems(result.items)
      setTotalItems(result.totalItems)
    } catch (err) {
      console.error(err)
      if (requestId === requestIdRef.current && isMountedRef.current) {
        setItems([])
        setError(true)
      }
    } finally {
      if (requestId === requestIdRef.current && isMountedRef.current) setLoading(false)
    }
  }, [collection, currentPage, perPage, sort, filterString, expand])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))

  useEffect(() => {
    if (totalItems > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages, totalItems])

  const setPage = useCallback((page: number) => setCurrentPage(Math.max(1, page)), [])

  const handleSetPerPage = useCallback((size: number) => {
    setPerPage(size)
    setCurrentPage(1)
  }, [])

  const toggleSort = useCallback((field: string) => {
    setSort((prev) => {
      if (prev === field) return `-${field}`
      if (prev === `-${field}`) return field
      return field
    })
    setCurrentPage(1)
  }, [])

  const setFilter = useCallback((key: string, expression: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (expression) next[key] = expression
      else delete next[key]
      return next
    })
    setCurrentPage(1)
  }, [])

  const submitSearch = useCallback(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    setSearch(searchInput)
    setCurrentPage(1)
  }, [searchInput])

  const clearFilters = useCallback(() => {
    setFilters({})
    setSearchInput('')
    setSearch('')
    setCurrentPage(1)
  }, [])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const retry = useCallback(() => {
    setError(false)
    setLoading(true)
    setRefreshKey((k) => k + 1)
  }, [])

  return {
    items,
    totalItems,
    totalPages,
    currentPage,
    perPage,
    sort,
    loading,
    error,
    searchInput,
    search,
    filters,
    filterString,
    setPage,
    setPerPage: handleSetPerPage,
    toggleSort,
    setSearchInput,
    submitSearch,
    setFilter,
    clearFilters,
    refresh,
    retry,
  }
}
