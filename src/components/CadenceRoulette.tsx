import { useState, useEffect, useRef, useCallback } from 'react'
import { useBlocker } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { getActiveCadences, updateCadence, type Cadence } from '@/services/cadences'
import { getPaginatedCustomers, updateCustomer, type Customer } from '@/services/customers'
import {
  Edit2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  Layers,
  MessageSquare,
  User,
  Phone,
  StickyNote,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function CadenceRoulette({
  search = '',
  phaseFilter = 'all',
  sourceFilter = '',
  onCustomerUpdated,
}: {
  search?: string
  phaseFilter?: string
  sourceFilter?: string
  onCustomerUpdated?: (c: Customer) => void
} = {}) {
  const [cadences, setCadences] = useState<Cadence[]>([])
  const perPage = 100

  const [leads, setLeads] = useState<Customer[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [globalIndex, setGlobalIndex] = useState(0)

  const [cadenceIndex, setCadenceIndex] = useState(0)
  const [rotationKey, setRotationKey] = useState(0)

  const [isEditingCadence, setIsEditingCadence] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editCadenceContent, setEditCadenceContent] = useState('')
  const [editNotesContent, setEditNotesContent] = useState('')

  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const observer = useRef<IntersectionObserver | null>(null)

  const { toast } = useToast()

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (isEditingCadence || isEditingNotes) && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      toast({
        title: 'Edição em andamento',
        description: 'Salve ou cancele as alterações antes de sair da página.',
        variant: 'destructive',
      })
    }
  }, [blocker.state, toast])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditingCadence || isEditingNotes) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditingCadence, isEditingNotes])

  useEffect(() => {
    getActiveCadences()
      .then((data) => {
        setCadences(data)
        setCadenceIndex((prev) => (prev >= data.length ? 0 : prev))
      })
      .catch(() =>
        toast({
          title: 'Erro',
          description: 'Falha ao carregar cadências.',
          variant: 'destructive',
        }),
      )
  }, [toast])

  const loadLeads = useCallback(
    async (p: number, overwrite = false) => {
      try {
        if (overwrite) setIsLoading(true)
        else setIsFetchingMore(true)

        const data = await getPaginatedCustomers(p, perPage, search, phaseFilter, sourceFilter)

        setLeads((prev) => {
          if (overwrite) return data.items
          const newItems = data.items.filter((item) => !prev.some((p) => p.id === item.id))
          return [...prev, ...newItems]
        })

        setTotalItems(data.totalItems)
        setHasMore(p < data.totalPages)
        if (overwrite) setGlobalIndex(0)
      } catch (err) {
        if (!overwrite)
          toast({
            title: 'Erro',
            description: 'Falha ao carregar mais clientes.',
            variant: 'destructive',
          })
      } finally {
        setIsLoading(false)
        setIsFetchingMore(false)
        setIsInitialized(true)
      }
    },
    [search, phaseFilter, sourceFilter, perPage, toast],
  )

  useEffect(() => {
    setPage(1)
    loadLeads(1, true)
  }, [search, phaseFilter, sourceFilter, loadLeads])

  const loadMore = useCallback(() => {
    if (!isFetchingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadLeads(nextPage, false)
    }
  }, [isFetchingMore, hasMore, page, loadLeads])

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return
      if (observer.current) observer.current.disconnect()
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMore()
          }
        },
        { rootMargin: '100px' },
      )
      if (node) observer.current.observe(node)
    },
    [isLoading, loadMore],
  )

  // Automatically trigger infinite scroll background load when nearing the end manually via roulette
  useEffect(() => {
    if (leads.length > 0 && globalIndex >= leads.length - 5 && hasMore && !isFetchingMore) {
      loadMore()
    }
  }, [globalIndex, leads.length, hasMore, isFetchingMore, loadMore])

  // Scroll to active item when auto-advancing
  useEffect(() => {
    if (itemRefs.current[globalIndex] && !isPaused && !isEditingCadence && !isEditingNotes) {
      itemRefs.current[globalIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [globalIndex, isPaused, isEditingCadence, isEditingNotes])

  const nextCustomer = useCallback(() => {
    if (totalItems === 0) return

    const event = new CustomEvent('roulette-next', { cancelable: true })
    window.dispatchEvent(event)
    if (event.defaultPrevented) return

    setGlobalIndex((prev) => {
      if (prev >= totalItems - 1) return 0
      return prev + 1
    })
    setRotationKey((k) => k + 1)
  }, [totalItems])

  const nextCustomerRef = useRef(nextCustomer)
  useEffect(() => {
    nextCustomerRef.current = nextCustomer
  }, [nextCustomer])

  useEffect(() => {
    if (
      !isInitialized ||
      isLoading ||
      isPaused ||
      isEditingCadence ||
      isEditingNotes ||
      totalItems === 0
    )
      return
    const timer = setInterval(() => nextCustomerRef.current(), 15000)
    return () => clearInterval(timer)
  }, [
    isInitialized,
    isLoading,
    isPaused,
    isEditingCadence,
    isEditingNotes,
    totalItems,
    rotationKey,
  ])

  const currentCadence = cadences[cadenceIndex]
  const currentCustomer = leads[globalIndex]

  const handleEditCadence = () => {
    if (!currentCadence) return
    setEditCadenceContent(currentCadence.content)
    setIsEditingCadence(true)
  }

  const handleEditNotes = (customer: Customer, index: number) => {
    setGlobalIndex(index)
    setRotationKey((k) => k + 1)
    setEditNotesContent(customer.notes || '')
    setIsEditingNotes(true)
  }

  const handleSaveCadence = async () => {
    if (!currentCadence) return
    if (!editCadenceContent.trim()) {
      toast({
        title: 'Aviso',
        description: 'O conteúdo da mensagem é obrigatório.',
        variant: 'destructive',
      })
      return
    }
    setIsSaving(true)
    try {
      const updated = await updateCadence(currentCadence.id, { content: editCadenceContent })
      setCadences((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setIsEditingCadence(false)
      toast({ title: 'Sucesso', description: 'Mensagem sugerida atualizada com sucesso.' })
      if (blocker.state === 'blocked' && !isEditingNotes) blocker.proceed?.()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao atualizar cadência.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!currentCustomer) return
    setIsSaving(true)
    try {
      const updated = await updateCustomer(currentCustomer.id, { notes: editNotesContent })
      setLeads((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      if (onCustomerUpdated) onCustomerUpdated(updated)
      setIsEditingNotes(false)
      toast({ title: 'Sucesso', description: 'Anotações do cliente atualizadas.' })
      if (blocker.state === 'blocked' && !isEditingCadence) blocker.proceed?.()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao atualizar cliente.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelCadence = () => {
    setIsEditingCadence(false)
    if (blocker.state === 'blocked' && !isEditingNotes) blocker.proceed?.()
  }

  const handleCancelNotes = () => {
    setIsEditingNotes(false)
    if (blocker.state === 'blocked' && !isEditingCadence) blocker.proceed?.()
  }

  const nextCadence = () => setCadenceIndex((p) => (p + 1) % cadences.length)
  const prevCadence = () => setCadenceIndex((p) => (p - 1 + cadences.length) % cadences.length)

  if (!isInitialized || (isLoading && leads.length === 0)) {
    return (
      <Card className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-dashed">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-primary/50" />
        <p>Iniciando Roleta Inteligente com carregamento contínuo...</p>
      </Card>
    )
  }

  if (!isLoading && leads.length === 0) {
    return (
      <Card className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-dashed">
        <Layers className="h-8 w-8 mb-4 text-primary/50" />
        <p>Nenhum cliente encontrado para a roleta com os filtros atuais.</p>
      </Card>
    )
  }

  const parts = currentCadence?.title.split('|').map((s) => s.trim()) || []
  const step = parts[0] || currentCadence?.title || 'Sem cadência'
  const trigger = parts[1] || ''
  const channel = parts[2] || ''

  return (
    <Card
      className={cn(
        'shadow-subtle border-primary/10 bg-gradient-to-br from-background to-primary/5 overflow-hidden relative transition-opacity duration-200 flex flex-col h-[700px]',
        isLoading && 'pointer-events-none',
      )}
    >
      {isLoading && leads.length > 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-medium text-primary">Carregando dados...</p>
        </div>
      )}

      <div className="absolute top-0 left-0 w-full h-1 bg-muted z-10">
        {!isLoading && !isPaused && !isEditingCadence && !isEditingNotes && totalItems > 1 && (
          <div
            key={rotationKey}
            className="h-full bg-primary animate-[progress_15s_linear]"
            style={{ width: '100%', animationFillMode: 'forwards' }}
          />
        )}
      </div>

      <CardHeader className="flex flex-row items-center justify-between pb-4 shrink-0 border-b border-border/40 bg-background/50 backdrop-blur-sm z-10">
        <div>
          <CardTitle className="text-secondary flex items-center gap-2 text-xl">
            Roleta Inteligente: Villa dos Açores
          </CardTitle>
          <CardDescription>Pipeline da Bia - Ciclo de Cadência</CardDescription>
        </div>

        <div className="flex items-center gap-2 z-10">
          <Button
            variant={isPaused ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 shadow-sm border border-border/50"
            onClick={() => setIsPaused(!isPaused)}
            disabled={isEditingCadence || isEditingNotes || totalItems <= 1}
            title={isPaused ? 'Retomar Rotação' : 'Pausar Rotação'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span className="hidden sm:inline-block">{isPaused ? 'Retomar' : 'Pausar'}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
        {/* Top section: Cadence Information */}
        <div className="p-4 bg-muted/10 border-b border-border/40 shrink-0">
          {cadences.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center mr-2">
                <span className="text-xs font-semibold text-muted-foreground mr-2">Cadência:</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-r-none border-r-0"
                  onClick={prevCadence}
                  disabled={isEditingCadence || isEditingNotes}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <div className="h-6 px-2 flex items-center border-y border-input bg-background text-xs font-medium">
                  {cadenceIndex + 1}/{cadences.length}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-l-none border-l-0"
                  onClick={nextCadence}
                  disabled={isEditingCadence || isEditingNotes}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 shadow-sm text-[10px] py-0"
              >
                {step}
              </Badge>
              {trigger && (
                <Badge
                  variant="outline"
                  className="bg-primary/5 text-primary border-primary/20 shadow-sm text-[10px] py-0"
                >
                  Gatilho: {trigger}
                </Badge>
              )}
              {channel && (
                <Badge
                  variant="outline"
                  className="bg-primary/5 text-primary border-primary/20 shadow-sm text-[10px] py-0"
                >
                  Canal: {channel}
                </Badge>
              )}
            </div>
          )}

          {isEditingCadence ? (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-secondary flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> ÁREA EDITÁVEL - Mensagem Sugerida
                </span>
              </div>
              <Textarea
                className="min-h-[100px] resize-none bg-background/80 shadow-inner border-primary/30 focus-visible:ring-primary/50 text-sm"
                value={editCadenceContent}
                onChange={(e) => setEditCadenceContent(e.target.value)}
                placeholder="Conteúdo da mensagem sugerida..."
                disabled={isSaving}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancelCadence} disabled={isSaving}>
                  <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveCadence} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          ) : currentCadence ? (
            <div className="group relative animate-in fade-in duration-300">
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEditCadence}
                  className="shadow-sm border border-border/50 h-7 text-xs"
                >
                  <Edit2 className="w-3 h-3 mr-1.5" /> Editar Mensagem
                </Button>
              </div>

              <div
                className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-3 cursor-text hover:border-primary/40 transition-colors shadow-sm group-hover:shadow relative"
                onClick={handleEditCadence}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 rounded-l-lg" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Mensagem Sugerida
                </h4>
                <ScrollArea className="h-[60px] w-full pr-4">
                  <div className="text-sm text-secondary/90 font-medium whitespace-pre-wrap leading-relaxed">
                    {currentCadence.content}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-muted-foreground border rounded-lg bg-muted/20">
              Nenhuma mensagem de cadência configurada.
            </div>
          )}
        </div>

        {/* Bottom section: Infinite Scroll Customers List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative scroll-smooth bg-background/30">
          {leads.map((customer, index) => {
            const isActive = index === globalIndex
            const isEditingThisNotes = isEditingNotes && isActive

            return (
              <div
                key={customer.id}
                ref={(node) => {
                  itemRefs.current[index] = node
                  if (index === leads.length - 1) {
                    lastElementRef(node)
                  }
                }}
                className={cn(
                  'bg-background/90 backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 cursor-pointer',
                  isActive
                    ? 'border-primary shadow-md ring-1 ring-primary/20 relative'
                    : 'border-border/60 shadow-sm hover:border-primary/40 opacity-70 hover:opacity-100',
                )}
                onClick={() => {
                  if (!isEditingNotes && !isEditingCadence) {
                    setGlobalIndex(index)
                    setRotationKey((k) => k + 1)
                  }
                }}
              >
                {isActive && (
                  <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-md" />
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-start justify-between pl-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User
                        className={cn(
                          'h-4 w-4',
                          isActive ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
                      <h3
                        className={cn(
                          'font-semibold',
                          isActive ? 'text-primary' : 'text-secondary',
                        )}
                      >
                        {customer.name || 'Cliente Sem Nome'}
                      </h3>
                      <Badge variant="secondary" className="text-[10px]">
                        {customer.status}
                      </Badge>
                    </div>
                    {(customer.phone || customer.phone_1_value) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground pl-6">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{customer.phone || customer.phone_1_value}</span>
                      </div>
                    )}
                  </div>

                  <div
                    className="w-full sm:w-[55%]"
                    onClick={(e) => isEditingThisNotes && e.stopPropagation()}
                  >
                    {isEditingThisNotes ? (
                      <div className="space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                            <StickyNote className="w-3.5 h-3.5" /> Anotações
                          </span>
                        </div>
                        <Textarea
                          className="min-h-[80px] text-sm resize-none bg-background focus-visible:ring-primary/50"
                          value={editNotesContent}
                          onChange={(e) => setEditNotesContent(e.target.value)}
                          placeholder="Anotações do cliente..."
                          disabled={isSaving}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelNotes}
                            disabled={isSaving}
                            className="h-7 text-xs"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveNotes}
                            disabled={isSaving}
                            className="h-7 text-xs"
                          >
                            {isSaving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="relative cursor-text group/notes"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditNotes(customer, index)
                        }}
                      >
                        <div className="absolute right-1 top-1 opacity-0 group-hover/notes:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                          <StickyNote className="w-3.5 h-3.5" /> Anotações
                        </span>
                        <div
                          className={cn(
                            'text-sm p-2 rounded border transition-colors',
                            isActive
                              ? 'bg-primary/5 border-primary/20 text-secondary'
                              : 'bg-muted/30 border-transparent group-hover/notes:border-border/50 text-secondary/80',
                          )}
                        >
                          {customer.notes ? (
                            <span className="line-clamp-2">{customer.notes}</span>
                          ) : (
                            <span className="italic opacity-50">
                              Sem anotações. Clique para adicionar.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {isFetchingMore && (
            <div className="py-4 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
            </div>
          )}
          {!hasMore && leads.length > 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <div className="w-12 h-1 bg-border rounded-full opacity-50 mb-2"></div>
              Todos os {totalItems} clientes foram carregados.
            </div>
          )}
        </div>
      </CardContent>

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </Card>
  )
}
