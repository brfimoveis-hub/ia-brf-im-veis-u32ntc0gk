import { useState, useCallback, useRef, useEffect, DragEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Phone, Calendar, Loader2 } from 'lucide-react'
import { formatPhone } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import pb from '@/lib/pocketbase/client'
import { buildStageFilter, combineFilters } from '@/lib/customer-filters'

const PER_PAGE = 50

export interface KanbanColumnHandle {
  addItem: (item: any) => void
  removeItem: (id: string) => void
}

interface KanbanColumnProps {
  stage: string
  filter: string
  refreshKey: number
  onCardDragStart: (customer: any) => void
  onCardClick: (id: string) => void
  onDropToStage: (e: DragEvent<HTMLDivElement>, stage: string) => void
  registerHandle: (stage: string, handle: KanbanColumnHandle) => void
  unregisterHandle: (stage: string) => void
}

function formatDateSafe(dateStr: string | undefined | null, fmt: string): string {
  if (!dateStr) return '--/--'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '--/--'
    return format(d, fmt, { locale: ptBR })
  } catch {
    return '--/--'
  }
}

export function KanbanColumn({
  stage,
  filter,
  refreshKey,
  onCardDragStart,
  onCardClick,
  onDropToStage,
  registerHandle,
  unregisterHandle,
}: KanbanColumnProps) {
  const [items, setItems] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const pageRef = useRef(2)

  const fullFilter = combineFilters(buildStageFilter(stage), filter)

  useEffect(() => {
    let cancelled = false
    setInitialLoading(true)
    loadingRef.current = true
    setLoading(true)
    hasMoreRef.current = true
    ;(async () => {
      try {
        const result = await pb.collection('customers').getList(1, PER_PAGE, {
          filter: fullFilter || undefined,
          sort: '-created',
        })
        if (cancelled) return
        setItems(result.items)
        pageRef.current = 2
        setHasMore(result.items.length === PER_PAGE)
        hasMoreRef.current = result.items.length === PER_PAGE
      } catch (err) {
        console.error('Kanban load error', err)
        if (!cancelled) {
          setItems([])
          setHasMore(false)
          hasMoreRef.current = false
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false)
          setLoading(false)
          loadingRef.current = false
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fullFilter, refreshKey])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const result = await pb.collection('customers').getList(pageRef.current, PER_PAGE, {
        filter: fullFilter || undefined,
        sort: '-created',
      })
      setItems((prev) => {
        const existingIds = new Set(prev.map((c) => c.id))
        const fresh = result.items.filter((c) => !existingIds.has(c.id))
        return [...prev, ...fresh]
      })
      pageRef.current += 1
      setHasMore(result.items.length === PER_PAGE)
      hasMoreRef.current = result.items.length === PER_PAGE
    } catch (err) {
      console.error('Kanban load more error', err)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [fullFilter])

  useEffect(() => {
    registerHandle(stage, {
      addItem: (item) => setItems((prev) => [item, ...prev.filter((c) => c.id !== item.id)]),
      removeItem: (id) => setItems((prev) => prev.filter((c) => c.id !== id)),
    })
    return () => unregisterHandle(stage)
  }, [stage, registerHandle, unregisterHandle])

  useEffect(() => {
    const el = sentinelRef.current
    const root = scrollRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { root, rootMargin: '200px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  return (
    <div
      className="flex w-[280px] shrink-0 flex-col rounded-xl bg-muted/40 border border-border/50 p-3 max-h-full"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => onDropToStage(e, stage)}
    >
      <div className="mb-4 flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm text-foreground/80">{stage}</h3>
        <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 h-auto">
          {items.length}
        </Badge>
      </div>
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto min-h-[150px] pr-1 pb-2 custom-scrollbar"
      >
        {items.map((customer) => (
          <Card
            key={customer.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', customer.id)
              e.dataTransfer.effectAllowed = 'move'
              onCardDragStart(customer)
            }}
            onClick={() => onCardClick(customer.id)}
            className="cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all bg-background"
          >
            <CardContent className="p-3">
              <div className="flex flex-col gap-2">
                <div className="font-medium text-sm leading-tight flex items-start gap-2">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <span className="line-clamp-2">
                    {customer.name || customer.first_name || 'Sem nome'}
                  </span>
                </div>
                {customer.phone && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3 w-3 shrink-0" />
                    {formatPhone(customer.phone)}
                  </div>
                )}
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateSafe(customer.created, 'dd/MM')}
                  </div>
                  {customer.source && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 bg-muted/50 border-muted font-normal"
                    >
                      {customer.source.substring(0, 15)}
                      {customer.source.length > 15 ? '...' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {loading && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={sentinelRef} className="h-1 shrink-0" />
        {items.length === 0 && !loading && !initialLoading && (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground pointer-events-none">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  )
}
