import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { Search, Loader2, ArrowLeft, Phone, Mail, User, Clock, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Customer {
  id: string
  name: string
  phone: string
  email: string
  status: string
  urgency: number
  neighborhood: string
  price_range: string
  source: string
  notes: string
  updated: string
  created: string
}

const STEPS = [
  {
    status: 'Captura + Identificação',
    title: '1. CAPTURA + IDENTIFICAÇÃO',
    description:
      'Identificar qual imóvel gerou o lead (Site, Meta, Chaves na Mão, YouTube). Pergunta inicial obrigatória se não identificado.',
    active: true,
  },
  {
    status: 'Validação no CRM',
    title: '2. VALIDAÇÃO NO CRM',
    description:
      'Registrar Imóvel, Origem, Perfil (Comprador/Vendedor), Faixa de Preço, Urgência (1-5) e Bairros. Gatilho de notificação se Urgência ≥ 4.',
    active: true,
  },
  {
    status: 'Contato Personalizado',
    title: '3. CONTATO PERSONALIZADO',
    description:
      'BIA responde com dados reais do imóvel (Tipo, Bairro, Valor). Oferece fotos, vídeo ou visita.',
    active: true,
  },
  {
    status: 'Mapeamento de Perfil',
    title: '4. MAPEAMENTO DE PERFIL',
    description:
      '3 perguntas estratégicas: Imóvel para vender (permuta), faixa de valor ideal e pressa para fechar.',
    active: true,
  },
  {
    status: 'Nutrição Automática',
    title: '5. NUTRIÇÃO AUTOMÁTICA',
    description:
      'Fluxo de follow-up (D1: Ficha, D3: Vídeo, D7: Novas opções, D14: Similares). 3 toques sem resposta = nutrição mensal.',
    active: true,
  },
  {
    status: 'Agendamento de Visita',
    title: '6. AGENDAMENTO DE VISITA',
    description:
      'Ponto Crítico. BIA verifica Google Calendar e propõe 3 opções. Se não, oferece vídeo tour.',
    active: true,
  },
  {
    status: 'Pré-Visita',
    title: '7. PRÉ-VISITA',
    description:
      '1h antes: Envio de endereço (Waze), lembrete de permuta e documentos necessários.',
    active: true,
  },
  {
    status: 'Pós-Visita',
    title: '8. PÓS-VISITA',
    description:
      '2h depois: Feedback do imóvel. Se gostou, simulação de financiamento. Se não, novas opções. Corretor liga em 24h sem resposta.',
    active: true,
  },
  {
    status: 'Proposta e Negociação',
    title: '9. PROPOSTA E NEGOCIAÇÃO',
    description:
      'Coleta valor, forma de pagamento e permuta. BIA trata objeções (preço, vender primeiro, vou pensar).',
    active: true,
  },
  {
    status: 'Fechamento e Pós-Venda',
    title: '10. FECHAMENTO E PÓS-VENDA',
    description:
      'Checklist de documentos, lembretes automáticos. Pós-venda em 7, 30 e 90 dias com pedido de indicação.',
    active: false,
  },
]

function Pipeline() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showOnlyActive, setShowOnlyActive] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const records = await pb.collection('customers').getFullList<Customer>({
        sort: '-updated',
      })
      setCustomers(records)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar leads do pipeline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime<Customer>('customers', (e) => {
    if (e.action === 'create') {
      setCustomers((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setCustomers((prev) => prev.map((c) => (c.id === e.record.id ? e.record : c)))
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const visibleSteps = showOnlyActive ? STEPS.filter((s) => s.active) : STEPS

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (search) {
        const query = search.toLowerCase()
        const matchesName = c.name?.toLowerCase().includes(query)
        const matchesPhone = c.phone?.includes(query)
        const matchesEmail = c.email?.toLowerCase().includes(query)
        if (!matchesName && !matchesPhone && !matchesEmail) {
          return false
        }
      }
      return true
    })
  }, [customers, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Customer[]>()
    visibleSteps.forEach((s) => map.set(s.status, []))
    filteredCustomers.forEach((c) => {
      if (map.has(c.status)) {
        map.get(c.status)!.push(c)
      }
    })
    return map
  }, [filteredCustomers, visibleSteps])

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
      const customer = customers.find((c) => c.id === id)
      if (customer && customer.status !== newStatus) {
        // Optimistic update
        setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)))
        try {
          await pb.collection('customers').update(id, { status: newStatus })
        } catch (err) {
          toast.error('Erro ao atualizar status do lead')
          loadData() // rollback on error
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden p-6 gap-4 w-full max-w-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline Cadeia Evolutiva</h1>
          <p className="text-muted-foreground">
            Arraste os leads entre as etapas para atualizar o status.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="active-leads"
              checked={showOnlyActive}
              onCheckedChange={setShowOnlyActive}
            />
            <Label htmlFor="active-leads" className="text-sm font-medium cursor-pointer">
              Visualizar Apenas Ativos (1-9)
            </Label>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou contato..."
              className="pl-8 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 w-full rounded-md bg-muted/20 border">
        <div className="flex h-full w-max gap-4 p-4 items-start">
          {visibleSteps.map((step) => {
            const colCustomers = grouped.get(step.status) || []
            return (
              <div
                key={step.status}
                className="w-[320px] flex-shrink-0 flex flex-col gap-3 rounded-xl bg-muted/40 p-3 h-full border shadow-sm"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, step.status)}
              >
                <div className="flex flex-col gap-1.5 px-1 mb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[13px] uppercase tracking-tight">{step.title}</h3>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      {colCustomers.length}
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground font-medium">
                    {step.description}
                  </p>
                </div>

                <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-[150px] pb-2">
                  {colCustomers.map((customer) => (
                    <Card
                      key={customer.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, customer.id)}
                      className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm"
                    >
                      <CardContent className="p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold text-[13px] leading-tight line-clamp-2">
                            {customer.name || 'Sem nome'}
                          </span>
                          {customer.urgency >= 4 && (
                            <Badge
                              variant="destructive"
                              className="px-1.5 py-0 text-[10px] h-5 shrink-0"
                            >
                              Urg {customer.urgency}
                            </Badge>
                          )}
                        </div>
                        {(customer.neighborhood || customer.price_range) && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {customer.neighborhood}{' '}
                            {customer.neighborhood && customer.price_range && '•'}{' '}
                            {customer.price_range}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/50">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {format(new Date(customer.updated), 'dd/MM HH:mm', { locale: ptBR })}
                          </div>
                          <Button variant="secondary" size="icon" className="h-6 w-6" asChild>
                            <Link to={`/customers/${customer.id}`}>
                              <ArrowLeft className="w-3 h-3 rotate-180" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {colCustomers.length === 0 && (
                    <div className="h-full flex items-center justify-center opacity-50 border-2 border-dashed rounded-lg p-6 text-center text-xs font-medium">
                      Arraste leads para cá
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const cust = await pb.collection('customers').getOne<Customer>(id)
      setCustomer(cust)

      const convs = await pb.collection('conversations').getFullList({
        filter: `customer_id = "${id}"`,
        sort: 'created',
      })
      setConversations(convs)
    } catch (err) {
      toast.error('Erro ao carregar detalhes do lead')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime<Customer>('customers', (e) => {
    if (e.record.id === id) setCustomer(e.record)
  })

  useRealtime('conversations', (e) => {
    if (e.record.customer_id === id) {
      if (e.action === 'create') {
        setConversations((prev) => [...prev, e.record])
      }
    }
  })

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <h2 className="text-xl font-semibold">Lead não encontrado</h2>
        <Button onClick={() => navigate('/customers')}>Voltar ao Pipeline</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto p-6 gap-6 w-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.name || 'Lead sem nome'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{customer.status}</Badge>
              {customer.urgency >= 4 && (
                <Badge variant="destructive">Urgência {customer.urgency}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.phone || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm break-all">{customer.email || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Origem: {customer.source || 'Não informada'}</span>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block mb-1">
                        Bairro Ideal
                      </span>
                      <span className="text-sm font-medium">{customer.neighborhood || '-'}</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block mb-1">
                        Faixa de Valor
                      </span>
                      <span className="text-sm font-medium">{customer.price_range || '-'}</span>
                    </div>
                  </div>
                </div>

                {customer.notes && (
                  <div className="pt-4 border-t">
                    <span className="text-xs font-semibold text-muted-foreground block mb-2">
                      Anotações
                    </span>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{customer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Histórico de Interações (BIA / Humano)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 bg-muted/10">
            <ScrollArea className="h-full w-full p-4">
              {conversations.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm mt-10">
                  Nenhuma conversa registrada.
                </div>
              ) : (
                <div className="space-y-6 flex flex-col pb-4">
                  {conversations.map((msg) => {
                    const isStaff = msg.sender !== 'customer'

                    let senderLabel = 'LEAD'
                    if (msg.sender === 'ai') senderLabel = 'BIA (IA)'
                    if (msg.sender === 'system') senderLabel = 'SISTEMA'
                    if (msg.sender === 'agent') senderLabel = 'CORRETOR'

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'max-w-[85%] rounded-2xl p-4 text-sm shadow-sm',
                          isStaff
                            ? 'bg-primary text-primary-foreground self-end rounded-tr-sm'
                            : 'bg-background border self-start rounded-tl-sm',
                        )}
                      >
                        <div
                          className={cn(
                            'text-[10px] font-bold tracking-wider mb-2',
                            isStaff ? 'text-primary-foreground/80' : 'text-muted-foreground',
                          )}
                        >
                          {senderLabel}
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <span
                          className={cn(
                            'text-[10px] mt-2 block font-medium',
                            isStaff ? 'text-primary-foreground/60' : 'text-muted-foreground/60',
                          )}
                        >
                          {format(new Date(msg.created), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function Customers() {
  return (
    <Routes>
      <Route index element={<Pipeline />} />
      <Route path=":id" element={<CustomerDetail />} />
    </Routes>
  )
}
