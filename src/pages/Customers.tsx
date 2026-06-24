import { useState, useEffect } from 'react'
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Info,
  Loader2,
  Search,
  MessageSquare,
  Bot,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  status: string
  urgency: number
  neighborhood: string
  price_range: string
  notes: string
  created: string
  updated: string
}

interface Cadence {
  id: string
  title: string
  description: string
  ai_instructions: string
  order: number
}

interface Conversation {
  id: string
  content: string
  sender: 'customer' | 'agent' | 'ai' | 'system'
  created: string
}

const KANBAN_STAGES = [
  'Captura + Identificação',
  'Validação no CRM',
  'Contato Personalizado',
  'Mapeamento de Perfil',
  'Nutrição Automática',
  'Agendamento de Visita',
  'Pré-Visita',
  'Pós-Visita',
  'Proposta e Negociação',
  'Fechamento e Pós-Venda',
]

function CustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('kanban')

  const loadData = async () => {
    try {
      const [custRes, cadRes] = await Promise.all([
        pb.collection('customers').getFullList<Customer>({ sort: '-created' }),
        pb.collection('cadences').getFullList<Cadence>({ sort: 'order' }),
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

  useRealtime('customers', () => loadData())

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleStatusChange = async (id: string, status: string) => {
    try {
      // Optimistic update
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
      await pb.collection('customers').update(id, { status })
    } catch (err) {
      console.error(err)
      loadData() // revert on error
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-full mx-auto w-full h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes e Leads</h2>
          <p className="text-muted-foreground">
            Gerencie sua base de clientes e acompanhe o pipeline da BIA.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs value={view} onValueChange={setView} className="flex-1 flex flex-col min-h-0">
        <TabsList>
          <TabsTrigger value="kanban">Pipeline de Vendas</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 overflow-x-auto overflow-y-hidden mt-4 pb-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex gap-4 h-[calc(100vh-16rem)] min-w-max pb-4">
              {KANBAN_STAGES.map((stage, index) => {
                const cadence = cadences.find(
                  (c) =>
                    c.order === index + 1 || c.title?.toLowerCase().includes(stage.toLowerCase()),
                )

                const stageCustomers = filteredCustomers.filter((c) => c.status === stage)

                return (
                  <div
                    key={stage}
                    className="w-80 flex flex-col bg-slate-100 rounded-lg border flex-shrink-0"
                  >
                    <div className="p-3 border-b bg-slate-50 rounded-t-lg flex items-center justify-between sticky top-0">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-sm">
                          {index + 1}. {stage}
                        </span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {stageCustomers.length}
                        </Badge>
                      </div>

                      {cadence && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-slate-200 shrink-0"
                            >
                              <Info className="h-4 w-4 text-slate-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="p-4 bg-slate-900 text-slate-50 rounded-t-md">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <Bot className="w-4 h-4 text-primary" />
                                {cadence.title || stage}
                              </h4>
                            </div>
                            <div className="p-4 space-y-3 text-sm max-h-[400px] overflow-y-auto">
                              <div>
                                <span className="font-semibold block mb-1 text-slate-700">
                                  Estratégia (BIA):
                                </span>
                                <p className="text-slate-600">
                                  {cadence.description || 'Nenhuma descrição definida.'}
                                </p>
                              </div>
                              {cadence.ai_instructions && (
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mt-2">
                                  <span className="font-semibold text-amber-800 flex items-center gap-1 mb-1">
                                    Regra de Ouro
                                  </span>
                                  <p className="text-amber-900 text-xs whitespace-pre-wrap">
                                    {cadence.ai_instructions}
                                  </p>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {stageCustomers.map((customer) => (
                        <Card
                          key={customer.id}
                          className="hover:border-primary/50 transition-colors shadow-sm"
                        >
                          <CardContent className="p-3 space-y-3">
                            <div className="flex justify-between items-start">
                              <Link
                                to={`/customers/${customer.id}`}
                                className="font-medium text-sm hover:underline text-slate-800"
                              >
                                {customer.name || 'Sem nome'}
                              </Link>
                              {customer.urgency >= 4 && (
                                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground space-y-1.5">
                              {customer.neighborhood && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{customer.neighborhood}</span>
                                </div>
                              )}
                              {customer.price_range && (
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                  <span>{customer.price_range}</span>
                                </div>
                              )}
                            </div>

                            {cadence && (
                              <div className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-md w-fit">
                                <Bot className="w-3.5 h-3.5" />
                                BIA no Passo {index + 1}
                              </div>
                            )}

                            <div className="pt-1">
                              <Select
                                value={customer.status}
                                onValueChange={(val) => handleStatusChange(customer.id, val)}
                              >
                                <SelectTrigger className="h-7 text-xs bg-slate-50 border-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {KANBAN_STAGES.map((s) => (
                                    <SelectItem key={s} value={s} className="text-xs">
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name || 'Sem nome'}</TableCell>
                    <TableCell>
                      <div className="text-sm">{customer.phone}</div>
                      <div className="text-xs text-muted-foreground">{customer.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {customer.urgency >= 4 ? (
                        <Badge variant="destructive">Alta ({customer.urgency})</Badge>
                      ) : (
                        <Badge variant="secondary">{customer.urgency || '-'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.neighborhood || '-'} • {customer.price_range || '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/customers/${customer.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const loadCustomer = async () => {
    if (!id) return
    try {
      const data = await pb.collection('customers').getOne<Customer>(id)
      setCustomer(data)
      const convs = await pb.collection('conversations').getFullList<Conversation>({
        filter: `customer_id = "${id}"`,
        sort: 'created',
      })
      setConversations(convs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomer()
  }, [id])

  useRealtime('customers', (e) => {
    if (e.record.id === id) setCustomer(e.record as Customer)
  })

  useRealtime('conversations', (e) => {
    if (e.record.customer_id === id) {
      if (e.action === 'create') setConversations((prev) => [...prev, e.record as Conversation])
    }
  })

  const sendMsg = async () => {
    if (!msg.trim() || !id) return
    try {
      await pb.collection('conversations').create({
        customer_id: id,
        content: msg,
        sender: 'agent',
      })
      setMsg('')
    } catch (err) {
      console.error(err)
    }
  }

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  if (!customer) return <div className="p-8">Cliente não encontrado.</div>

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {customer.name || 'Cliente Sem Nome'}
          </h2>
          <p className="text-muted-foreground">CRM e Histórico de Interações</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={customer.urgency >= 4 ? 'destructive' : 'secondary'} className="text-sm">
            Urgência {customer.urgency || 0}
          </Badge>
          <Badge className="text-sm">{customer.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 shrink-0" /> {customer.phone || 'Sem telefone'}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 shrink-0" /> {customer.email || 'Sem email'}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 shrink-0" />{' '}
                {customer.neighborhood || 'Bairro não informado'}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <DollarSign className="w-4 h-4 shrink-0" />{' '}
                {customer.price_range || 'Faixa não informada'}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 shrink-0" /> Criado em{' '}
                {format(new Date(customer.created), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anotações Internas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {customer.notes || 'Nenhuma anotação.'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="flex flex-col h-[600px]">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Histórico de Conversas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversations.length === 0 ? (
                <div className="text-center text-muted-foreground mt-10">
                  Nenhuma mensagem registrada.
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      'flex max-w-[80%] rounded-lg p-3',
                      c.sender === 'customer'
                        ? 'bg-slate-100 self-start'
                        : c.sender === 'ai'
                          ? 'bg-primary/10 ml-auto'
                          : c.sender === 'system'
                            ? 'bg-amber-50 mx-auto text-center text-xs w-full justify-center'
                            : 'bg-primary text-primary-foreground ml-auto',
                    )}
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-2 text-[10px] opacity-70">
                        {c.sender === 'customer' && <User className="w-3 h-3" />}
                        {c.sender === 'ai' && <Bot className="w-3 h-3" />}
                        {c.sender === 'agent' && <User className="w-3 h-3" />}
                        <span className="font-semibold uppercase">
                          {c.sender === 'ai' ? 'BIA' : c.sender === 'customer' ? 'Lead' : c.sender}
                        </span>
                        <span className="ml-auto">{format(new Date(c.created), 'HH:mm')}</span>
                      </div>
                      <span className="text-sm whitespace-pre-wrap">{c.content}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <div className="p-4 border-t flex gap-2">
              <Input
                placeholder="Enviar mensagem interna..."
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
              />
              <Button size="icon" onClick={sendMsg}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function Customers() {
  return (
    <Routes>
      <Route path="/" element={<CustomersList />} />
      <Route path=":id" element={<CustomerDetail />} />
    </Routes>
  )
}
