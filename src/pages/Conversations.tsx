import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Send,
  Bot,
  User,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { getCustomers, updateCustomer, type Customer } from '@/services/customers'
import { createConversation, getConversations, type Conversation } from '@/services/conversations'

export default function Conversations() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeContactId, setActiveContactId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchBy, setSearchBy] = useState('all')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const customersRef = useRef(customers)

  useEffect(() => {
    customersRef.current = customers
  }, [customers])

  useEffect(() => {
    const loadAll = async () => {
      const [custs, convs] = await Promise.all([getCustomers(), getConversations()])
      setCustomers(custs)
      setConversations(convs)
      if (custs.length > 0 && !activeContactId) {
        setActiveContactId(custs[0].id)
      }
    }
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRealtime('customers', (e) => {
    if (e.action === 'create') setCustomers((prev) => [e.record as unknown as Customer, ...prev])
    else if (e.action === 'update')
      setCustomers((prev) =>
        prev.map((c) => (c.id === e.record.id ? (e.record as unknown as Customer) : c)),
      )
    else if (e.action === 'delete') setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
  })

  useRealtime('conversations', (e) => {
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
  })

  const activeContact = customers.find((c) => c.id === activeContactId)
  const activeMessages = conversations.filter((c) => c.customer_id === activeContactId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages])

  const handleSelectContact = (id: string) => {
    setActiveContactId(id)
    setShowMobileChat(true)
  }

  const handleToggleAi = async (checked: boolean) => {
    if (!activeContact) return
    const tags = activeContact.tags || []
    const newTags = checked ? [...tags, 'ai_paused'] : tags.filter((t) => t !== 'ai_paused')
    await updateCustomer(activeContact.id, { tags: newTags })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !activeContactId) return
    const text = inputValue
    setInputValue('')
    await createConversation({
      customer_id: activeContactId,
      content: text,
      sender: 'agent',
    })
  }

  const contacts = customers.map((c) => {
    const msgs = conversations.filter((m) => m.customer_id === c.id)
    const lastMsg = msgs[msgs.length - 1]
    return {
      ...c,
      lastMessage: lastMsg?.content || 'Sem mensagens',
      time: lastMsg
        ? new Date(lastMsg.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      aiPaused: c.tags?.includes('ai_paused') || false,
      phase: c.status || 'Lead Novo',
      sentiment: 'Curioso',
      unread: 0,
    }
  })

  const filteredContacts = contacts.filter((contact) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()

    const nameMatch = contact.name?.toLowerCase().includes(term) || false
    const emailMatch = contact.email?.toLowerCase().includes(term) || false
    const phoneMatch =
      contact.phone?.toLowerCase().includes(term) ||
      (contact as any).phone_1_value?.toLowerCase().includes(term) ||
      false
    const statusMatch = contact.status?.toLowerCase().includes(term) || false

    if (searchBy === 'name') return nameMatch
    if (searchBy === 'email') return emailMatch
    if (searchBy === 'phone') return phoneMatch
    if (searchBy === 'status') return statusMatch

    return nameMatch || emailMatch || phoneMatch || statusMatch
  })

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)]">
      <div className="flex h-full overflow-hidden rounded-xl border bg-card shadow-elevation relative">
        <div
          className={cn(
            'w-full md:w-80 lg:w-96 border-r flex flex-col absolute md:relative inset-0 z-10 bg-card transition-transform duration-300 ease-apple',
            showMobileChat ? '-translate-x-full md:translate-x-0' : 'translate-x-0',
          )}
        >
          <div className="p-4 border-b flex flex-col gap-3">
            <h2 className="font-bold text-xl text-secondary">Conversas</h2>
            <div className="flex gap-2 items-center">
              <Select value={searchBy} onValueChange={setSearchBy}>
                <SelectTrigger className="w-[110px] h-9 bg-muted/50 border-none focus:ring-1 focus:ring-primary rounded-full text-xs">
                  <SelectValue placeholder="Buscar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={
                    searchBy === 'name'
                      ? 'Buscar por nome...'
                      : searchBy === 'email'
                        ? 'Buscar por e-mail...'
                        : searchBy === 'phone'
                          ? 'Buscar por telefone...'
                          : searchBy === 'status'
                            ? 'Buscar por status...'
                            : 'Buscar contatos...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-full h-9"
                />
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredContacts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum contato encontrado
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact.id)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all hover:bg-accent focus:outline-none',
                      activeContactId === contact.id ? 'bg-accent shadow-subtle' : 'bg-transparent',
                    )}
                  >
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm shrink-0">
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?seed=${contact.id}`}
                      />
                      <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-secondary truncate pr-2">
                          {contact.name}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {contact.time}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <span className="text-xs truncate text-muted-foreground">
                          {contact.lastMessage}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 bg-muted/50 font-normal"
                        >
                          {contact.phase}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 border-primary/20 text-primary bg-primary/5 font-normal"
                        >
                          <Sparkles className="h-2 w-2 mr-1" />
                          {contact.sentiment}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div
          className={cn(
            'flex-1 flex flex-col absolute md:relative inset-0 z-20 bg-[#F0F2F5] dark:bg-card transition-transform duration-300 ease-apple',
            showMobileChat ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
          )}
        >
          {activeContact ? (
            <>
              <div className="h-16 px-4 flex items-center justify-between border-b bg-card shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-2 hover:bg-accent"
                    onClick={() => setShowMobileChat(false)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10 border shadow-sm">
                    <AvatarImage
                      src={`https://img.usecurling.com/ppl/thumbnail?seed=${activeContact.id}`}
                    />
                    <AvatarFallback>{activeContact.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm text-secondary leading-tight">
                      {activeContact.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {activeContact.phone || activeContact.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-full border border-border/50">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Fase Atual:</span>
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {activeContact.status || 'Lead Novo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 border rounded-full px-3 py-1.5 bg-background shadow-sm hover:shadow-md transition-shadow">
                    <Label
                      htmlFor="pause-ai"
                      className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      {activeContact.tags?.includes('ai_paused') ? (
                        <span className="text-amber-600 flex items-center gap-1">
                          <User className="h-3.5 w-3.5" /> Atendimento Humano
                        </span>
                      ) : (
                        <span className="text-primary flex items-center gap-1">
                          <Bot className="h-3.5 w-3.5" /> IA Ativa
                        </span>
                      )}
                    </Label>
                    <Switch
                      id="pause-ai"
                      checked={activeContact.tags?.includes('ai_paused')}
                      onCheckedChange={handleToggleAi}
                      className="data-[state=checked]:bg-amber-500 ml-1"
                    />
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4 relative bg-[#e5ddd5] dark:bg-[#0b141a]">
                <div
                  className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none"
                  style={{
                    backgroundImage:
                      'url("https://img.usecurling.com/p/800/600?q=texture&color=gray&dpr=1")',
                    backgroundSize: 'cover',
                  }}
                ></div>
                <div className="space-y-3 max-w-3xl mx-auto pb-4 relative z-10">
                  <div className="flex justify-center mb-6">
                    <span className="bg-background/80 dark:bg-card/80 backdrop-blur text-xs px-3 py-1 rounded-lg text-muted-foreground shadow-sm">
                      Hoje
                    </span>
                  </div>

                  {activeMessages.map((msg) => {
                    const isSystem = msg.sender === 'system'
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-4 animate-fade-in-up">
                          <div className="bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium px-4 py-2 rounded-xl flex items-center gap-2 max-w-[80%] text-center shadow-sm">
                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                            <span className="leading-relaxed">{msg.content}</span>
                          </div>
                        </div>
                      )
                    }

                    const isClient = msg.sender === 'customer'
                    const displayTime = new Date(msg.created).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex animate-fade-in-up',
                          isClient ? 'justify-start' : 'justify-end',
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm relative group',
                            isClient
                              ? 'bg-card text-foreground rounded-tl-sm'
                              : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-sm',
                          )}
                        >
                          {!isClient && msg.sender === 'ai' && (
                            <div className="flex items-center gap-1 mb-1 opacity-70">
                              <Bot className="h-3 w-3 text-primary dark:text-green-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-green-400">
                                Assistente IA
                              </span>
                            </div>
                          )}
                          {!isClient && (msg.sender === 'agent' || msg.sender === 'user') && (
                            <div className="flex items-center gap-1 mb-1 opacity-70">
                              <User className="h-3 w-3 text-amber-600" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                Atendente Humano
                              </span>
                            </div>
                          )}
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1 -mb-1">
                            <span className="text-[10px] text-muted-foreground opacity-80">
                              {displayTime}
                            </span>
                            {!isClient && (
                              <CheckCircle2 className="h-3 w-3 text-primary/80 dark:text-green-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-3 sm:p-4 bg-card border-t shrink-0">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-end gap-2 max-w-3xl mx-auto"
                >
                  <div className="flex-1 relative">
                    <Input
                      placeholder={
                        activeContact.tags?.includes('ai_paused')
                          ? 'Digite sua mensagem...'
                          : 'Pause a IA no topo para enviar mensagens manualmente.'
                      }
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={!activeContact.tags?.includes('ai_paused')}
                      className={cn(
                        'w-full bg-muted/50 border-none rounded-2xl px-5 py-3 h-auto min-h-[48px] shadow-inner',
                        !activeContact.tags?.includes('ai_paused') &&
                          'opacity-60 cursor-not-allowed',
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!activeContact.tags?.includes('ai_paused') || !inputValue.trim()}
                    className="h-12 w-12 rounded-full shrink-0 shadow-md hover:scale-105 transition-transform"
                  >
                    <Send className="h-5 w-5 ml-1" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-card">
              <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Info className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-secondary">Uazapi AI Manager</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                Selecione uma conversa ao lado para visualizar o histórico de interações e gerenciar
                o comportamento da inteligência artificial.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
