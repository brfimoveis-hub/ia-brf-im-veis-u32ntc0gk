import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Clock,
  TrendingUp,
  Sparkles,
  Bot,
  Search,
  Megaphone,
  Users,
  Plus,
  MessageSquare,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { getCustomers, updateCustomer, syncRemarketing, type Customer } from '@/services/customers'
import { getConversations, type Conversation } from '@/services/conversations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { ToastAction } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { CustomerDetailDrawer } from '@/components/customers/CustomerDetailDrawer'

const PHASES = [
  { id: 1, title: 'Lead Novo', color: 'bg-slate-500' },
  { id: 2, title: 'Contato 1', color: 'bg-blue-400' },
  { id: 3, title: 'Contato 2', color: 'bg-blue-500' },
  { id: 4, title: 'Qualificação', color: 'bg-indigo-400' },
  { id: 5, title: 'Qualificado', color: 'bg-indigo-500' },
  { id: 6, title: 'Demo Agend.', color: 'bg-purple-500' },
  { id: 7, title: 'Demo Realiz.', color: 'bg-purple-600' },
  { id: 8, title: 'Proposta', color: 'bg-amber-500' },
  { id: 9, title: 'Negociação', color: 'bg-orange-500' },
  { id: 10, title: 'Fechamento', color: 'bg-green-500' },
]

