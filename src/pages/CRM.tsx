import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, TrendingUp, Sparkles, Bot, Search, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { getCustomers, updateCustomer, syncRemarketing, type Customer } from '@/services/customers'
import { createConversation } from '@/services/conversations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  const [loading, setLoading] = useState(true)
  const customersRef = useRef(customers)
  const { toast } = useToast()
  const { user } = useAuth()

  const [searchFilter, setSearchFilter] = useState('')
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState('Lead')

  useEffect(() => {
    customersRef.current = customers
  }, [customers])

  useEffect(() => {
    getCustomers()
      .then((data) => {
        setCustomers(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  useRealtime('customers', (e) => {
    if (e.action === 'create') setCustomers((prev) => [e.record as unknown as Customer, ...prev])
    else if (e.action === 'update')
      setCustomers((prev) =>
        prev.map((c) => (c.id === e.record.id ? (e.record as unknown as Customer) : c)),
      )
    else if (e.action === 'delete') setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
  })

  useEffect(() => {
    const timer = setInterval(async () => {
      const currentCustomers = customersRef.current
      if (currentCustomers.length === 0) return

      const movableLeads = currentCustomers.filter((c) => {
        const currentPhaseIndex = PHASES.findIndex((p) => p.title === (c.status || 'Lead Novo'))
        return currentPhaseIndex >= 0 && currentPhaseIndex < PHASES.length - 1
      })
      if (movableLeads.length === 0) return

      const leadToMove = movableLeads[Math.floor(Math.random() * movableLeads.length)]
      const currentPhaseIndex = PHASES.findIndex(
        (p) => p.title === (leadToMove.status || 'Lead Novo'),
      )
      const nextPhase = PHASES[currentPhaseIndex + 1]

      try {
        await updateCustomer(leadToMove.id, { status: nextPhase.title })
        await createConversation({
          customer_id: leadToMove.id,
          content: `IA analisou a intenção e moveu o lead para "${nextPhase.title}".`,
          sender: 'system',
        })
        toast({
          title: 'Transição Automática (IA)',
          description: `A IA processou o lead ${leadToMove.name} e moveu para: ${nextPhase.title}`,
        })
      } catch (error) {
        console.error('Failed to transition lead', error)
      }
    }, 15000)

    return () => clearInterval(timer)
  }, [toast])

  const filteredCustomers = useMemo(() => {
    if (!searchFilter) return customers
    const lowerSearch = searchFilter.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerSearch) ||
        c.email?.toLowerCase().includes(lowerSearch) ||
        c.phone?.includes(searchFilter) ||
        c.tags?.some((t) => t.toLowerCase().includes(lowerSearch)),
    )
  }, [customers, searchFilter])

  const handleSyncRemarketing = async () => {
    if (filteredCustomers.length === 0) return
    setIsSyncing(true)
    try {
      const ids = filteredCustomers.map((c) => c.id)
      const res = await syncRemarketing(ids, searchFilter, selectedEvent)
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

  const metaTagsList = user?.meta_tags_list || []
  let parsedTags: any[] = []
  if (Array.isArray(metaTagsList)) {
    parsedTags = metaTagsList
  } else if (typeof metaTagsList === 'string') {
    try {
      parsedTags = JSON.parse(metaTagsList)
    } catch {
      /* intentionally ignored */
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

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col">
      <div className="mb-6 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Pipeline de Vendas Inteligente
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            A inteligência artificial analisa as conversas da linha 55 48 992098050 e avança os
            leads automaticamente entre as 10 cadências.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por nome (ex: Villa dos Açores)..."
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
                    title: 'Erro de sincronização',
                    description:
                      'O ID do Pixel ou o Token da API de Conversões não estão configurados. Vá para as configurações para preenchê-los.',
                    variant: 'destructive',
                  })
                  if (user?.id) {
                    pb.collection('system_logs')
                      .create({
                        user_id: user.id,
                        type: 'REMARKETING_SYNC',
                        message: 'Falha na sincronização: credenciais do Meta ausentes.',
                        details:
                          'O usuário tentou iniciar o remarketing sem configurar o Pixel ID ou Token CAPI.',
                        payload: { searchFilter, count: filteredCustomers.length },
                      })
                      .catch(console.error)
                  }
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
                className="w-[300px] shrink-0 flex flex-col bg-card rounded-xl border shadow-sm h-full max-h-full overflow-hidden"
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
                  <div className="space-y-2">
                    {phaseLeads.map((lead) => (
                      <Card
                        key={lead.id}
                        className="shadow-subtle hover:shadow-md transition-all cursor-pointer border-muted group relative overflow-hidden animate-fade-in"
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
                                <h4 className="font-medium text-sm text-secondary leading-tight">
                                  {lead.name}
                                </h4>
                                <span className="text-[10px] text-muted-foreground">
                                  {lead.phone || lead.email}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 mt-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(lead.updated).toLocaleDateString()}</span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="bg-primary/5 text-primary border-primary/20 text-[10px] gap-1 cursor-help"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    Curioso
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Sentimento detectado pela IA</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-500/5 text-amber-600 border-amber-500/20 text-[10px] gap-1 cursor-help truncate max-w-[140px]"
                                  >
                                    <Bot className="h-2.5 w-2.5" />
                                    Avançar no pipeline
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Próxima ação sugerida: Avançar no pipeline
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {phaseLeads.length === 0 && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed rounded-lg border-muted-foreground/20 text-muted-foreground/50 text-xs font-medium">
                        Nenhum lead
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
    </div>
  )
}
