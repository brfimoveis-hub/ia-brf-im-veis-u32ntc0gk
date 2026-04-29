import { useEffect, useState, useMemo } from 'react'
import {
  Activity,
  Bot,
  Filter,
  MessageSquare,
  Search,
  Send,
  User,
  Wrench,
  MousePointerClick,
  Clock,
  ChevronRight,
  Phone,
  Mail,
  Tag,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSystemLogs, SystemLog } from '@/services/system_logs'
import { getConversations, Conversation } from '@/services/conversations'
import { getCustomers, Customer } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

type FeedItem = {
  id: string
  source: 'log' | 'conversation'
  created: string
  original: SystemLog | Conversation
  customerId?: string
  typeCategory:
    | 'diagnostic'
    | 'diagnostic_error'
    | 'remarketing_sent'
    | 'remarketing_interaction'
    | 'ai_message'
    | 'customer_reply'
    | 'other'
  title: string
  description: string
  details?: any
}

const safeFormatDate = (dateStr: string, fmt: string) => {
  try {
    if (!dateStr) return 'Data desconhecida'
    return format(new Date(dateStr), fmt, { locale: ptBR })
  } catch (e) {
    return 'Data inválida'
  }
}

export default function Logs() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [customers, setCustomers] = useState<Record<string, Customer>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null)

  const loadData = async () => {
    try {
      const [logsRes, convsRes, custsRes] = await Promise.all([
        getSystemLogs(1, 200), // Get latest 200 logs
        getConversations(),
        getCustomers(),
      ])

      setLogs(logsRes.items)
      setConversations(convsRes)

      const custMap: Record<string, Customer> = {}
      custsRes.forEach((c) => {
        custMap[c.id] = c
      })
      setCustomers(custMap)
    } catch (error) {
      console.error('Failed to load logs and activities', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('system_logs', (e) => {
    if (e.action === 'create') setLogs((prev) => [e.record as SystemLog, ...prev])
  })

  useRealtime('conversations', (e) => {
    if (e.action === 'create') setConversations((prev) => [e.record as Conversation, ...prev])
  })

  const feedItems = useMemo(() => {
    const items: FeedItem[] = []

    logs.forEach((log) => {
      let typeCategory: FeedItem['typeCategory'] = 'other'
      const isDiagnostic = log.type.toLowerCase() === 'diagnostic'
      const isDiagnosticError =
        log.type.toLowerCase() === 'diagnostic_error' ||
        log.type.toLowerCase() === 'remarketing_error'
      const isRemarketing =
        log.type.toLowerCase().includes('remarketing') ||
        log.type.toLowerCase().includes('meta') ||
        log.type.toLowerCase() === 'webhook'

      const payloadObj =
        typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload || {}
      const eventNameStr = payloadObj.eventName || payloadObj.event_name || ''
      const eventName = eventNameStr.toLowerCase()

      if (isDiagnosticError) {
        typeCategory = 'diagnostic_error'
      } else if (isDiagnostic) {
        typeCategory = 'diagnostic'
      } else if (isRemarketing) {
        if (
          ['pageview', 'lead', 'viewcontent', 'click', 'interaction'].includes(eventName) ||
          log.message.toLowerCase().includes('interação')
        ) {
          typeCategory = 'remarketing_interaction'
        } else {
          typeCategory = 'remarketing_sent'
        }
      }

      if (payloadObj.payloads && Array.isArray(payloadObj.payloads)) {
        payloadObj.payloads.forEach((p: any, idx: number) => {
          items.push({
            id: `${log.id}-${idx}`,
            source: 'log',
            created: log.created,
            original: log,
            customerId: p.id || p.customer_id,
            typeCategory,
            title:
              typeCategory === 'remarketing_interaction'
                ? `Interação: ${eventNameStr || 'Evento'}`
                : typeCategory === 'remarketing_sent'
                  ? `Remarketing: ${eventNameStr || 'Enviado'}`
                  : log.message,
            description: log.details || log.message,
            details: p,
          })
        })
      } else {
        items.push({
          id: log.id,
          source: 'log',
          created: log.created,
          original: log,
          customerId: payloadObj.customer_id || payloadObj.id,
          typeCategory,
          title:
            typeCategory === 'diagnostic_error'
              ? 'Erro de Diagnóstico/Ingestão'
              : typeCategory === 'diagnostic'
                ? 'Diagnóstico de Sistema'
                : typeCategory === 'remarketing_interaction'
                  ? `Interação: ${eventNameStr || 'Evento'}`
                  : typeCategory === 'remarketing_sent'
                    ? `Remarketing: ${eventNameStr || 'Enviado'}`
                    : log.message || log.type,
          description: log.details || '',
          details: payloadObj,
        })
      }
    })

    conversations.forEach((conv) => {
      let typeCategory: FeedItem['typeCategory'] = 'other'
      let title = 'Mensagem'

      if (conv.sender === 'customer') {
        typeCategory = 'customer_reply'
        title = 'Resposta do Cliente'
      } else if (conv.sender === 'ai') {
        typeCategory = 'ai_message'
        title = 'Mensagem da IA'
      } else {
        title = `Mensagem (${conv.sender})`
      }

      items.push({
        id: conv.id,
        source: 'conversation',
        created: conv.created,
        original: conv,
        customerId: conv.customer_id,
        typeCategory,
        title,
        description: conv.content,
      })
    })

    return items.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  }, [logs, conversations])

  const filteredFeed = useMemo(() => {
    return feedItems.filter((item) => {
      if (typeFilter !== 'all') {
        if (
          typeFilter === 'remarketing' &&
          !['remarketing_sent', 'remarketing_interaction'].includes(item.typeCategory)
        )
          return false
        if (typeFilter === 'ai_message' && item.typeCategory !== 'ai_message') return false
        if (typeFilter === 'customer_reply' && item.typeCategory !== 'customer_reply') return false
        if (
          typeFilter === 'diagnostic' &&
          item.typeCategory !== 'diagnostic' &&
          item.typeCategory !== 'diagnostic_error'
        )
          return false
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const customer = item.customerId ? customers[item.customerId] : null
        const customerName = customer?.name?.toLowerCase() || ''
        const customerPhone = customer?.phone || ''
        const titleMatch = item.title.toLowerCase().includes(query)
        const descMatch = item.description.toLowerCase().includes(query)
        const customerMatch = customerName.includes(query) || customerPhone.includes(query)

        if (!titleMatch && !descMatch && !customerMatch) return false
      }

      return true
    })
  }, [feedItems, typeFilter, searchQuery, customers])

  const getIconForType = (type: FeedItem['typeCategory']) => {
    switch (type) {
      case 'diagnostic':
        return <Wrench className="h-4 w-4 text-slate-500" />
      case 'diagnostic_error':
        return <Wrench className="h-4 w-4 text-red-500" />
      case 'remarketing_sent':
        return <Send className="h-4 w-4 text-blue-500" />
      case 'remarketing_interaction':
        return <MousePointerClick className="h-4 w-4 text-green-500" />
      case 'ai_message':
        return <Bot className="h-4 w-4 text-purple-500" />
      case 'customer_reply':
        return <MessageSquare className="h-4 w-4 text-amber-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getBadgeVariant = (type: FeedItem['typeCategory']) => {
    switch (type) {
      case 'diagnostic':
        return 'secondary'
      case 'diagnostic_error':
        return 'destructive'
      case 'remarketing_sent':
        return 'default'
      case 'remarketing_interaction':
        return 'default'
      case 'ai_message':
        return 'outline'
      case 'customer_reply':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const historyFeed = useMemo(() => {
    if (!selectedItem?.customerId) return []
    return feedItems
      .filter((i) => i.customerId === selectedItem.customerId)
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
  }, [feedItems, selectedItem])

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Trail de Interações</h2>
          <p className="text-muted-foreground">
            Acompanhe linha a linha todas as mensagens enviadas e interações dos clientes em tempo
            real.
          </p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, telefone ou conteúdo..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Atividades</SelectItem>
                  <SelectItem value="remarketing">Remarketing</SelectItem>
                  <SelectItem value="customer_reply">Respostas de Clientes</SelectItem>
                  <SelectItem value="ai_message">Mensagens IA</SelectItem>
                  <SelectItem value="diagnostic">Diagnósticos e Erros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 relative">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)] border rounded-md bg-card">
              {filteredFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-20" />
                  <p>Nenhuma atividade encontrada.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredFeed.map((item) => {
                    const customer = item.customerId ? customers[item.customerId] : null

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'p-4 hover:bg-muted/50 cursor-pointer transition-colors flex gap-4 items-start group',
                          selectedItem?.id === item.id && 'bg-muted',
                        )}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="mt-1 h-8 w-8 rounded-full flex items-center justify-center bg-background border shadow-sm shrink-0">
                          {getIconForType(item.typeCategory)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-medium text-sm truncate">{item.title}</span>
                              {customer && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-normal truncate hidden sm:inline-flex"
                                >
                                  {customer.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground shrink-0 gap-1">
                              <Clock className="h-3 w-3" />
                              {safeFormatDate(item.created, 'dd/MM/yyyy HH:mm')}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.description}
                          </p>

                          {customer && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground sm:hidden mb-2">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" /> {customer.name}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <Badge
                              variant={getBadgeVariant(item.typeCategory)}
                              className={cn(
                                'text-[10px] uppercase tracking-wider',
                                item.typeCategory === 'remarketing_interaction' &&
                                  'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
                                item.typeCategory === 'remarketing_sent' &&
                                  'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200',
                                item.typeCategory === 'customer_reply' &&
                                  'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200',
                              )}
                            >
                              {item.typeCategory.replace('_', ' ')}
                            </Badge>

                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl flex flex-col p-0 gap-0">
          <SheetHeader className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted border shrink-0">
                {selectedItem && getIconForType(selectedItem.typeCategory)}
              </div>
              <div>
                <SheetTitle>{selectedItem?.title}</SheetTitle>
                <SheetDescription>
                  {selectedItem?.created &&
                    safeFormatDate(selectedItem.created, "dd 'de' MMMM 'às' HH:mm")}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
                  Detalhes do Evento
                </h3>
                <Card>
                  <CardContent className="p-4 text-sm whitespace-pre-wrap break-words bg-muted/30">
                    {selectedItem?.description || 'Sem descrição'}
                  </CardContent>
                </Card>
                {selectedItem?.details && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Payload JSON (Raw):</p>
                    <pre className="text-[10px] bg-slate-950 text-slate-50 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedItem.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {selectedItem?.customerId && customers[selectedItem.customerId] && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
                    Perfil do Cliente
                  </h3>
                  <Card>
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border">
                          <AvatarImage src={customers[selectedItem.customerId]?.photo || ''} />
                          <AvatarFallback>
                            <User className="h-6 w-6 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {customers[selectedItem.customerId]?.name}
                          </p>
                          <Badge variant="outline" className="text-[10px] uppercase mt-1">
                            {customers[selectedItem.customerId]?.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-sm">
                        {customers[selectedItem.customerId]?.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{customers[selectedItem.customerId]?.phone}</span>
                          </div>
                        )}
                        {customers[selectedItem.customerId]?.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">
                              {customers[selectedItem.customerId]?.email}
                            </span>
                          </div>
                        )}
                      </div>

                      {customers[selectedItem.customerId]?.tags &&
                        customers[selectedItem.customerId]!.tags!.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {customers[selectedItem.customerId]!.tags!.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedItem?.customerId && historyFeed.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
                    Histórico de Interações
                  </h3>
                  <div className="space-y-4 pl-2 border-l-2 ml-2">
                    {historyFeed.map((histItem) => (
                      <div key={histItem.id} className="relative pl-6">
                        <div
                          className={cn(
                            'absolute -left-[27px] top-1 h-5 w-5 rounded-full border bg-background flex items-center justify-center',
                            histItem.id === selectedItem.id
                              ? 'ring-2 ring-primary border-primary'
                              : '',
                          )}
                        >
                          {getIconForType(histItem.typeCategory)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                histItem.id === selectedItem.id && 'text-primary',
                              )}
                            >
                              {histItem.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {safeFormatDate(histItem.created, 'dd/MM HH:mm')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {histItem.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}
