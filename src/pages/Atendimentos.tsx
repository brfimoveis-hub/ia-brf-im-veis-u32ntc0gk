import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useIsMobile } from '@/hooks/use-mobile'
import { type Conversation, getConversations } from '@/services/conversations'
import { type Customer, getCustomer } from '@/services/customers'
import { cn, formatPhone } from '@/lib/utils'
import { isAutomatedSystemThread } from '@/lib/system-messages'
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
  Mic,
  Smile,
  Paperclip,
  Mail,
  Zap,
} from 'lucide-react'
import { WhatsAppAudioPlayer } from '@/components/chat/WhatsAppAudioPlayer'
import { BiaAvatar } from '@/components/common/BiaAvatar'
import { ReguaPauseControl } from '@/components/customers/ReguaPauseControl'
import { EbookResendModalControl } from '@/components/customers/EbookResendModalControl'
import { WhatsAppSendStatsModal } from '@/components/chat/WhatsAppSendStatsModal'
import { ImportPortalLeadModal } from '@/components/customers/ImportPortalLeadModal'
import {
  CadenceTrackHeader,
  normalizeCadenceStep,
  formatCadenceStepLabel,
  type CadenceStepKey,
} from '@/components/chat/CadenceTrackHeader'
import { CadenceEvolutionPanel, type CadenceStats } from '@/components/chat/CadenceEvolutionPanel'
import { CadenceStepCircle, getStepRank } from '@/components/chat/CadenceStepCircle'
import { recordCadenceStepAdvance, getTodayCadenceAdvancesCount } from '@/services/cadence_advances'
import { sendManualReply } from '@/services/conversations'
import { sendWhatsAppMessages } from '@/services/meta_whatsapp'
import { toast } from '@/hooks/use-toast'

// Item individual da lista de conversas memoizado para garantir 60fps com centenas de clientes
const ThreadListItem = memo(function ThreadListItem({
  thread,
  isSelected,
  onSelect,
}: {
  thread: ThreadItem
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(thread.customer_id)}
      className={cn(
        'w-full text-left p-3 transition-colors flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 relative',
        isSelected && 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary',
      )}
    >
      <div className="h-11 w-11 shrink-0 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center bg-primary/10 text-primary text-xs font-bold select-none">
        {thread.customer_name ? thread.customer_name.slice(0, 2).toUpperCase() : 'CL'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Bolinha Colorida com Número do Degrau na Lista (Palma da Mão) */}
            <CadenceStepCircle step={thread.follow_up_step} size="sm" />
            <span className="font-semibold text-xs truncate text-slate-900 dark:text-slate-100">
              {thread.customer_name}
            </span>
          </div>
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
            <span className="inline-flex items-center gap-1 font-semibold text-primary dark:text-primary-foreground mr-1">
              <BiaAvatar size="sm" className="inline-block w-4 h-4 align-text-bottom" />
              Bia:
            </span>
          )}
          {thread.sender === 'agent' && (
            <span className="font-semibold text-amber-600">Corretor: </span>
          )}
          {thread.last_message || 'Nenhum conteúdo'}
        </p>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <ChannelBadge channel={thread.channel} />
          {/* Badge Elevado com Bolinha + Texto Discreto */}
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 font-medium bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
          >
            <CadenceStepCircle step={thread.follow_up_step} size="sm" />
            <span>{formatCadenceStepLabel(thread.follow_up_step)}</span>
          </Badge>
          {thread.customer_status && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 max-w-[110px] truncate"
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
})

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

function formatMessageTime(dateString: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDayDivider(dateString: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'HOJE'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'ONTEM'
  }

  const daysDiff = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 7) {
    const days = [
      'DOMINGO',
      'SEGUNDA-FEIRA',
      'TERÇA-FEIRA',
      'QUARTA-FEIRA',
      'QUINTA-FEIRA',
      'SEXTA-FEIRA',
      'SÁBADO',
    ]
    return days[date.getDay()]
  }

  return date
    .toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    })
    .toUpperCase()
}

function isAudioMessage(content: string) {
  if (!content) return false
  const trimmed = content.trim()
  return (
    trimmed.startsWith('[Áudio do cliente]') ||
    trimmed.startsWith('[Audio do cliente]') ||
    trimmed.startsWith('[Áudio Recebido') ||
    trimmed.startsWith('[Audio Recebido') ||
    trimmed.startsWith('[Áudio de resposta gerado]') ||
    trimmed.startsWith('[Áudio enviado') ||
    trimmed.startsWith('[Áudio da Bia]') ||
    /\[(?:áudio|audio)[^\]]*\]/i.test(trimmed)
  )
}

