import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { type Conversation, getConversations } from '@/services/conversations'
import { type Customer, getCustomer } from '@/services/customers'
import { cn, formatPhone } from '@/lib/utils'
import { isAutomatedSystemThread, isSystemVerificationMessage } from '@/lib/system-messages'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search,
  MessageSquare,
  Sparkles,
  User,
  Bot,
  RefreshCw,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronRight,
  Send,
  SlidersHorizontal,
} from 'lucide-react'

// Ícones específicos por canal
function ChannelBadge({ channel }: { channel?: string }) {
  const c = channel?.toLowerCase() || 'whatsapp'
  if (c === 'instagram') {
    return (
      <Badge
        variant="outline"
        className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 text-[11px] gap-1 px-1.5 py-0"
      >
        <span className="font-medium">Instagram</span>
      </Badge>
    )
  }
  if (c === 'messenger') {
    return (
      <Badge
        variant="outline"
        className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] gap-1 px-1.5 py-0"
      >
        <span className="font-medium">Messenger</span>
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1 px-1.5 py-0"
    >
      <span className="font-medium">WhatsApp</span>
    </Badge>
  )
}

function formatRelativeTime(dateString: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Agora'
  if (diffMinutes < 60) return `${diffMinutes}min`
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return days[date.getDay()]
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
}

function formatFullDateTime(dateString: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const isToday = new Date().toDateString() === date.toDateString()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  return `${date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} às ${time}`
}

interface ThreadItem {
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_status?: string
  customer_source?: string
  last_message: string
  last_message_time: string
  channel: string
  sender: string
  is_active_24h: boolean
}