export default function CRM() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [searchFilter, setSearchFilter] = useState('')
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState('Lead')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [draggedCustomerId, setDraggedCustomerId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!loading) return

    Promise.all([getCustomers(), getConversations()])
      .then(([customersData, conversationsData]) => {
        if (mounted) {
          setCustomers(customersData)
          setConversations(conversationsData)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [loading])

  const handleCustomersRealtime = useCallback((e: any) => {
    if (e.action === 'create') setCustomers((prev) => [e.record as unknown as Customer, ...prev])
    else if (e.action === 'update')
      setCustomers((prev) =>
        prev.map((c) => (c.id === e.record.id ? (e.record as unknown as Customer) : c)),
      )
    else if (e.action === 'delete') setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
  }, [])

  const handleConversationsRealtime = useCallback((e: any) => {
    if (e.action === 'create') {
      setConversations((prev) => {
        if (prev.some((c) => c.id === e.record.id)) return prev
        return [...prev, e.record as unknown as Conversation]
      })
    } else if (e.action === 'update') {
      setConversations((prev) =>
        prev.map((c) => (c.id === e.record.id ? (e.record as unknown as Conversation) : c)),
      )
    } else if (e.action === 'delete') {
      setConversations((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  }, [])

  useRealtime('customers', handleCustomersRealtime)
  useRealtime('conversations', handleConversationsRealtime)

  const filteredCustomers = useMemo(() => {
    if (!searchFilter) return customers
    const lowerSearch = searchFilter.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerSearch) ||
        c.email?.toLowerCase().includes(lowerSearch) ||
        c.phone?.includes(searchFilter) ||
        (Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(lowerSearch))),
    )
  }, [customers, searchFilter])

  const handleSyncRemarketing = async () => {
    if (filteredCustomers.length === 0) return
    setIsSyncing(true)
    try {
      const payloads = filteredCustomers.map((c) => ({
        id: c.id,
        em: c.email || c.email_1_value || '',
        ph: c.phone || c.phone_1_value || '',
        tags: c.tags || [],
      }))
      const res = await syncRemarketing(payloads, searchFilter, selectedEvent)
      toast({
        title: 'Sincronização Concluída',
        description: `${res.synced} leads enviados para o Meta CAPI.`,
      })
      setSyncDialogOpen(false)
    } catch (error: any) {
      toast({
        title: 'Erro de Sincronização',
        description: error.message || 'Falha ao sincronizar leads com o Meta.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const parsedTags = useMemo(() => {
    const list = user?.meta_tags_list
    if (!list) return []
    if (Array.isArray(list)) return list
    if (typeof list === 'string') {
      try {
        return JSON.parse(list)
      } catch {
        return []
      }
    }
    return []
  }, [user?.meta_tags_list])

  const handleDragStart = (e: React.DragEvent, customerId: string) => {
    e.dataTransfer.setData('customerId', customerId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedCustomerId(customerId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newPhaseTitle: string) => {
    e.preventDefault()
    const customerId = e.dataTransfer.getData('customerId')
    setDraggedCustomerId(null)

    if (!customerId) return

    const customer = customers.find((c) => c.id === customerId)
    if (!customer || customer.status === newPhaseTitle) return

    // Optimistic update
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status: newPhaseTitle } : c)),
    )

    try {
      await updateCustomer(customerId, { status: newPhaseTitle })
      toast({
        title: 'Lead atualizado',
        description: `${customer.name} movido para ${newPhaseTitle}.`,
      })
    } catch (error) {
      // Revert on error
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, status: customer.status } : c)),
      )
      toast({ title: 'Erro ao mover lead', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <TrendingUp className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse">Carregando pipeline...</p>
        </div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="h-[calc(100vh-10rem)] flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
        <div className="bg-muted/30 p-6 rounded-full mb-6">
          <Users className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl font-bold text-secondary mb-2">Nenhum cliente encontrado</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Você ainda não possui clientes cadastrados. Adicione seu primeiro cliente para iniciar o
          acompanhamento.
        </p>
        <Button onClick={() => navigate('/clientes')} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Adicionar Primeiro Cliente
        </Button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col">
      <div className="mb-6 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Central de Controle de Leads
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Arraste os leads entre as fases ou deixe a IA evoluí-los automaticamente com base nas
            conversas.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por nome..."
              className="pl-9 bg-background"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          {searchFilter && (
            <Button
              onClick={() => {
                if (!user?.meta_pixel_id || !user?.meta_capi_token) {
                  toast({
                    description:
                      'Erro de sincronização: o ID do Pixel ou o Token da API de Conversões não estão configurados.',
                    variant: 'destructive',
                    action: (
                      <ToastAction
                        altText="Ir para configurações"
                        onClick={() => navigate('/configuracoes')}
                      >
                        Configurar
                      </ToastAction>
                    ),
                  })
                } else {
                  setSyncDialogOpen(true)
                }
              }}
              variant="secondary"
              className="gap-2 shrink-0 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
            >
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Ativar Remarketing</span> (
              {filteredCustomers.length})
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 border rounded-xl bg-muted/10 shadow-inner">
        <div className="flex h-full p-4 gap-4 w-max min-w-full">
          {PHASES.map((phase) => {
            const phaseLeads = filteredCustomers.filter(
              (l) => (l.status || 'Lead Novo') === phase.title,
            )

            return (
              <div
                key={phase.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, phase.title)}
                className="w-[300px] shrink-0 flex flex-col bg-card rounded-xl border shadow-sm h-full max-h-full overflow-hidden transition-colors"
              >
                <div className="p-3 border-b bg-muted/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-3 w-3 rounded-full shadow-sm', phase.color)} />
                    <h3
                      className="font-semibold text-sm text-secondary truncate"
                      title={phase.title}
                    >
                      {phase.title}
                    </h3>
                  </div>
                  <Badge
                    variant="secondary"
                    className="px-1.5 min-w-[1.5rem] flex justify-center bg-background shadow-sm"
                  >
                    {phaseLeads.length}
                  </Badge>
                </div>

                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2 min-h-[100px]">
                    {phaseLeads.map((lead) => {
                      const leadMsgs = conversations.filter((c) => c.customer_id === lead.id)
                      const lastMsg = leadMsgs.length > 0 ? leadMsgs[leadMsgs.length - 1] : null
                      const isAiPaused = lead.tags?.includes('ai_paused')

                      return (
                        <Card
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => setSelectedCustomerId(lead.id)}
                          className={cn(
                            'shadow-subtle hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-muted group relative overflow-hidden animate-fade-in',
                            draggedCustomerId === lead.id ? 'opacity-50 scale-95' : '',
                          )}
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 border">
                                  <AvatarImage
                                    src={`https://img.usecurling.com/ppl/thumbnail?seed=${lead.id}`}
                                  />
                                  <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium text-sm text-secondary leading-tight line-clamp-1">
                                    {lead.name}
                                  </h4>
                                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                                    {lead.phone || lead.email}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {lastMsg ? (
                              <div className="mb-3 px-2 py-1.5 bg-muted/40 rounded-md">
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  <span className="font-semibold text-[10px] uppercase text-secondary/60 mr-1">
                                    {lastMsg.sender === 'user' || lastMsg.sender === 'agent'
                                      ? 'Atendente:'
                                      : lastMsg.sender === 'ai'
                                        ? 'IA:'
                                        : lastMsg.sender === 'customer'
                                          ? 'Lead:'
                                          : 'Sistema:'}
                                  </span>
                                  {lastMsg.content}
                                </p>
                              </div>
                            ) : (
                              <div className="mb-3 px-2 py-1.5 flex items-center gap-1.5 text-muted-foreground/50">
                                <MessageSquare className="h-3 w-3" />
                                <span className="text-[10px]">Sem mensagens</span>
                              </div>
                            )}

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(lead.updated).toLocaleDateString()}</span>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                                        isAiPaused
                                          ? 'bg-amber-500/10 text-amber-600'
                                          : 'bg-primary/10 text-primary',
                                      )}
                                    >
                                      {isAiPaused ? (
                                        <User className="h-2.5 w-2.5" />
                                      ) : (
                                        <Bot className="h-2.5 w-2.5" />
                                      )}
                                      {isAiPaused ? 'Humano' : 'IA Ativa'}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {isAiPaused
                                      ? 'Atendimento humano. A IA não responderá.'
                                      : 'IA está assumindo o atendimento automaticamente.'}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                    {phaseLeads.length === 0 && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed rounded-lg border-muted-foreground/20 text-muted-foreground/50 text-xs font-medium pointer-events-none">
                        Solte aqui
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronizar Remarketing (Meta CAPI)</DialogTitle>
            <DialogDescription>
              Isso enviará {filteredCustomers.length} leads filtrados pela busca "{searchFilter}"
              para o Meta, permitindo criar campanhas segmentadas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Evento de Conversão / Tag</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lead">Lead (Padrão)</SelectItem>
                  {parsedTags.map((tag: any, idx: number) => {
                    const tagValue =
                      typeof tag === 'string' ? tag : tag.name || tag.id || `Tag ${idx + 1}`
                    return (
                      <SelectItem key={idx} value={tagValue}>
                        {tagValue}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Apenas contatos com email ou telefone válidos serão sincronizados via hash SHA256 para
              manter a segurança e conformidade com o Meta.
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSyncDialogOpen(false)} disabled={isSyncing}>
              Cancelar
            </Button>
            <Button onClick={handleSyncRemarketing} disabled={isSyncing}>
              {isSyncing ? 'Enviando...' : 'Confirmar Envio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        open={!!selectedCustomerId}
        onOpenChange={(open) => !open && setSelectedCustomerId(null)}
      />
    </div>
  )
}
