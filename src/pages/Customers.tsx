import { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Loader2,
  Search,
  LayoutList,
  Kanban,
  MessageSquare,
  AlertTriangle,
  Send,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  phone_1_value: string
  phone: string
  email_1_value: string
  email: string
  status: string
  urgency: number
  updated: string
  notes: string
  source: string
  created: string
  neighborhood: string
  price_range: string
}

interface Cadence {
  id: string
  title: string
  order: number
}

interface Conversation {
  id: string
  content: string
  sender: string
  created: string
  customer_id: string
}

export default function Customers() {
  const [view, setView] = useState<'list' | 'pipeline'>('list')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [custRes, cadRes] = await Promise.all([
        pb.collection('customers').getFullList<Customer>({
          sort: '-updated',
        }),
        pb.collection('cadences').getFullList<Cadence>({
          sort: 'order',
          filter: 'is_active = true',
        }),
      ])
      setCustomers(custRes)
      setCadences(cadRes)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', (e) => {
    if (e.action === 'create') {
      setCustomers((prev) => [e.record as unknown as Customer, ...prev])
    } else if (e.action === 'update') {
      setCustomers((prev) =>
        prev.map((c) => (c.id === e.record.id ? (e.record as unknown as Customer) : c)),
      )
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const filteredCustomers = customers.filter((c) => {
    const s = search.toLowerCase()
    return (
      (c.name || '').toLowerCase().includes(s) ||
      (c.phone || c.phone_1_value || '').includes(s) ||
      (c.email || c.email_1_value || '').toLowerCase().includes(s)
    )
  })

  const getUrgencyColor = (u: number) => {
    if (u >= 4) return 'bg-destructive text-destructive-foreground'
    if (u === 3) return 'bg-orange-500 text-white'
    return 'bg-secondary text-secondary-foreground'
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('customerId', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('customerId')
    if (id) {
      const cust = customers.find((c) => c.id === id)
      if (cust && cust.status !== newStatus) {
        setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)))
        try {
          await pb.collection('customers').update(id, { status: newStatus })
        } catch (err) {
          loadData() // Revert local state on error
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-full flex-1 w-full relative">
      <div className="flex-none p-6 space-y-4 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
            <p className="text-muted-foreground">Gerencie seus contatos e acompanhe o funil.</p>
          </div>
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as 'list' | 'pipeline')}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full sm:w-[200px] grid-cols-2">
              <TabsTrigger value="list">
                <LayoutList className="w-4 h-4 mr-2" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="pipeline">
                <Kanban className="w-4 h-4 mr-2" />
                Funil
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar lead..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6 max-w-[1600px] mx-auto w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : view === 'list' ? (
          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Última Interação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <TableCell className="font-medium">{customer.name || 'Sem nome'}</TableCell>
                    <TableCell>{customer.phone_1_value || customer.phone || '-'}</TableCell>
                    <TableCell>{customer.email_1_value || customer.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.status || 'Novo'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getUrgencyColor(customer.urgency)}>
                        Nível {customer.urgency || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(customer.updated), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum lead encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <ScrollArea className="h-full w-full whitespace-nowrap rounded-md border bg-muted/20">
            <div className="flex h-full p-4 gap-4 w-max">
              {cadences.map((cadence) => {
                const columnCustomers = filteredCustomers.filter((c) => {
                  if (c.status === cadence.title) return true
                  const hasExactCadence = cadences.some((cad) => cad.title === c.status)
                  if (!hasExactCadence && cadence.order === 1) return true
                  return false
                })
                return (
                  <div
                    key={cadence.id}
                    className="w-80 shrink-0 flex flex-col bg-muted/50 rounded-lg p-3"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, cadence.title)}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="font-semibold text-sm truncate pr-2" title={cadence.title}>
                        {cadence.order}. {cadence.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {columnCustomers.length}
                      </Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar pb-2">
                      {columnCustomers.map((customer) => (
                        <Card
                          key={customer.id}
                          className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
                          draggable
                          onDragStart={(e) => handleDragStart(e, customer.id)}
                          onClick={() => setSelectedCustomerId(customer.id)}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="font-medium text-sm leading-tight line-clamp-1">
                              {customer.name || 'Sem nome'}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground truncate">
                                {customer.phone_1_value || customer.phone || 'Sem telefone'}
                              </span>
                              {customer.urgency >= 4 && (
                                <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      <CustomerSidebar
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </div>
  )
}

function CustomerSidebar({
  customerId,
  onClose,
}: {
  customerId: string | null
  onClose: () => void
}) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!customerId) {
      setCustomer(null)
      setConversations([])
      return
    }

    let isMounted = true
    const fetchContext = async () => {
      setLoading(true)
      try {
        const [cust, conv] = await Promise.all([
          pb.collection('customers').getOne<Customer>(customerId),
          pb.collection('conversations').getFullList<Conversation>({
            filter: `customer_id = '${customerId}'`,
            sort: 'created',
          }),
        ])
        if (isMounted) {
          setCustomer(cust)
          setConversations(conv)
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchContext()

    return () => {
      isMounted = false
    }
  }, [customerId])

  useRealtime(
    'conversations',
    (e) => {
      if (!customerId) return
      const rec = e.record as unknown as Conversation
      if (rec.customer_id === customerId) {
        if (e.action === 'create') {
          setConversations((prev) => [...prev, rec])
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      }
    },
    !!customerId,
  )

  useRealtime(
    'customers',
    (e) => {
      if (!customerId) return
      if (e.record.id === customerId && e.action === 'update') {
        setCustomer(e.record as unknown as Customer)
      }
    },
    !!customerId,
  )

  const handleUpdateNotes = async (val: string) => {
    if (!customer) return
    setSavingNotes(true)
    try {
      const updated = await pb.collection('customers').update(customer.id, { notes: val })
      setCustomer(updated as unknown as Customer)
    } catch (e) {
      console.error(e)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSendManualMessage = async () => {
    if (!replyText.trim() || !customer) return
    try {
      await pb.collection('conversations').create({
        customer_id: customer.id,
        user_id: pb.authStore.model?.id,
        sender: 'agent',
        content: replyText.trim(),
      })
      setReplyText('')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Sheet open={!!customerId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col">
        {loading || !customer ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle className="flex items-center justify-between">
                <span>{customer.name || 'Lead sem nome'}</span>
                {customer.urgency >= 4 && (
                  <Badge variant="destructive">Urgência {customer.urgency}</Badge>
                )}
              </SheetTitle>
              <SheetDescription className="flex flex-col gap-1 mt-2">
                <span>{customer.phone_1_value || customer.phone || 'Sem telefone'}</span>
                <span>
                  Status: <Badge variant="outline">{customer.status}</Badge>
                </span>
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-2 border-b">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                  <TabsTrigger
                    value="chat"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" /> Conversa
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Notas & Dados
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="chat"
                className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden"
              >
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4 pb-4">
                    {conversations.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm mt-10">
                        Nenhuma mensagem registrada.
                      </div>
                    ) : (
                      conversations.map((msg, i) => {
                        const isAgentOrAi = msg.sender === 'ai' || msg.sender === 'agent'
                        return (
                          <div
                            key={msg.id || i}
                            className={cn(
                              'flex w-full',
                              isAgentOrAi ? 'justify-end' : 'justify-start',
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                                isAgentOrAi
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-muted rounded-bl-sm',
                              )}
                            >
                              {msg.sender === 'ai' && (
                                <div className="text-[10px] opacity-70 mb-1 font-semibold flex items-center">
                                  <Bot className="w-3 h-3 mr-1" /> BIA
                                </div>
                              )}
                              {msg.sender === 'agent' && (
                                <div className="text-[10px] opacity-70 mb-1 font-semibold flex items-center">
                                  Agente Humano
                                </div>
                              )}
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              <div className="text-[10px] opacity-50 mt-1 text-right">
                                {format(new Date(msg.created), 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendManualMessage()
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Enviar mensagem manual..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <Button type="submit" size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent
                value="notes"
                className="flex-1 p-6 overflow-y-auto mt-0 data-[state=inactive]:hidden"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações</label>
                    <textarea
                      className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Adicione notas sobre o cliente..."
                      defaultValue={customer.notes}
                      onBlur={(e) => {
                        if (e.target.value !== customer.notes) handleUpdateNotes(e.target.value)
                      }}
                      disabled={savingNotes}
                    />
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium border-b pb-1">Metadados</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Origem</span>
                        <span>{customer.source || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Criado em</span>
                        <span>{format(new Date(customer.created), 'dd/MM/yyyy')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">
                          Bairro de Interesse
                        </span>
                        <span>{customer.neighborhood || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Faixa de Preço</span>
                        <span>{customer.price_range || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
