import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Users,
  Activity,
  MessageSquare,
  Percent,
  ChevronLeft,
  Send,
  Bot,
  User,
  HeadphonesIcon,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

type Metrics = {
  totalCustomers: number
  customersGrowth: number
  activeCadences: number
  cadencesGrowth: number
  aiConversations: number
  aiConversationsGrowth: number
  conversionRate: number
  conversionGrowth: number
}

type Customer = {
  id: string
  name: string
  phone: string
  status: string
}

type Conversation = {
  id: string
  customer_id: string
  content: string
  sender: 'customer' | 'agent' | 'ai' | 'system'
  created: string
  expand?: {
    customer_id?: Customer
  }
}

export default function Index() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalCustomers: 0,
    customersGrowth: 0,
    activeCadences: 0,
    cadencesGrowth: 0,
    aiConversations: 0,
    aiConversationsGrowth: 0,
    conversionRate: 0,
    conversionGrowth: 0,
  })

  const [recentChats, setRecentChats] = useState<Conversation[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [chatHistory, setChatHistory] = useState<Conversation[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [mobileTab, setMobileTab] = useState<'dashboard' | 'chat'>('dashboard')

  const fetchMetrics = async () => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .replace('T', ' ')

      const [custAll, custPrev, cadAll, cadPrev, convAll, convPrev, closedAll, closedPrev] =
        await Promise.all([
          pb.collection('customers').getList(1, 1),
          pb.collection('customers').getList(1, 1, { filter: `created < "${startOfMonth}"` }),
          pb.collection('cadences').getList(1, 1, { filter: 'is_active = true' }),
          pb
            .collection('cadences')
            .getList(1, 1, { filter: `is_active = true && created < "${startOfMonth}"` }),
          pb.collection('conversations').getList(1, 1, { filter: 'sender = "ai"' }),
          pb
            .collection('conversations')
            .getList(1, 1, { filter: `sender = "ai" && created < "${startOfMonth}"` }),
          pb
            .collection('customers')
            .getList(1, 1, { filter: 'status = "closed" || status = "Fechamento"' }),
          pb
            .collection('customers')
            .getList(1, 1, {
              filter: `(status = "closed" || status = "Fechamento") && created < "${startOfMonth}"`,
            }),
        ])

      const calcGrowth = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? 100 : 0
        return Math.round(((current - prev) / prev) * 100)
      }

      const currentConvRate =
        custAll.totalItems > 0 ? (closedAll.totalItems / custAll.totalItems) * 100 : 0
      const prevConvRate =
        custPrev.totalItems > 0 ? (closedPrev.totalItems / custPrev.totalItems) * 100 : 0
      const convGrowth = currentConvRate - prevConvRate

      setMetrics({
        totalCustomers: custAll.totalItems,
        customersGrowth: calcGrowth(custAll.totalItems, custPrev.totalItems),
        activeCadences: cadAll.totalItems,
        cadencesGrowth: calcGrowth(cadAll.totalItems, cadPrev.totalItems),
        aiConversations: convAll.totalItems,
        aiConversationsGrowth: calcGrowth(convAll.totalItems, convPrev.totalItems),
        conversionRate: currentConvRate,
        conversionGrowth: convGrowth,
      })
    } catch (err) {
      console.error(err)
    }
  }

  const fetchRecentChats = async () => {
    try {
      const result = await pb.collection('conversations').getList<Conversation>(1, 200, {
        sort: '-created',
        expand: 'customer_id',
      })

      const map = new Map<string, Conversation>()
      result.items.forEach((item) => {
        if (!map.has(item.customer_id) && item.expand?.customer_id) {
          map.set(item.customer_id, item)
        }
      })

      setRecentChats(Array.from(map.values()))
    } catch (err) {
      console.error(err)
    }
  }

  const fetchChatHistory = async (customerId: string) => {
    try {
      const result = await pb.collection('conversations').getFullList<Conversation>({
        filter: `customer_id = "${customerId}"`,
        sort: 'created',
      })
      setChatHistory(result)
      scrollToBottom()
    } catch (err) {
      console.error(err)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      const viewports = document.querySelectorAll(
        '.chat-scroll-viewport [data-radix-scroll-area-viewport]',
      )
      viewports.forEach((viewport) => {
        viewport.scrollTop = viewport.scrollHeight
      })
    }, 100)
  }

  useEffect(() => {
    Promise.all([fetchMetrics(), fetchRecentChats()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      fetchChatHistory(selectedCustomer.id)
    } else {
      setChatHistory([])
    }
  }, [selectedCustomer])

  useRealtime('conversations', (e) => {
    fetchMetrics()
    fetchRecentChats()
    if (
      e.action === 'create' &&
      selectedCustomer &&
      (e.record as unknown as Conversation).customer_id === selectedCustomer.id
    ) {
      setChatHistory((prev) => [...prev, e.record as unknown as Conversation])
      scrollToBottom()
    }
  })

  useRealtime('customers', () => {
    fetchMetrics()
    fetchRecentChats()
  })

  useRealtime('cadences', () => {
    fetchMetrics()
  })

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedCustomer) return

    try {
      await pb.collection('conversations').create({
        customer_id: selectedCustomer.id,
        content: newMessage,
        sender: 'agent',
      })
      setNewMessage('')
    } catch (error) {
      console.error(error)
    }
  }

  const MetricCard = ({ title, value, icon: Icon, growth, suffix = '' }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {suffix}
        </div>
        <p
          className={cn(
            'text-xs mt-1',
            growth >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400',
          )}
        >
          {growth > 0 ? '+' : ''}
          {Number(growth).toFixed(0)}% desde o mês passado
        </p>
      </CardContent>
    </Card>
  )

  const renderChatListItems = () => {
    if (recentChats.length === 0) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Nenhuma conversa recente
        </div>
      )
    }

    return (
      <div className="flex flex-col">
        {recentChats.map((chat) => {
          const customer = chat.expand?.customer_id
          if (!customer) return null
          const isSelected = selectedCustomer?.id === customer.id

          return (
            <button
              key={chat.id}
              onClick={() => setSelectedCustomer(customer)}
              className={cn(
                'flex items-start gap-3 p-4 text-left border-b transition-colors hover:bg-muted/50',
                isSelected && 'bg-muted',
              )}
            >
              <Avatar className="w-10 h-10 border shrink-0">
                <AvatarFallback>{customer.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm truncate">
                    {customer.name || customer.phone || 'Cliente'}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {format(new Date(chat.created), 'HH:mm')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate mb-1.5">
                  {chat.sender === 'ai' && 'IA: '}
                  {chat.sender === 'agent' && 'Você: '}
                  {chat.content}
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                  {customer.status}
                </Badge>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderChatInterface = (isMobile: boolean = false) => {
    if (!selectedCustomer) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
          <MessageSquare className="w-12 h-12 opacity-20" />
          <p>Selecione uma conversa para monitorar</p>
        </div>
      )
    }

    return (
      <>
        <div className="p-3 md:p-4 border-b flex items-center gap-3 bg-background shrink-0">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              onClick={() => setSelectedCustomer(null)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <Avatar className="w-10 h-10 border shrink-0">
            <AvatarFallback>
              {selectedCustomer.name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <div className="font-semibold truncate">{selectedCustomer.name || 'Cliente'}</div>
            <div className="text-xs text-muted-foreground truncate">{selectedCustomer.phone}</div>
          </div>
          <Badge className="shrink-0 hidden sm:inline-flex">{selectedCustomer.status}</Badge>
        </div>

        <ScrollArea className="flex-1 p-4 chat-scroll-viewport">
          <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full pb-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Início da conversa
              </div>
            ) : (
              chatHistory.map((msg) => {
                const isCustomer = msg.sender === 'customer'
                const isAgent = msg.sender === 'agent'
                const isSystem = msg.sender === 'system'

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-center text-[10px] md:text-xs text-muted-foreground my-2"
                    >
                      {msg.content}
                    </div>
                  )
                }

                return (
                  <div
                    key={msg.id}
                    className={cn('flex w-full', isCustomer ? 'justify-start' : 'justify-end')}
                  >
                    <div
                      className={cn(
                        'flex max-w-[85%] md:max-w-[75%] flex-col gap-1.5 rounded-2xl px-4 py-2.5 shadow-sm',
                        isCustomer
                          ? 'bg-white dark:bg-slate-800 border text-foreground rounded-tl-sm'
                          : isAgent
                            ? 'bg-emerald-600 text-white rounded-tr-sm'
                            : 'bg-primary text-primary-foreground rounded-tr-sm',
                      )}
                    >
                      <div className="flex items-center gap-1.5 opacity-80">
                        {isCustomer ? (
                          <User className="w-3 h-3" />
                        ) : isAgent ? (
                          <HeadphonesIcon className="w-3 h-3" />
                        ) : (
                          <Bot className="w-3 h-3" />
                        )}
                        <span className="text-[10px] uppercase tracking-wider font-bold">
                          {isCustomer ? 'Cliente' : isAgent ? 'Agente' : 'IA'}
                        </span>
                      </div>
                      <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                      <div className="text-[10px] opacity-70 text-right">
                        {format(new Date(msg.created), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-3 md:p-4 border-t bg-background shrink-0 pb-safe">
          <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto w-full">
            <Input
              placeholder="Enviar mensagem como Agente..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-8">
        Carregando dashboard...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-4rem)] w-full">
      {/* DESKTOP LAYOUT & MOBILE DASHBOARD TAB */}
      <div
        className={cn(
          'flex-1 flex-col p-4 md:p-8 gap-6 min-h-0 max-w-7xl mx-auto w-full',
          mobileTab === 'dashboard' && !selectedCustomer ? 'flex' : 'hidden md:flex',
        )}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <MetricCard
            title="Total de Clientes"
            value={metrics.totalCustomers}
            icon={Users}
            growth={metrics.customersGrowth}
          />
          <MetricCard
            title="Cadências Ativas"
            value={metrics.activeCadences}
            icon={Activity}
            growth={metrics.cadencesGrowth}
          />
          <MetricCard
            title="Conversas da IA"
            value={metrics.aiConversations}
            icon={MessageSquare}
            growth={metrics.aiConversationsGrowth}
          />
          <MetricCard
            title="Taxa de Conversão"
            value={metrics.conversionRate.toFixed(1)}
            suffix="%"
            icon={Percent}
            growth={metrics.conversionGrowth}
          />
        </div>

        {/* Chat layout container (Desktop only) */}
        <div className="flex-1 overflow-hidden border rounded-lg bg-background shadow-sm min-h-0 hidden md:flex">
          {/* Sidebar Desktop */}
          <div className="w-80 flex flex-col border-r shrink-0">
            <div className="p-4 border-b font-semibold bg-muted/30 shrink-0">
              Monitor de Conversas
            </div>
            <ScrollArea className="flex-1">{renderChatListItems()}</ScrollArea>
          </div>

          {/* Main Chat Desktop */}
          <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 min-w-0">
            {renderChatInterface(false)}
          </div>
        </div>
      </div>

      {/* MOBILE CHAT TAB */}
      <div
        className={cn(
          'flex-1 flex-col min-h-0 max-w-7xl mx-auto w-full',
          mobileTab === 'chat' || selectedCustomer ? 'flex md:hidden' : 'hidden',
        )}
      >
        <div className="flex-1 overflow-hidden flex bg-background min-h-0">
          {/* Mobile Sidebar */}
          <div className={cn('w-full flex-col', selectedCustomer ? 'hidden' : 'flex')}>
            <div className="p-4 border-b font-semibold bg-muted/30 shrink-0">
              Monitor de Conversas
            </div>
            <ScrollArea className="flex-1">{renderChatListItems()}</ScrollArea>
          </div>

          {/* Mobile Chat */}
          <div
            className={cn(
              'w-full flex-col bg-slate-50/50 dark:bg-slate-900/50 min-h-0',
              selectedCustomer ? 'flex' : 'hidden',
            )}
          >
            {renderChatInterface(true)}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div
        className={cn(
          'md:hidden border-t bg-background flex shrink-0 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]',
          selectedCustomer ? 'hidden' : '',
        )}
      >
        <button
          onClick={() => setMobileTab('dashboard')}
          className={cn(
            'flex-1 py-3 flex flex-col items-center gap-1',
            mobileTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={cn(
            'flex-1 py-3 flex flex-col items-center gap-1',
            mobileTab === 'chat' ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium">Monitor</span>
        </button>
      </div>
    </div>
  )
}
