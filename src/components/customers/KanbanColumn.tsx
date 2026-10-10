import { useState, useCallback, useRef, useEffect, DragEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  User,
  Phone,
  Calendar,
  Loader2,
  Info,
  Bot,
  ChevronDown,
  ChevronUp,
  Tag,
  Target,
  Sparkles,
} from 'lucide-react'
import { formatPhone } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { buildStageFilter, combineFilters } from '@/lib/customer-filters'
import type { StageParsedInstruction } from '@/lib/bia-movement-parser'

const PER_PAGE = 15

export interface KanbanColumnHandle {
  addItem: (item: any) => void
  removeItem: (id: string) => void
}

interface KanbanColumnProps {
  index?: number
  stage: string
  filter: string
  refreshKey: number
  biaInstruction?: StageParsedInstruction | null
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
  index = 0,
  stage,
  filter,
  refreshKey,
  biaInstruction,
  onCardDragStart,
  onCardClick,
  onDropToStage,
  registerHandle,
  unregisterHandle,
}: KanbanColumnProps) {
  const [items, setItems] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [isInstructionExpanded, setIsInstructionExpanded] = useState(false)
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

    const timer = setTimeout(async () => {
      try {
        const result = await pb.collection('customers').getList(1, PER_PAGE, {
          filter: fullFilter || undefined,
          sort: '-created',
        })
        if (cancelled) return
        setItems(result.items)
        setTotalCount(result.totalItems)
        pageRef.current = 2
        setHasMore(result.items.length === PER_PAGE)
        hasMoreRef.current = result.items.length === PER_PAGE
      } catch (err: any) {
        const isAbort =
          cancelled ||
          err?.isAbort === true ||
          err?.name === 'AbortError' ||
          (err?.name === 'ClientResponseError' && err?.status === 0)
        if (!isAbort) {
          console.error('Kanban load error', err)
          setItems([])
          setHasMore(false)
          hasMoreRef.current = false
          toast.error('Erro ao carregar coluna do pipeline', {
            description: err?.message || 'Tente novamente.',
          })
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false)
          setLoading(false)
          loadingRef.current = false
        }
      }
    }, index * 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [fullFilter, refreshKey, index])

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
    } catch (err: any) {
      const isAbort =
        err?.isAbort === true ||
        err?.name === 'AbortError' ||
        (err?.name === 'ClientResponseError' && err?.status === 0)
      if (!isAbort) {
        console.error('Kanban load more error', err)
        toast.error('Erro ao carregar mais clientes', {
          description: err?.message || 'Tente novamente.',
        })
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [fullFilter])

  useEffect(() => {
    registerHandle(stage, {
      addItem: (item) => {
        setItems((prev) => [item, ...prev.filter((c) => c.id !== item.id)])
        setTotalCount((prev) => prev + 1)
      },
      removeItem: (id) => {
        setItems((prev) => prev.filter((c) => c.id !== id))
        setTotalCount((prev) => Math.max(0, prev - 1))
      },
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
      {/* Cabeçalho da coluna do estágio */}
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
            {index + 1}
          </span>
          <h3
            className="font-semibold text-xs sm:text-sm text-foreground/90 truncate"
            title={stage}
          >
            {stage}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Popover com instrução detalhada da Bia */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 transition-colors"
                title="Ver instrução completa da Bia para este estágio"
                aria-label={`Instruções da Bia para ${stage}`}
              >
                <Bot className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 sm:w-96 p-4 text-xs space-y-3 z-50 shadow-lg border-amber-500/30"
              side="bottom"
              align="start"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-foreground leading-tight">
                      {biaInstruction?.rawHeader || stage}
                    </h4>
                    {biaInstruction?.phase && (
                      <span className="text-[10px] text-muted-foreground">
                        Fase do Funil: <strong>{biaInstruction.phase}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 font-mono text-muted-foreground shrink-0"
                >
                  {biaInstruction?.source === 'parsed' ? 'Texto Único' : 'Padrão'}
                </Badge>
              </div>

              {biaInstruction?.objective && (
                <div className="space-y-1">
                  <span className="font-semibold text-[11px] text-foreground flex items-center gap-1">
                    <Target className="h-3 w-3 text-primary" /> Objetivo do Estágio
                  </span>
                  <p className="text-muted-foreground leading-relaxed pl-4 border-l-2 border-primary/40">
                    {biaInstruction.objective}
                  </p>
                </div>
              )}

              {biaInstruction?.technique && (
                <div className="space-y-1">
                  <span className="font-semibold text-[11px] text-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" /> Técnica / Abordagem
                  </span>
                  <p className="text-muted-foreground leading-relaxed pl-4 border-l-2 border-amber-500/40">
                    {biaInstruction.technique}
                  </p>
                </div>
              )}

              {biaInstruction?.crmTags && (
                <div className="space-y-1">
                  <span className="font-semibold text-[11px] text-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3 text-emerald-500" /> Tags de Movimentação no CRM
                  </span>
                  <code className="block bg-muted/60 p-1.5 rounded font-mono text-[10px] text-foreground break-all border border-border/40">
                    {biaInstruction.crmTags}
                  </code>
                </div>
              )}

              {!biaInstruction?.objective && !biaInstruction?.technique && (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-2 rounded border border-border/40">
                  {biaInstruction?.fullContent ||
                    biaInstruction?.shortSummary ||
                    'Consulte o Texto Único da Bia no Caderno de Aprendizados.'}
                </p>
              )}

              <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Movimento: duplo (Você ou Bia)</span>
                <span className="italic">Fonte: Texto Único v3.1</span>
              </div>
            </PopoverContent>
          </Popover>

          <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 h-auto">
            {totalCount}
          </Badge>
        </div>
      </div>

      {/* Caixinha compacta e retrátil da Instrução da Cadência da Bia no topo da coluna */}
      <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 p-2 text-[11px] transition-all">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1 font-semibold text-[10px] text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>Orientação da Bia</span>
          </div>
          <button
            type="button"
            onClick={() => setIsInstructionExpanded((prev) => !prev)}
            className="text-amber-700/80 hover:text-amber-800 dark:text-amber-400 p-0.5 rounded hover:bg-amber-500/10 transition-colors"
            title={isInstructionExpanded ? 'Recolher instrução' : 'Expandir instrução'}
            aria-label={isInstructionExpanded ? 'Recolher instrução' : 'Expandir instrução'}
          >
            {isInstructionExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </div>

        <p
          className={`mt-1 text-foreground/80 leading-snug transition-all ${
            isInstructionExpanded ? 'line-clamp-none whitespace-pre-line' : 'line-clamp-2'
          }`}
          title={biaInstruction?.shortSummary}
        >
          {biaInstruction?.shortSummary || 'Ver o Texto Único da Bia'}
        </p>
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
