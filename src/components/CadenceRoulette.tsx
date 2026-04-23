import { useState, useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function CadenceRoulette({
  externalCustomers,
  externalIsLoading,
  onCustomerUpdated,
  onNextPage,
  onPrevPage,
}: {
  externalCustomers?: Customer[]
  externalIsLoading?: boolean
  onCustomerUpdated?: (c: Customer) => void
  onNextPage?: () => void
  onPrevPage?: () => void
} = {}) {
  const [internalCustomers, setInternalCustomers] = useState<Customer[]>([])
  const [cadences, setCadences] = useState<Cadence[]>([])

  const [customerIndex, setCustomerIndex] = useState(0)
  const [cadenceIndex, setCadenceIndex] = useState(0)
  const [rotationKey, setRotationKey] = useState(0)

  const [isEditingCadence, setIsEditingCadence] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)

  const [isPaused, setIsPaused] = useState(false)
  const [internalIsLoading, setInternalIsLoading] = useState(true)

  const customers = externalCustomers || internalCustomers
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : internalIsLoading
  const [isSaving, setIsSaving] = useState(false)

  const [editCadenceContent, setEditCadenceContent] = useState('')
  const [editNotesContent, setEditNotesContent] = useState('')

  const { toast } = useToast()

  // Prevent navigation when editing
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

  const loadCadences = async () => {
    try {
      const cadData = await getActiveCadences()
      setCadences(cadData)
      setCadenceIndex((prev) => (prev >= cadData.length ? 0 : prev))
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar cadências.',
        variant: 'destructive',
      })
    }
  }

  const loadCustomers = async () => {
    if (externalIsLoading === undefined) setInternalIsLoading(true)
    try {
      if (!externalCustomers) {
        const custData = await getPaginatedCustomers(1, 50, '', 'all', '')
        setInternalCustomers(custData.items)
        setCustomerIndex((prev) => (prev >= custData.items.length ? 0 : prev))
      } else {
        setCustomerIndex((prev) => (prev >= externalCustomers.length ? 0 : prev))
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados da roleta.',
        variant: 'destructive',
      })
    } finally {
      if (externalIsLoading === undefined) setInternalIsLoading(false)
    }
  }

  useEffect(() => {
    loadCadences()
  }, [])

  useEffect(() => {
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCustomers])

  const nextCustomer = () => {
    if (customerIndex >= customers.length - 1) {
      if (onNextPage) onNextPage()
      setCustomerIndex(0)
    } else {
      setCustomerIndex(customerIndex + 1)
    }
    setRotationKey((k) => k + 1)
  }

  const prevCustomer = () => {
    if (customerIndex === 0) {
      if (onPrevPage) onPrevPage()
      setCustomerIndex(0)
    } else {
      setCustomerIndex(customerIndex - 1)
    }
    setRotationKey((k) => k + 1)
  }

  useEffect(() => {
    if (
      isLoading ||
      (customers.length <= 1 && !onNextPage) ||
      isPaused ||
      isEditingCadence ||
      isEditingNotes
    )
      return
    const timer = setInterval(nextCustomer, 15000)
    return () => clearInterval(timer)
  }, [
    isLoading,
    customers.length,
    isPaused,
    isEditingCadence,
    isEditingNotes,
    customerIndex,
    onNextPage,
  ])

  const currentCadence = cadences[cadenceIndex]
  const currentCustomer = customers[customerIndex]

  const handleEditCadence = () => {
    if (!currentCadence) return
    setEditCadenceContent(currentCadence.content)
    setIsEditingCadence(true)
  }

  const handleEditNotes = () => {
    if (!currentCustomer) return
    setEditNotesContent(currentCustomer.notes || '')
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
      if (onCustomerUpdated) {
        onCustomerUpdated(updated)
      } else {
        setInternalCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      }
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

  if (isLoading && customers.length === 0) {
    return (
      <Card className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-dashed">
        <RefreshCw className="h-8 w-8 animate-spin mb-4 text-primary/50" />
        <p>Carregando Roleta Inteligente...</p>
      </Card>
    )
  }

  if (!isLoading && customers.length === 0) {
    return (
      <Card className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-dashed">
        <Layers className="h-8 w-8 mb-4 text-primary/50" />
        <p>Nenhum cliente encontrado para a roleta.</p>
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
        'shadow-subtle border-primary/10 bg-gradient-to-br from-background to-primary/5 overflow-hidden relative transition-opacity duration-200',
        isLoading && 'opacity-70 pointer-events-none',
      )}
    >
      {isLoading && customers.length > 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-medium text-primary">Carregando nova lista...</p>
        </div>
      )}
      <div className="absolute top-0 left-0 w-full h-1 bg-muted">
        {!isLoading &&
          !isPaused &&
          !isEditingCadence &&
          !isEditingNotes &&
          (customers.length > 1 || onNextPage) && (
            <div
              key={rotationKey}
              className="h-full bg-primary animate-[progress_15s_linear]"
              style={{ width: '100%', animationFillMode: 'forwards' }}
            />
          )}
      </div>

      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
        <div>
          <CardTitle className="text-secondary flex items-center gap-2 text-xl">
            Roleta Inteligente: Villa dos Açores
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium border border-primary/20">
              Cliente {customerIndex + 1} de {customers.length}
            </span>
          </CardTitle>
          <CardDescription>Pipeline da Bia - Ciclo de Cadência</CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2 z-10">
          <div className="flex items-center gap-1 bg-background/50 backdrop-blur-sm rounded-md p-1 border shadow-sm">
            <Button
              variant={isPaused ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsPaused(!isPaused)}
              disabled={
                isEditingCadence || isEditingNotes || (customers.length <= 1 && !onNextPage)
              }
              title={isPaused ? 'Retomar Rotação' : 'Pausar Rotação'}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={prevCustomer}
              disabled={
                isEditingCadence || isEditingNotes || (customers.length <= 1 && !onPrevPage)
              }
              title="Cliente Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={nextCustomer}
              disabled={
                isEditingCadence || isEditingNotes || (customers.length <= 1 && !onNextPage)
              }
              title="Próximo Cliente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Information Section */}
        {currentCustomer && (
          <div className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-sm group relative">
            <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-secondary">{currentCustomer.name}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {currentCustomer.status}
                  </Badge>
                </div>
                {(currentCustomer.phone || currentCustomer.phone_1_value) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{currentCustomer.phone || currentCustomer.phone_1_value}</span>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-1/2">
                {isEditingNotes ? (
                  <div className="space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5" /> Anotações
                      </span>
                    </div>
                    <Textarea
                      className="min-h-[80px] text-sm resize-none"
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
                        {isSaving && <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative cursor-text group/notes" onClick={handleEditNotes}>
                    <div className="absolute right-1 top-1 opacity-0 group-hover/notes:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                      <StickyNote className="w-3.5 h-3.5" /> Anotações
                    </span>
                    <ScrollArea className="h-[60px] w-full text-sm text-secondary/80 bg-muted/30 p-2 rounded border border-transparent group-hover/notes:border-border/50">
                      {currentCustomer.notes || (
                        <span className="italic opacity-50">
                          Sem anotações. Clique para adicionar.
                        </span>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cadence Section */}
        {cadences.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-2 pt-2 border-t border-border/30">
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
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-secondary flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" /> ÁREA EDITÁVEL - Mensagem Sugerida
              </span>
            </div>
            <Textarea
              className="min-h-[120px] resize-none bg-background/80 shadow-inner border-primary/30 focus-visible:ring-primary/50"
              value={editCadenceContent}
              onChange={(e) => setEditCadenceContent(e.target.value)}
              placeholder="Conteúdo da mensagem sugerida..."
              disabled={isSaving}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleCancelCadence} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
              <Button onClick={handleSaveCadence} disabled={isSaving}>
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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
              className="bg-background/60 backdrop-blur-sm border border-border/50 rounded-lg p-4 cursor-text hover:border-primary/40 transition-colors shadow-sm group-hover:shadow relative"
              onClick={handleEditCadence}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 rounded-l-lg" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Mensagem Sugerida
              </h4>
              <ScrollArea className="h-[80px] w-full pr-4">
                <div className="text-sm text-secondary/90 font-medium whitespace-pre-wrap leading-relaxed">
                  {currentCadence.content}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg bg-muted/20">
            Nenhuma mensagem de cadência configurada.
          </div>
        )}
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