function extractAudioText(content: string) {
  if (!content) return ''
  // Se estiver no formato [Áudio do cliente]: "texto..."
  const match = content.match(/\[(?:áudio|audio)[^\]]*\]:?\s*"?([^"]*)"?/i)
  if (match && match[1]) {
    return match[1].trim()
  }
  return content.replace(/\[(?:áudio|audio)[^\]]*\]/i, '').trim()
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
  follow_up_step?: string
  follow_up_count?: number
  last_follow_up_at?: string
  next_follow_up_at?: string
  persistence_status?: string
  promise_pending?: boolean
  is_blocked?: boolean
  tags?: string[]
}

// Detecção de mensagem gerada pelo cron/régua automática
function isReguaAutomatedMessage(msg: Conversation): boolean {
  if (msg.sender !== 'ai') return false
  if (msg.follow_up_step) return true
  const c = (msg.content || '').toLowerCase()
  if (
    c.includes('retomada de persistência') ||
    c.includes('guardei o vistage residence') ||
    c.includes('oportunidade que poucos ainda viram') ||
    c.includes('separei o vistage residence') ||
    c.includes('pensando em você, guardei') ||
    c.includes('pensando em você, separei') ||
    c.includes('conforme combinamos, estou passando') ||
    c.includes('tomei a liberdade de te apresentar esta novidade')
  ) {
    return true
  }
  return false
}

