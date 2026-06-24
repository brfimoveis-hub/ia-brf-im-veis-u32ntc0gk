import { useState, useEffect } from 'react'
import { Routes, Route, Link, useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, KanbanSquare, List, Phone, Mail, Search, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PIPELINE_COLUMNS = [
  {
    id: 'Captura + Identificação',
    title: '1. Captura',
    desc: 'Identificação inicial do lead e dados de contato.',
  },
  {
    id: 'Validação no CRM',
    title: '2. Validação',
    desc: 'Verificação de dados e deduplicação no sistema.',
  },
  {
    id: 'Contato Personalizado',
    title: '3. Contato',
    desc: 'Primeira abordagem personalizada para engajamento.',
  },
  {
    id: 'Mapeamento de Perfil',
    title: '4. Mapeamento',
    desc: 'Entendimento das necessidades, orçamento e região.',
  },
  {
    id: 'Nutrição Automática',
    title: '5. Nutrição',
    desc: 'Envio de conteúdos relevantes e imóveis compatíveis.',
  },
  {
    id: 'Agendamento de Visita',
    title: '6. Agendamento',
    desc: 'Marcação de data e horário para visitação.',
  },
  { id: 'Pré-Visita', title: '7. Pré-Visita', desc: 'Confirmação do agendamento e orientações.' },
  {
    id: 'Pós-Visita',
    title: '8. Pós-Visita',
    desc: 'Coleta de feedback após a visita aos imóveis.',
  },
  {
    id: 'Proposta e Negociação',
    title: '9. Proposta',
    desc: 'Análise de condições e negociação de valores.',
  },
  {
    id: 'Fechamento e Pós-Venda',
    title: '10. Fechamento',
    desc: 'Assinatura de contrato e acompanhamento final.',
  },
]

function PipelineBoard({
  customers,
  updateStatus,
}: {
  customers: any[]
  updateStatus: (id: string, status: string) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const customerId = e.dataTransfer.getData('text/plain')
    if (customerId && draggingId) {
      const customer = customers.find((c) => c.id === customerId)
      if (customer && customer.status !== newStatus) {
        updateStatus(customerId, newStatus)
      }
    }
    setDraggingId(null)
  }

  const customersByColumn = PIPELINE_COLUMNS.map((col) => ({
    ...col,
    items: customers.filter((c) => {
      const mappedStatus = PIPELINE_COLUMNS.some((p) => p.id === c.status)
        ? c.status
        : 'Captura + Identificação'
      return mappedStatus === col.id
    }),
  }))

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x items-start min-h-[500px]">
      {customersByColumn.map((col) => (
        <div
          key={col.id}
          className="min-w-[320px] w-[320px] bg-slate-100/60 rounded-xl p-3 flex flex-col snap-start border border-slate-200"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 flex items-center justify-between">
              {col.title}
              <span className="bg-white text-slate-500 text-xs px-2 py-0.5 rounded-full shadow-sm border border-slate-200">
                {col.items.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">{col.desc}</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 min-h-[100px]">
            {col.items.map((customer) => (
              <div
                key={customer.id}
                draggable
                onDragStart={(e) => handleDragStart(e, customer.id)}
                className={cn(
                  'bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all',
                  draggingId === customer.id ? 'opacity-40 scale-95' : 'opacity-100',
                )}
              >
                <div className="flex justify-between items-start mb-2.5">
                  <Link
                    to={`/customers/${customer.id}`}
                    className="font-medium text-sm text-slate-900 hover:text-primary transition-colors line-clamp-1 flex-1 pr-2"
                  >
                    {customer.name || 'Lead sem nome'}
                  </Link>
                  <Badge
                    variant={customer.urgency >= 4 ? 'destructive' : 'secondary'}
                    className="text-[10px] px-1.5 h-4"
                  >
                    U-{customer.urgency || 0}
                  </Badge>
                </div>
                {(customer.phone || customer.email) && (
                  <div className="space-y-1.5 mt-2">
                    {customer.phone && (
                      <div className="flex items-center text-xs text-slate-500">
                        <Phone className="w-3 h-3 mr-1.5 text-slate-400" />
                        {customer.phone}
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center text-xs text-slate-500">
                        <Mail className="w-3 h-3 mr-1.5 text-slate-400" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {col.items.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-xs text-slate-400">
                Arraste leads para cá
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ListView({
  customers,
  updateStatus,
}: {
  customers: any[]
  updateStatus: (id: string, status: string) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[250px]">Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="w-[220px]">Status (Fase)</TableHead>
            <TableHead className="w-[100px]">Urgência</TableHead>
            <TableHead className="w-[120px]">Criado em</TableHead>
            <TableHead className="text-right w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const mappedStatus = PIPELINE_COLUMNS.some((p) => p.id === customer.status)
              ? customer.status
              : 'Captura + Identificação'
            return (
              <TableRow key={customer.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-900">
                  {customer.name || 'Lead sem nome'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    {customer.phone && (
                      <span className="flex items-center text-slate-600">
                        <Phone className="w-3 h-3 mr-1.5 text-slate-400" />
                        {customer.phone}
                      </span>
                    )}
                    {customer.email && (
                      <span className="flex items-center text-slate-600">
                        <Mail className="w-3 h-3 mr-1.5 text-slate-400" />
                        {customer.email}
                      </span>
                    )}
                    {!customer.phone && !customer.email && (
                      <span className="text-slate-400 italic">Sem contato</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={mappedStatus}
                    onValueChange={(val) => updateStatus(customer.id, val)}
                  >
                    <SelectTrigger className="w-full h-8 text-xs bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_COLUMNS.map((col) => (
                        <SelectItem key={col.id} value={col.id} className="text-xs">
                          {col.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={customer.urgency >= 4 ? 'destructive' : 'secondary'}
                    className="shadow-sm"
                  >
                    Nível {customer.urgency || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {format(new Date(customer.created), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild className="hover:bg-slate-100">
                    <Link to={`/customers/${customer.id}`}>
                      Detalhes
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
          {customers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-32 text-slate-500">
                Nenhum cliente encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function CustomersMain() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    try {
      const records = await pb.collection('customers').getFullList({
        sort: '-created',
      })
      setCustomers(records)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', (e) => {
    if (e.action === 'create') {
      setCustomers((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setCustomers((prev) => prev.map((c) => (c.id === e.record.id ? e.record : c)))
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    const previous = customers
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)))

    try {
      await pb.collection('customers').update(id, { status: newStatus })
      toast.success('Status atualizado com sucesso')
    } catch (error) {
      toast.error('Erro ao atualizar status')
      setCustomers(previous)
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search),
  )

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Gestão de Clientes</h2>
          <p className="text-slate-500 mt-1.5 text-sm">
            Acompanhe o funil de vendas e mova os leads através da Cadeia Evolutiva de 10 Passos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar leads..."
              className="pl-9 w-[280px] bg-white border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="mb-6 bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger
            value="pipeline"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <KanbanSquare className="w-4 h-4" />
            Pipeline Visual
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <List className="w-4 h-4" />
            Lista de Clientes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="m-0 focus-visible:outline-none">
          <PipelineBoard customers={filteredCustomers} updateStatus={updateStatus} />
        </TabsContent>
        <TabsContent value="list" className="m-0 focus-visible:outline-none">
          <ListView customers={filteredCustomers} updateStatus={updateStatus} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CustomerDetail() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      pb.collection('customers')
        .getOne(id)
        .then(setCustomer)
        .catch(() => toast.error('Erro ao carregar detalhes do cliente'))
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Cliente não encontrado.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/customers">Voltar para a lista</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <Button variant="ghost" asChild className="-ml-4 text-slate-500 hover:text-slate-900">
        <Link to="/customers">← Voltar para Gestão</Link>
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">{customer.name || 'Lead sem nome'}</h2>
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
            <span>
              Criado em {format(new Date(customer.created), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
            {customer.source && (
              <>
                <span>•</span>
                <span className="capitalize">Origem: {customer.source}</span>
              </>
            )}
          </div>
        </div>
        <Badge
          variant={customer.urgency >= 4 ? 'destructive' : 'secondary'}
          className="text-sm px-3 py-1"
        >
          Urgência Nível {customer.urgency || 0}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg">Dados Principais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Status (Fase Atual)
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                {customer.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Telefone
                </div>
                <div className="text-sm text-slate-900 font-medium">{customer.phone || '-'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Email
                </div>
                <div className="text-sm text-slate-900 font-medium break-all">
                  {customer.email || '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Bairro de Interesse
                </div>
                <div className="text-sm text-slate-900">{customer.neighborhood || '-'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Faixa de Preço
                </div>
                <div className="text-sm text-slate-900">{customer.price_range || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg">Anotações e Observações</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {customer.notes ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {customer.notes}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Nenhuma anotação registrada para este lead.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function Customers() {
  return (
    <Routes>
      <Route path="/" element={<CustomersMain />} />
      <Route path="/:id" element={<CustomerDetail />} />
    </Routes>
  )
}