export default function Atendimentos() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCustomerIdFromUrl = searchParams.get('cliente')

  const [threads, setThreads] = useState<ThreadItem[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    selectedCustomerIdFromUrl || null,
  )
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [messages, setMessages] = useState<Conversation[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [channelFilter, setChannelFilter] = useState<
    'all' | 'whatsapp' | 'instagram' | 'messenger'
  >('all')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sincroniza query param com selectedCustomerId
  useEffect(() => {
    if (selectedCustomerIdFromUrl && selectedCustomerIdFromUrl !== selectedCustomerId) {
      setSelectedCustomerId(selectedCustomerIdFromUrl)
    }
  }, [selectedCustomerIdFromUrl])

  const selectConversation = (id: string) => {
    setSelectedCustomerId(id)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('cliente', id)
      return next
    })
  }

  // Carrega lista de atendimentos agrupados por cliente
  const loadThreads = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true)
      try {
        const currentUserId = user?.id || pb.authStore.record?.id
        const filter = currentUserId ? `user_id = "${currentUserId}"` : ''

        const records = await pb.collection('conversations').getList<Conversation>(1, 500, {
          ...(filter ? { filter } : {}),
          sort: '-created',
          expand: 'customer_id',
        })

        const now = new Date().getTime()
        const dayMs = 24 * 60 * 60 * 1000

        const grouped = new Map<string, ThreadItem>()
        for (const conv of records.items) {
          if (!conv.customer_id) continue
          if (!grouped.has(conv.customer_id)) {
            const cust = conv.expand?.customer_id
            const custName = cust?.name || 'Cliente sem nome'
            const custPhone = cust?.phone || ''
            const lastContent = conv.content || ''

            // Filtro defensivo de mensagens de sistema / automação / verificação
            if (
              isAutomatedSystemThread({
                sender: conv.sender,
                customer_name: custName,
                customer_phone: custPhone,
                last_message: lastContent,
                notes: (cust as { notes?: string })?.notes,
                source: cust?.source,
              })
            ) {
              continue
            }

            const createdTime = new Date(conv.created).getTime()
            const isActive = now - createdTime <= dayMs

            grouped.set(conv.customer_id, {
              customer_id: conv.customer_id,
              customer_name: custName,
              customer_phone: custPhone,
              customer_status: cust?.status || '',
              customer_source: cust?.source || '',
              last_message: lastContent,
              last_message_time: conv.created,
              channel: conv.channel || 'whatsapp',
              sender: conv.sender,
              is_active_24h: isActive,
            })
          }
        }

        const list = Array.from(grouped.values())
        setThreads(list)

        // Se nenhum selecionado e temos itens, seleciona o primeiro por conveniência em desktop
        if (!selectedCustomerId && list.length > 0 && window.innerWidth >= 768) {
          setSelectedCustomerId(list[0].customer_id)
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('cliente', list[0].customer_id)
            return next
          })
        }
      } catch (err) {
        console.error('Erro ao carregar atendimentos:', err)
      } finally {
        setLoadingThreads(false)
        if (showRefreshing) setRefreshing(false)
      }
    },
    [user?.id, selectedCustomerId, setSearchParams],
  )

  // Carga inicial
  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // Polling fallback a cada 15 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      loadThreads()
    }, 15000)
    return () => clearInterval(timer)
  }, [loadThreads])

  // Carrega mensagens do cliente selecionado
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomer(null)
      setMessages([])
      return
    }

    let isMounted = true
    setLoadingMessages(true)

    Promise.all([
      getCustomer(selectedCustomerId).catch(() => null),
      getConversations(selectedCustomerId).catch(() => []),
    ]).then(([cust, msgs]) => {
      if (!isMounted) return
      setSelectedCustomer(cust)
      // Se for uma conversa de sistema acidentalmente acessada, ou com mensagens de sistema,
      // podemos manter o histórico ou exibir, mas caso o customer seja de sistema nós tratamos com cuidado
      setMessages(msgs)
      setLoadingMessages(false)
    })

    return () => {
      isMounted = false
    }
  }, [selectedCustomerId])

  // Auto scroll para o final das mensagens
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Realtime subscription para conversations
  useRealtime('conversations', (e) => {
    const record = e.record as unknown as Conversation
    // Atualiza a lista lateral
    loadThreads()

    // Se pertence à conversa aberta atualmente
    if (selectedCustomerId && record.customer_id === selectedCustomerId) {
      if (e.action === 'create') {
        setMessages((prev) => {
          if (prev.some((m) => m.id === record.id)) return prev
          return [...prev, record]
        })
      } else if (e.action === 'update') {
        setMessages((prev) => prev.map((m) => (m.id === record.id ? record : m)))
      } else if (e.action === 'delete') {
        setMessages((prev) => prev.filter((m) => m.id !== record.id))
      }
    }
  })

  // Realtime subscription para customers (para atualizar status/nome)
  useRealtime('customers', (e) => {
    if (selectedCustomerId && e.record.id === selectedCustomerId) {
      setSelectedCustomer(e.record as unknown as Customer)
    }
  })

  // Se o cliente atualmente selecionado for uma conversa que foi filtrada/ocultada da lista de threads,
  // ajusta a seleção para o primeiro atendimento real disponível (em desktop)
  useEffect(() => {
    if (threads.length > 0 && selectedCustomerId) {
      const existsInThreads = threads.some((t) => t.customer_id === selectedCustomerId)
      if (!existsInThreads && window.innerWidth >= 768) {
        setSelectedCustomerId(threads[0].customer_id)
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.set('cliente', threads[0].customer_id)
          return next
        })
      }
    }
  }, [threads, selectedCustomerId, setSearchParams])

  // Filtros de busca e canal
  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      // Filtro de canal
      if (channelFilter !== 'all') {
        if (thread.channel.toLowerCase() !== channelFilter) return false
      }
      // Filtro de texto (nome ou telefone)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const nameMatch = thread.customer_name.toLowerCase().includes(term)
        const phoneMatch = thread.customer_phone
          .replace(/\D/g, '')
          .includes(term.replace(/\D/g, ''))
        const messageMatch = thread.last_message.toLowerCase().includes(term)
        return nameMatch || phoneMatch || messageMatch
      }
      return true
    })
  }, [threads, channelFilter, searchTerm])

  const totalActive24h = useMemo(() => {
    return threads.filter((t) => t.is_active_24h).length
  }, [threads])

  const currentThread = useMemo(() => {
    return threads.find((t) => t.customer_id === selectedCustomerId)
  }, [threads, selectedCustomerId])

  const senderLabel = (sender: Conversation['sender']) => {
    switch (sender) {
      case 'ai':
        return user?.ai_name || 'Bia (IA)'
      case 'agent':
        return 'Corretor'
      case 'customer':
        return 'Cliente'
      case 'system':
        return 'Sistema'
      default:
        return sender
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)] max-w-7xl mx-auto -m-4 md:-m-8 p-3 md:p-6 bg-slate-50 dark:bg-slate-950">
      {/* Top Header com contadores e título */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Atendimentos da IA (Bia)
            </h1>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20 text-xs"
            >
              Tempo Real
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe o que a assistente virtual Bia e os corretores estão respondendo aos clientes
            em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Contadores */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-lg text-xs shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">{totalActive24h}</strong> ativas
              (24h)
            </span>
            <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>
            <span className="text-muted-foreground">
              Total:{' '}
              <strong className="text-slate-800 dark:text-slate-200">{threads.length}</strong>
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadThreads(true)}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
            title="Atualizar conversas"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Main Container - Split View */}
      <div className="flex flex-1 min-h-0 pt-4 gap-4 overflow-hidden">
        {/* Painel Esquerdo: Lista de Conversas */}
        <div
          className={cn(
            'flex flex-col w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden shrink-0 transition-all',
            selectedCustomerId ? 'hidden md:flex' : 'flex',
          )}
        >
          {/* Busca e Filtros */}
          <div className="p-3 border-b space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-white dark:bg-slate-800"
              />
            </div>

            {/* Abas de Canal */}
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setChannelFilter('all')}
                className={cn(
                  'flex-1 py-1 px-2 rounded-md font-medium transition-all text-center text-[11px]',
                  channelFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                )}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('whatsapp')}
                className={cn(
                  'flex-1 py-1 px-2 rounded-md font-medium transition-all text-center text-[11px]',
                  channelFilter === 'whatsapp'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                )}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('instagram')}
                className={cn(
                  'flex-1 py-1 px-2 rounded-md font-medium transition-all text-center text-[11px]',
                  channelFilter === 'instagram'
                    ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                )}
              >
                Instagram
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('messenger')}
                className={cn(
                  'flex-1 py-1 px-2 rounded-md font-medium transition-all text-center text-[11px]',
                  channelFilter === 'messenger'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                )}
              >
                Messenger
              </button>
            </div>
          </div>

          {/* Lista scrollável de threads */}
          <ScrollArea className="flex-1">
            {loadingThreads ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary opacity-60" />
                <span>Carregando conversas...</span>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Nenhuma conversa encontrada
                </p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  {searchTerm
                    ? 'Tente ajustar sua busca ou filtro de canal.'
                    : 'As conversas com a IA aparecerão aqui conforme os clientes interagirem.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredThreads.map((thread) => {
                  const isSelected = selectedCustomerId === thread.customer_id
                  return (
                    <button
                      key={thread.customer_id}
                      type="button"
                      onClick={() => selectConversation(thread.customer_id)}
                      className={cn(
                        'w-full text-left p-3 transition-colors flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 relative',
                        isSelected && 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary',
                      )}
                    >
                      <Avatar className="h-11 w-11 shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
                        <AvatarImage
                          src={`https://img.usecurling.com/ppl/thumbnail?seed=${thread.customer_id}`}
                        />
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {thread.customer_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-xs truncate text-slate-900 dark:text-slate-100">
                            {thread.customer_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                            {formatRelativeTime(thread.last_message_time)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-muted-foreground">
                          {thread.customer_phone && (
                            <span className="truncate">{formatPhone(thread.customer_phone)}</span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate line-clamp-1">
                          {thread.sender === 'ai' && (
                            <span className="font-semibold text-primary dark:text-primary-foreground">
                              Bia:{' '}
                            </span>
                          )}
                          {thread.sender === 'agent' && (
                            <span className="font-semibold text-amber-600">Corretor: </span>
                          )}
                          {thread.last_message || 'Nenhum conteúdo'}
                        </p>

                        <div className="flex items-center gap-1.5 mt-2">
                          <ChannelBadge channel={thread.channel} />
                          {thread.customer_status && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 max-w-[130px] truncate"
                              title={thread.customer_status}
                            >
                              {thread.customer_status}
                            </Badge>
                          )}
                          {thread.is_active_24h && (
                            <span
                              className="ml-auto flex h-2 w-2 rounded-full bg-emerald-500"
                              title="Mensagem nas últimas 24h"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Painel Direito: Chat do Cliente Selecionado */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden',
            !selectedCustomerId ? 'hidden md:flex' : 'flex',
          )}
        >
          {selectedCustomerId ? (
            <>
              {/* Header do Chat */}
              <div className="p-3 md:p-4 border-b bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Botão de voltar visível no mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 shrink-0 -ml-1"
                    onClick={() => {
                      setSelectedCustomerId(null)
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev)
                        next.delete('cliente')
                        return next
                      })
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  <Avatar className="h-10 w-10 border shadow-xs shrink-0">
                    <AvatarImage
                      src={`https://img.usecurling.com/ppl/thumbnail?seed=${selectedCustomerId}`}
                    />
                    <AvatarFallback className="font-semibold bg-primary/10 text-primary">
                      {selectedCustomer?.name?.slice(0, 2).toUpperCase() || 'CL'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {selectedCustomer?.name || currentThread?.customer_name || 'Carregando...'}
                      </h2>
                      {selectedCustomer?.status && (
                        <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                          {selectedCustomer.status}
                        </Badge>
                      )}
                      {/* Selo de Lançamento Ativo se lead tiver origem de lançamento */}
                      {(() => {
                        const rawSource = (
                          selectedCustomer?.source ||
                          currentThread?.customer_source ||
                          ''
                        ).toLowerCase()
                        const notes = (selectedCustomer?.notes || '').toLowerCase()
                        const fullText = `${rawSource} ${notes}`
                        if (
                          fullText.includes('villa-dos-acores') ||
                          fullText.includes('villa dos açores') ||
                          fullText.includes('villa açores') ||
                          fullText.includes('villa dos acores')
                        ) {
                          return (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 shadow-xs">
                              🏠 Villa dos Açores
                            </Badge>
                          )
                        }
                        const lpMatch = rawSource.match(/landing page [—-]?\s*([a-z0-9-]+)/i)
                        if (lpMatch && lpMatch[1]) {
                          return (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 shadow-xs">
                              🏠 Lançamento: {lpMatch[1]}
                            </Badge>
                          )
                        }
                        return null
                      })()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedCustomer?.phone
                          ? formatPhone(selectedCustomer.phone)
                          : currentThread?.customer_phone
                            ? formatPhone(currentThread.customer_phone)
                            : 'Sem telefone'}
                      </span>
                      <span>•</span>
                      <ChannelBadge channel={currentThread?.channel || 'whatsapp'} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right hidden lg:block">
                    <span className="text-[11px] text-muted-foreground block">
                      Assistente Atual
                    </span>
                    <span className="text-xs font-semibold text-primary flex items-center gap-1 justify-end">
                      <Sparkles className="h-3 w-3" />
                      {user?.ai_name || 'Bia (IA)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Área de Mensagens estilo Chat */}
              <ScrollArea className="flex-1 p-4 relative bg-[#eae6df] dark:bg-[#0b141a]">
                <div
                  className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] pointer-events-none"
                  style={{
                    backgroundImage:
                      'url("https://img.usecurling.com/p/800/600?q=texture&color=gray&dpr=1")',
                    backgroundSize: 'cover',
                  }}
                />

                <div className="space-y-3 pb-4 relative z-10 max-w-3xl mx-auto flex flex-col">
                  {loadingMessages ? (
                    <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary opacity-60" />
                      <span>Carregando histórico do atendimento...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground space-y-2">
                      <Bot className="h-12 w-12 mx-auto opacity-20" />
                      <p className="font-medium">Nenhuma mensagem registrada nesta conversa.</p>
                      <p className="text-xs">
                        Assim que o cliente ou a Bia responder, as mensagens aparecerão aqui
                        instantaneamente.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSystem = msg.sender === 'system'
                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-3">
                            <div className="bg-slate-200/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 text-[11px] font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 max-w-[85%] text-center shadow-xs border border-slate-300/40 dark:border-slate-700/50">
                              <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
                              <span className="leading-relaxed">{msg.content}</span>
                            </div>
                          </div>
                        )
                      }

                      const isCustomer = msg.sender === 'customer'
                      const isAi = msg.sender === 'ai'
                      const isAgent = msg.sender === 'agent'

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex w-full',
                            isCustomer ? 'justify-start' : 'justify-end',
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm relative space-y-1',
                              isCustomer
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60'
                                : isAi
                                  ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs border border-emerald-200/50 dark:border-emerald-800/50'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-slate-900 dark:text-slate-100 rounded-tr-xs border border-amber-200 dark:border-amber-800',
                            )}
                          >
                            {/* Header da bolha: Remetente */}
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {isAi && (
                                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                                  <Sparkles className="h-3 w-3" />
                                  <span>{user?.ai_name || 'Bia (IA)'}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 h-4 bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-none font-normal"
                                  >
                                    Automático
                                  </Badge>
                                </div>
                              )}

                              {isAgent && (
                                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                                  <User className="h-3 w-3" />
                                  <span>Corretor Humano</span>
                                </div>
                              )}

                              {isCustomer && (
                                <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                                  <span>
                                    {selectedCustomer?.name ||
                                      currentThread?.customer_name ||
                                      'Cliente'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Conteúdo da mensagem */}
                            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>

                            {/* Rodapé da bolha: Horário e status */}
                            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                              <Clock className="h-2.5 w-2.5 opacity-60" />
                              <span>{formatFullDateTime(msg.created)}</span>
                              {!isCustomer && (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 ml-0.5" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Barra inferior informativa (modo acompanhamento) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t flex items-center justify-between text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span>
                    Acompanhamento em tempo real — A Bia responde automaticamente via WhatsApp /
                    Meta API.
                  </span>
                </div>
                <div className="hidden sm:block text-[11px] text-slate-500">
                  {messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}
                </div>
              </div>
            </>
          ) : (
            /* Estado vazio quando nenhuma conversa foi selecionada */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                  Selecione um atendimento ao lado
                </h3>
                <p className="text-sm">
                  Escolha uma conversa na lista para acompanhar em detalhes o que a Bia (IA) e os
                  clientes estão conversando no WhatsApp e redes sociais.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