export default function Atendimentos() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0)
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
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [channelFilter, setChannelFilter] = useState<
    'all' | 'whatsapp' | 'instagram' | 'messenger'
  >('all')
  const [cadenceFilter, setCadenceFilter] = useState<CadenceStepKey>('all')
  // Paginação / Limite de renderização rápida da lista para manter 60fps no DOM
  const [visibleCount, setVisibleCount] = useState<number>(50)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Ajuste fino do rodapé apenas para deslocamento de teclado via visualViewport (sem alterar top/height do container)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateKeyboardOffset = () => {
      if (window.visualViewport) {
        const diff = Math.max(0, Math.round(window.innerHeight - window.visualViewport.height))
        setKeyboardOffset(diff)
      } else {
        setKeyboardOffset(0)
      }
    }
    updateKeyboardOffset()

    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', updateKeyboardOffset)
      vv.addEventListener('scroll', updateKeyboardOffset)
      return () => {
        vv.removeEventListener('resize', updateKeyboardOffset)
        vv.removeEventListener('scroll', updateKeyboardOffset)
      }
    }
  }, [])

  // Sincroniza query param com selectedCustomerId
  useEffect(() => {
    if (selectedCustomerIdFromUrl && selectedCustomerIdFromUrl !== selectedCustomerId) {
      setSelectedCustomerId(selectedCustomerIdFromUrl)
    }
  }, [selectedCustomerIdFromUrl, selectedCustomerId])

  const selectConversation = useCallback(
    (id: string) => {
      setSelectedCustomerId(id)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('cliente', id)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // Ref para guardar se já temos alguma seleção inicial feita
  const hasInitializedSelectionRef = useRef(false)
  const isFetchingThreadsRef = useRef(false)
  const debounceThreadsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carrega lista de atendimentos agrupados por cliente
  const loadThreads = useCallback(
    async (showRefreshing = false) => {
      if (isFetchingThreadsRef.current) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      isFetchingThreadsRef.current = true
      if (showRefreshing) setRefreshing(true)
      try {
        const currentUserId = user?.id || pb.authStore.record?.id
        const filter = currentUserId ? `user_id = "${currentUserId}"` : ''

        // Busca lista de conversas mais recentes para agrupar threads (janela otimizada de 300)
        const records = await pb.collection('conversations').getList<Conversation>(1, 300, {
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
              follow_up_step: cust?.follow_up_step || '',
              follow_up_count: cust?.follow_up_count ?? 0,
              last_follow_up_at: cust?.last_follow_up_at || '',
              next_follow_up_at: cust?.next_follow_up_at || '',
              persistence_status: cust?.persistence_status || '',
              promise_pending: cust?.promise_pending || false,
              is_blocked: cust?.is_blocked || false,
              tags: cust?.tags || [],
            })
          }
        }

        const list = Array.from(grouped.values())
        setThreads(list)

        // Se nenhum selecionado e temos itens, seleciona o primeiro por conveniência em desktop apenas 1x
        if (
          !hasInitializedSelectionRef.current &&
          !selectedCustomerIdFromUrl &&
          list.length > 0 &&
          typeof window !== 'undefined' &&
          window.innerWidth >= 768
        ) {
          hasInitializedSelectionRef.current = true
          setSelectedCustomerId(list[0].customer_id)
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.set('cliente', list[0].customer_id)
              return next
            },
            { replace: true },
          )
        }
      } catch (err) {
        console.error('Erro ao carregar atendimentos:', err)
      } finally {
        isFetchingThreadsRef.current = false
        setLoadingThreads(false)
        if (showRefreshing) setRefreshing(false)
      }
    },
    [user?.id, selectedCustomerIdFromUrl, setSearchParams],
  )

  // Versão com debounce inteligente para evitar storm quando eventos realtime chegam em rajadas
  const scheduleLoadThreads = useCallback(
    (delayMs = 2500) => {
      if (debounceThreadsTimerRef.current) {
        clearTimeout(debounceThreadsTimerRef.current)
      }
      debounceThreadsTimerRef.current = setTimeout(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
        loadThreads()
      }, delayMs)
    },
    [loadThreads],
  )

  // Carga inicial (executada apenas uma vez ao montar)
  useEffect(() => {
    loadThreads()
    return () => {
      if (debounceThreadsTimerRef.current) clearTimeout(debounceThreadsTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polling fallback suave a cada 90 segundos (apenas se aba estiver visível e não estiver buscando)
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      if (isFetchingThreadsRef.current) return
      loadThreads()
    }, 90000)
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

  // Container de mensagens scrollável para controle de rolagem direto e confiável
  const messagesScrollContainerRef = useRef<HTMLDivElement>(null)
  const isFirstMessagesRenderRef = useRef(true)

  const scrollChatToBottom = useCallback((instant = false) => {
    // 1. Prioriza rolar o container de scroll diretamente para o topo máximo (scrollTop = scrollHeight)
    const container = messagesScrollContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
      if (!instant) {
        try {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
        } catch {
          container.scrollTop = container.scrollHeight
        }
      }
    }

    // 2. Fallback complementar no elemento sentinela
    const el = messagesEndRef.current
    if (el) {
      try {
        el.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'end' })
      } catch {
        // Fallback defensivo
      }
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      const isFirst = isFirstMessagesRenderRef.current
      isFirstMessagesRenderRef.current = false

      // Chamada direta para rolagem imediata
      const container = messagesScrollContainerRef.current
      if (container) {
        container.scrollTop = container.scrollHeight
      }

      // Em requestAnimationFrame
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight
        }
        scrollChatToBottom(isFirst)
      })

      // Reforço em 60ms, 150ms e 350ms para aguardar renderização de bolhas e avatares
      const t1 = setTimeout(() => scrollChatToBottom(isFirst), 60)
      const t2 = setTimeout(() => scrollChatToBottom(isFirst), 150)
      const t3 = setTimeout(() => scrollChatToBottom(isFirst), 350)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }
  }, [messages, scrollChatToBottom])

  // Reseta flag quando troca de cliente e rola ao final imediatamente
  useEffect(() => {
    isFirstMessagesRenderRef.current = true
  }, [selectedCustomerId])

  // Realtime subscription para conversations
  useRealtime('conversations', (e) => {
    const record = e.record as unknown as Conversation

    // 1. Se pertence à conversa aberta atualmente, atualiza na hora sem esperar!
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

    // 2. Atualiza a lista de threads pontualmente em memória para o cliente afetado,
    // evitando re-fetch completo e pesado da coleção inteira a cada mensagem individual
    if (record.customer_id && e.action === 'create') {
      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.customer_id === record.customer_id)
        if (idx !== -1) {
          const current = prev[idx]
          const updated: ThreadItem = {
            ...current,
            last_message: record.content || current.last_message,
            last_message_time: record.created || new Date().toISOString(),
            sender: record.sender,
            channel: record.channel || current.channel,
            is_active_24h: true,
          }
          // Move para o topo da lista de conversas
          const next = [...prev]
          next.splice(idx, 1)
          next.unshift(updated)
          return next
        }
        return prev
      })
      // Agenda sincronização completa em background com debounce
      scheduleLoadThreads(3000)
    } else {
      scheduleLoadThreads(2000)
    }
  })

  // Se o cliente atualmente selecionado for uma conversa que foi filtrada/ocultada da lista de threads,
  // ajusta a seleção para o primeiro atendimento real disponível (em desktop)
  useEffect(() => {
    if (threads.length > 0 && selectedCustomerId && !loadingThreads) {
      const existsInThreads = threads.some((t) => t.customer_id === selectedCustomerId)
      if (!existsInThreads && typeof window !== 'undefined' && window.innerWidth >= 768) {
        setSelectedCustomerId(threads[0].customer_id)
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set('cliente', threads[0].customer_id)
            return next
          },
          { replace: true },
        )
      }
    }
  }, [threads, selectedCustomerId, loadingThreads, setSearchParams])

  // Cache em memória para rastrear follow_up_step anterior de cada cliente e detectar avanços
  const previousStepsRef = useRef<Map<string, string>>(new Map())
  const isInitialLoadRef = useRef(true)
  const hasInitializedStepsRef = useRef(false)
  const lastToastTimeRef = useRef<number>(0)
  const advancesTodayCountRef = useRef<number>(0)
  const [advancesToday, setAdvancesToday] = useState<number>(0)

  // Carrega contagem inicial de avanços hoje
  useEffect(() => {
    let mounted = true
    getTodayCadenceAdvancesCount()
      .then((count) => {
        if (mounted) {
          advancesTodayCountRef.current = count
          setAdvancesToday(count)
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  // Atualiza cache de degraus após loadThreads (só popula novos sem disparar loop)
  useEffect(() => {
    if (threads.length > 0 && !hasInitializedStepsRef.current) {
      hasInitializedStepsRef.current = true
      for (const t of threads) {
        if (t.customer_id) {
          previousStepsRef.current.set(t.customer_id, t.follow_up_step || '')
        }
      }
      // Após popular threads na carga inicial, destrava detecção de eventos futuros
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 1500)
    }
  }, [threads])

  // Realtime subscription para customers (para atualizar status, nome, degrau e régua)
  useRealtime('customers', (e) => {
    const custRecord = e.record as unknown as Customer
    const custId = custRecord.id
    const newStep = custRecord.follow_up_step || ''

    if (e.action === 'update' && custId && !isInitialLoadRef.current) {
      const prevStep = previousStepsRef.current.get(custId) || ''
      const prevRank = getStepRank(prevStep)
      const newRank = getStepRank(newStep)

      // Só dispara se houve avanço genuíno de degrau (novo rank estritamente maior que anterior)
      // e o degrau anterior já era conhecido
      if (prevStep && newStep && prevRank > 0 && newRank > prevRank) {
        const custName = custRecord.name || 'Cliente'
        const newStepLabel = formatCadenceStepLabel(newStep)

        // Atualiza contadores de avanços hoje
        setAdvancesToday((prev) => prev + 1)

        // Registra evento idempotente no backend (system_logs)
        recordCadenceStepAdvance({
          customer_id: custId,
          customer_name: custName,
          customer_phone: custRecord.phone,
          previous_step: prevStep,
          new_step: newStep,
          previous_rank: prevRank,
          new_rank: newRank,
        })

        // Notificação estilo toast leve / WhatsApp Web com anti-burst (respeita 1.5s entre avisos)
        const now = Date.now()
        if (now - lastToastTimeRef.current >= 1500) {
          lastToastTimeRef.current = now
          toast({
            title: '🚀 Avanço na Cadência',
            description: `${custName} avançou para o ${newStepLabel}`,
            duration: 4000,
          })
        }
      }

      // Atualiza referência para a próxima transição
      previousStepsRef.current.set(custId, newStep)
    } else if (custId && newStep) {
      previousStepsRef.current.set(custId, newStep)
    }

    // Atualiza pontualmente a conversa aberta em memória
    if (selectedCustomerId && custId === selectedCustomerId) {
      setSelectedCustomer(custRecord)
    }

    // Atualiza pontualmente o item na lista de threads em memória
    if (custId) {
      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.customer_id === custId)
        if (idx !== -1) {
          const current = prev[idx]
          const updated: ThreadItem = {
            ...current,
            customer_name: custRecord.name || current.customer_name,
            customer_phone: custRecord.phone || current.customer_phone,
            customer_status: custRecord.status || current.customer_status,
            customer_source: custRecord.source || current.customer_source,
            follow_up_step: custRecord.follow_up_step || current.follow_up_step,
            follow_up_count: custRecord.follow_up_count ?? current.follow_up_count,
            last_follow_up_at: custRecord.last_follow_up_at || current.last_follow_up_at,
            next_follow_up_at: custRecord.next_follow_up_at || current.next_follow_up_at,
            persistence_status: custRecord.persistence_status || current.persistence_status,
            promise_pending: custRecord.promise_pending ?? current.promise_pending,
            is_blocked: custRecord.is_blocked ?? current.is_blocked,
            tags: custRecord.tags || current.tags,
          }
          const next = [...prev]
          next[idx] = updated
          return next
        }
        return prev
      })
    }

    // Debounce na sincronização pesada do banco
    scheduleLoadThreads(2500)
  })

  // Métricas e contadores de evolução da régua de cadência
  const cadenceStats: CadenceStats = useMemo(() => {
    const today = new Date().toDateString()
    let active = 0
    let paused = 0
    let repliedToday = 0
    let sentToday = 0

    const byStep = {
      remarketing: 0,
      d1: 0,
      d3: 0,
      d7: 0,
      d14: 0,
      nurturing_monthly: 0,
      finalizado: 0,
    }

    for (const t of threads) {
      const stepKey = normalizeCadenceStep(t.follow_up_step) as keyof typeof byStep
      if (byStep[stepKey] !== undefined) {
        byStep[stepKey]++
      } else {
        byStep.d1++
      }

      const tagsStr = Array.isArray(t.tags) ? t.tags.join(' ').toLowerCase() : ''
      const isPaused =
        tagsStr.includes('ai_paused') || t.persistence_status === 'pausado' || t.is_blocked === true

      if (isPaused) {
        paused++
      } else {
        active++
      }

      // Interações de hoje
      const msgDate = t.last_message_time ? new Date(t.last_message_time).toDateString() : ''
      if (msgDate === today) {
        if (t.sender === 'customer') {
          repliedToday++
        }
        if (t.sender === 'ai') {
          sentToday++
        }
      }
    }

    return {
      total: threads.length,
      activeCount: active,
      pausedCount: paused,
      repliedTodayCount: repliedToday,
      sentTodayCount: sentToday,
      advancesTodayCount: advancesToday,
      byStep,
    }
  }, [threads, advancesToday])

  // Filtros de busca, canal e degrau de cadência
  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      // Filtro de canal
      if (channelFilter !== 'all') {
        if (thread.channel.toLowerCase() !== channelFilter) return false
      }

      // Filtro por degrau de cadência
      if (cadenceFilter !== 'all') {
        const norm = normalizeCadenceStep(thread.follow_up_step)
        if (norm !== cadenceFilter) return false
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
  }, [threads, channelFilter, cadenceFilter, searchTerm])

  // Threads atualmente visíveis na viewport (janela de 50 + "carregar mais")
  const displayedThreads = useMemo(() => {
    return filteredThreads.slice(0, visibleCount)
  }, [filteredThreads, visibleCount])

  // Reseta contagem visível ao mudar termo de busca ou filtro
  useEffect(() => {
    setVisibleCount(50)
  }, [searchTerm, channelFilter, cadenceFilter])

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

  // Agrupamento de mensagens por dia para divisores "HOJE", "ONTEM", "DATA"
  const groupedMessages = useMemo(() => {
    const groups: { dateKey: string; dividerLabel: string; items: Conversation[] }[] = []
    let currentKey = ''

    for (const msg of messages) {
      const d = msg.created ? new Date(msg.created) : new Date()
      const key = !Number.isNaN(d.getTime()) ? d.toDateString() : 'unknown'
      if (key !== currentKey) {
        currentKey = key
        groups.push({
          dateKey: key,
          dividerLabel: formatDayDivider(msg.created),
          items: [msg],
        })
      } else {
        groups[groups.length - 1].items.push(msg)
      }
    }
    return groups
  }, [messages])

  // Envio de mensagem manual pelo corretor/gestor pelo rodapé estilo WhatsApp
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!replyText.trim() || !selectedCustomerId || sendingReply) return

    const textToSend = replyText.trim()
    const targetPhone = selectedCustomer?.phone || currentThread?.customer_phone || ''
    const targetName = selectedCustomer?.name || currentThread?.customer_name || 'Cliente'
    const currentChannel = currentThread?.channel || 'whatsapp'

    setSendingReply(true)
    try {
      // 1. Salva no banco local
      const saved = await sendManualReply(selectedCustomerId, textToSend, currentChannel)
      setMessages((prev) => [...prev, saved])
      setReplyText('')

      // 2. Despacha via API oficial de acordo com o canal
      if (currentChannel === 'whatsapp' && targetPhone) {
        try {
          await sendWhatsAppMessages([{ phone: targetPhone, name: targetName }], textToSend)
          toast({
            title: 'Mensagem enviada',
            description: 'Mensagem entregue com sucesso via WhatsApp.',
          })
        } catch (apiErr: any) {
          console.warn('Falha no envio direto pela Meta API (gravado no CRM):', apiErr)
          toast({
            title: 'Gravada no CRM',
            description: 'Mensagem salva no histórico do atendimento.',
          })
        }
      } else if (currentChannel === 'instagram') {
        toast({
          title: 'Mensagem gravada no CRM',
          description:
            'Resposta do corretor gravada. No Instagram, mensagens automáticas da Bia respondem na janela de 24h da Meta.',
        })
      } else {
        toast({
          title: 'Mensagem registrada',
          description: 'Resposta do corretor gravada com sucesso.',
        })
      }
    } catch (err: any) {
      console.error('Erro ao enviar mensagem manual:', err)
      toast({
        title: 'Erro ao enviar',
        description: err?.message || 'Não foi possível registrar a mensagem.',
        variant: 'destructive',
      })
    } finally {
      setSendingReply(false)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col max-w-7xl mx-auto bg-slate-50 dark:bg-slate-950 w-full',
        // No celular com conversa aberta: o chat passa a ser renderizado em overlay fixed de tela cheia (estilo WhatsApp Web mobile),
        // eliminando de raiz qualquer conflito com os containers pais (Layout, main, scrollbars).
        // No celular sem conversa aberta: lista de conversas com scroll normal.
        // No desktop: mantém h-[calc(100vh-5rem)] com margins e paddings idênticos à bancada atual.
        selectedCustomerId
          ? 'h-full md:h-[calc(100vh-5rem)] m-0 md:-m-8 p-3 md:p-6 overflow-hidden'
          : 'h-full min-h-[calc(100dvh-4rem)] md:h-[calc(100vh-5rem)] m-0 md:-m-8 p-3 md:p-6 overflow-hidden md:overflow-y-auto',
      )}
    >
      {/* Top Header com contadores e título - no celular só renderiza quando nenhuma conversa está aberta para liberar altura total ao chat */}
      <div
        className={cn(
          'flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b shrink-0',
          selectedCustomerId ? 'hidden md:flex' : 'flex',
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BiaAvatar size="md" />
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

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          {/* Botão de Importação Rápida de Lead de Portais Externos */}
          <ImportPortalLeadModal
            onSuccess={(newCustId) => {
              loadThreads(true)
              if (newCustId) {
                selectConversation(newCustId)
              }
            }}
          />

          {/* Raio-X de Envios & Retorno dos últimos 7 dias (Visibilidade solicitada por Mauro) */}
          <WhatsAppSendStatsModal />

          {/* Controle Manual URGENTE de Parar/Retomar Régua (visível tanto no desktop quanto no mobile) */}
          <ReguaPauseControl />

          {/* Controle de Reenvio Dirigido de E-book (Modo Contínuo intocado) */}
          <EbookResendModalControl />

          {/* Contadores */}
          <div className="hidden lg:flex items-center gap-1.5 bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-lg text-xs shadow-sm">
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

      {/* PAINEL DE EVOLUÇÃO DA CADÊNCIA: Contadores de Relance e Filtro de Degrau (oculto no mobile quando conversa aberta) */}
      <div className={cn('pt-3 shrink-0', selectedCustomerId ? 'hidden md:block' : 'block')}>
        <CadenceEvolutionPanel
          stats={cadenceStats}
          selectedStep={cadenceFilter}
          onSelectStep={setCadenceFilter}
        />
      </div>

      {/* Main Container - Split View */}
      <div
        className={cn(
          'flex flex-1 min-h-0 overflow-hidden',
          selectedCustomerId ? 'pt-0 md:pt-3 gap-0 md:gap-4' : 'pt-3 gap-4',
        )}
      >
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
                {displayedThreads.map((thread) => (
                  <ThreadListItem
                    key={thread.customer_id}
                    thread={thread}
                    isSelected={selectedCustomerId === thread.customer_id}
                    onSelect={selectConversation}
                  />
                ))}

                {/* Botão de carregar mais se houver mais de visibleCount itens */}
                {filteredThreads.length > visibleCount && (
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleCount((prev) => prev + 50)}
                      className="w-full text-xs h-8 border-slate-300 dark:border-slate-700 font-medium"
                    >
                      Carregar mais ({filteredThreads.length - visibleCount} restantes)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Painel Direito: Chat do Cliente Selecionado
            No mobile: overlay fixo em tela cheia determinístico (fixed inset-0 z-[100] h-[100dvh] w-[100vw] flex flex-col bg-white overflow-hidden).
            No desktop: painel flex-1 padrão ao lado da lista, sem overlay, preservado pixel a pixel.
        */}
        <div
          className={cn(
            'flex flex-col bg-white dark:bg-slate-900 overflow-hidden',
            selectedCustomerId
              ? 'fixed inset-0 z-[100] h-[100dvh] w-[100vw] md:static md:inset-auto md:z-auto md:w-auto md:flex-1 md:rounded-xl md:border md:shadow-sm md:h-full md:min-h-0 flex'
              : 'hidden md:flex md:flex-1 md:rounded-xl md:border md:shadow-sm md:h-full md:min-h-0',
          )}
        >
          {selectedCustomerId ? (
            <>
              {/* a) Cabeçalho (flex-shrink:0): botão voltar + nome do cliente + selo de versão v0.0.1324 */}
              <div className="p-2 sm:p-3 md:p-4 border-b bg-white dark:bg-slate-900 flex items-center justify-between gap-2 sm:gap-3 shrink-0 flex-shrink-0 z-10">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Botão de voltar visível no mobile com destaque amigável estilo WhatsApp */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-9 w-9 shrink-0 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Voltar para a lista de conversas"
                    onClick={() => {
                      setSelectedCustomerId(null)
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev)
                        next.delete('cliente')
                        return next
                      })
                    }}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  {/* Indicador do selo de versão oficial no header do chat mobile */}
                  <span
                    className="md:hidden text-[9px] font-mono font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0"
                    title="Versão do Build"
                  >
                    v0.0.1324
                  </span>

                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border shadow-xs shrink-0">
                    <AvatarImage
                      src={`https://img.usecurling.com/ppl/thumbnail?seed=${selectedCustomerId}`}
                    />
                    <AvatarFallback className="font-semibold bg-primary/10 text-primary text-xs sm:text-sm">
                      {selectedCustomer?.name?.slice(0, 2).toUpperCase() || 'CL'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
                        {selectedCustomer?.name || currentThread?.customer_name || 'Carregando...'}
                      </h2>
                      {/* Bolinha do Degrau no Topo ao lado do Nome */}
                      <CadenceStepCircle
                        step={selectedCustomer?.follow_up_step || currentThread?.follow_up_step}
                        size="sm"
                        showText
                      />
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
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedCustomer?.phone
                          ? formatPhone(selectedCustomer.phone)
                          : currentThread?.customer_phone
                            ? formatPhone(currentThread.customer_phone)
                            : 'Sem telefone'}
                      </span>
                      {selectedCustomer?.email && (
                        <>
                          <span>•</span>
                          <span
                            className="hidden xs:flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40"
                            title="E-mail capturado pela Bia no atendimento"
                          >
                            <Mail className="h-3 w-3" />
                            {selectedCustomer.email}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <ChannelBadge channel={currentThread?.channel || 'whatsapp'} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-800/60 border rounded-lg px-2 sm:px-2.5 py-1">
                    <BiaAvatar size="sm" showStatusIndicator />
                    <div className="text-left hidden sm:block">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium tracking-wide">
                        Assistente Virtual
                      </span>
                      <span className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {user?.ai_name || 'Bia (IA)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* TRILHA DE CADÊNCIA DENTRO DA CONVERSA (Mobile-First no Topo do Chat) */}
              <div className="shrink-0 flex-shrink-0">
                <CadenceTrackHeader
                  customer={selectedCustomer}
                  fallbackCustomerName={currentThread?.customer_name}
                />
              </div>

              {/* b) Lista de mensagens (flex:1 1 0, minHeight:0, overflowY:auto): histórico completo */}
              <div
                ref={messagesScrollContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 relative bg-[#efeae2] dark:bg-[#0b141a] overscroll-contain"
                style={{
                  flex: '1 1 0%',
                  backgroundImage: 'radial-gradient(#d1c7b7 0.75px, transparent 0.75px)',
                  backgroundSize: '16px 16px',
                }}
              >
                <div className="space-y-3 pb-2 relative z-10 max-w-3xl mx-auto flex flex-col">
                  {loadingMessages ? (
                    <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 opacity-60" />
                      <span>Carregando histórico do atendimento...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground space-y-2">
                      <Bot className="h-12 w-12 mx-auto text-emerald-600/40" />
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        Nenhuma mensagem registrada nesta conversa.
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Assim que o cliente ou a Bia responder, as mensagens aparecerão aqui
                        instantaneamente em tempo real.
                      </p>
                    </div>
                  ) : (
                    groupedMessages.map((group) => (
                      <div key={group.dateKey} className="space-y-2.5">
                        {/* Divisor de Data estilo WhatsApp ("HOJE", "ONTEM", "DATA") */}
                        <div className="flex justify-center my-2 sticky top-1 z-10">
                          <span className="bg-white/90 dark:bg-[#182229]/95 text-[#54656f] dark:text-[#8696a0] text-[11px] font-semibold uppercase px-3 py-1 rounded-lg shadow-xs border border-black/5 dark:border-white/5 backdrop-blur-xs">
                            {group.dividerLabel}
                          </span>
                        </div>

                        {group.items.map((msg) => {
                          const isSystem = msg.sender === 'system'
                          if (isSystem) {
                            return (
                              <div key={msg.id} className="flex justify-center my-2">
                                <div className="bg-[#ffeecd] dark:bg-[#1f2c34] text-[#54656f] dark:text-[#aebac1] text-[11px] font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 max-w-[90%] text-center shadow-xs border border-[#ffdf9e]/60 dark:border-transparent">
                                  <Sparkles className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                  <span className="leading-relaxed">{msg.content}</span>
                                </div>
                              </div>
                            )
                          }

                          const isCustomer = msg.sender === 'customer'
                          const isAi = msg.sender === 'ai'
                          const isAgent = msg.sender === 'agent'
                          const isAudio = isAudioMessage(msg.content)
                          const audioTranscription = isAudio ? extractAudioText(msg.content) : ''

                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                'flex w-full group',
                                isCustomer ? 'justify-start' : 'justify-end',
                              )}
                            >
                              <div
                                className={cn(
                                  'max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 shadow-xs relative text-slate-900 dark:text-slate-100',
                                  // Bolha estilo WhatsApp com "tail" sutil
                                  isCustomer
                                    ? 'bg-white dark:bg-[#202c33] rounded-tl-xs border border-black/5 dark:border-white/5'
                                    : isAi
                                      ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-xs border border-emerald-600/10 dark:border-transparent'
                                      : 'bg-[#e2f7cb] dark:bg-[#025144] rounded-tr-xs border border-emerald-600/15 dark:border-transparent',
                                )}
                              >
                                {/* Header da bolha: Remetente */}
                                <div className="flex items-center gap-1.5 text-[11px] mb-1">
                                  {isAi && (
                                    <div className="flex items-center gap-1.5 font-bold text-[#008069] dark:text-[#25d366]">
                                      <BiaAvatar size="sm" className="w-4 h-4" />
                                      <span>{user?.ai_name || 'Bia (IA)'}</span>
                                      {isReguaAutomatedMessage(msg) ? (
                                        <span className="text-[9.5px] font-semibold px-1.5 py-0 rounded bg-indigo-500/15 dark:bg-indigo-400/25 text-indigo-700 dark:text-indigo-200 border border-indigo-400/30 flex items-center gap-1 shadow-2xs">
                                          <Zap className="h-2.5 w-2.5 text-indigo-500" />
                                          <span>Régua · automático</span>
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-normal px-1 py-0 rounded bg-emerald-700/10 dark:bg-emerald-300/20 text-emerald-800 dark:text-emerald-200">
                                          Automático
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {isAgent && (
                                    <div className="flex items-center gap-1.5 font-bold text-[#006653] dark:text-[#53bdeb]">
                                      <User className="h-3 w-3" />
                                      <span>Corretor Humano</span>
                                    </div>
                                  )}

                                  {isCustomer && (
                                    <div className="flex items-center gap-1 font-semibold text-[#54656f] dark:text-[#aebac1]">
                                      <span>
                                        {selectedCustomer?.name ||
                                          currentThread?.customer_name ||
                                          'Cliente'}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Renderização especial de Áudio com WhatsAppAudioPlayer */}
                                {isAudio ? (
                                  <div className="space-y-1.5 my-1">
                                    <WhatsAppAudioPlayer
                                      sender={isCustomer ? 'customer' : isAi ? 'ai' : 'agent'}
                                      text={audioTranscription || msg.content}
                                    />
                                    {audioTranscription && (
                                      <div className="text-[12px] italic text-[#54656f] dark:text-[#8696a0] bg-black/5 dark:bg-black/20 rounded p-1.5 leading-snug">
                                        <span className="font-medium not-italic text-[10px] uppercase tracking-wider block text-muted-foreground mb-0.5">
                                          Transcrição
                                        </span>
                                        "{audioTranscription}"
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Conteúdo de Texto Padrão */
                                  <p className="text-[13.5px] sm:text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                                    {msg.content}
                                  </p>
                                )}

                                {/* Rodapé da bolha: Horário e duplo check estilo WhatsApp */}
                                <div className="flex items-center justify-end gap-1 text-[10.5px] text-[#667781] dark:text-[#8696a0] pt-1">
                                  <span>{formatMessageTime(msg.created)}</span>
                                  {!isCustomer && (
                                    <span
                                      className="inline-flex text-[#53bdeb] ml-0.5 font-bold text-xs"
                                      title={
                                        (msg.channel || currentThread?.channel) === 'instagram'
                                          ? 'Entregue via Instagram Direct'
                                          : 'Entregue via WhatsApp'
                                      }
                                    >
                                      ✓✓
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              {/* c) Rodapé (flex-shrink:0): nota "A Bia está ativa..." + textarea/input "Mensagem para o cliente" + botão enviar; padding-bottom: env(safe-area-inset-bottom) */}
              <div
                className="p-2 sm:p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800 shrink-0 flex-shrink-0 z-20 flex flex-col gap-1.5"
                style={{
                  paddingBottom:
                    isMobile && keyboardOffset > 0
                      ? `${keyboardOffset}px`
                      : 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
                }}
              >
                {/* Nota da Bia */}
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#667781] dark:text-[#8696a0] px-1 sm:px-2">
                  <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                    <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="truncate">
                      A Bia está ativa respondendo automaticamente. Você pode intervir a qualquer
                      momento.
                    </span>
                  </div>
                  <div className="hidden sm:block shrink-0 ml-2">
                    {messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}
                  </div>
                </div>

                {/* Form de envio com input e botão */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-1.5 sm:gap-2 max-w-4xl mx-auto w-full"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-[#54656f] dark:text-[#aebac1] hover:bg-slate-200/60 dark:hover:bg-slate-700/50 shrink-0"
                    title="Em breve: anexos"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>

                  <div className="flex-1 relative">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Mensagem para o cliente (responda como corretor)..."
                      disabled={sendingReply}
                      className="bg-white dark:bg-[#2a3942] border-none shadow-xs rounded-2xl h-10 text-xs sm:text-sm px-3 sm:px-4 focus-visible:ring-1 focus-visible:ring-emerald-600"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!replyText.trim() || sendingReply}
                    className="h-10 w-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white shrink-0 shadow-sm disabled:opacity-40"
                    title="Enviar mensagem"
                  >
                    {sendingReply ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>
                </form>
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
