import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { Plus, Search, Flame, User, MessageSquare } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

const STATUS_MAP = [
  { value: 'Novo', label: '1. Captura (Novo)' },
  { value: 'contact', label: '2. Contato' },
  { value: 'Qualificação', label: '3. Mapeamento (Qualificação)' },
  { value: 'Engajamento', label: '4. Nutrição (Engajamento)' },
  { value: 'Demo Realiz.', label: '5. Agendamento' },
  { value: 'Visita', label: '6 e 7. Visita' },
  { value: 'Proposta', label: '8. Proposta' },
  { value: 'Fechamento', label: '9. Documentação (Fechamento)' },
  { value: 'closed', label: '10. Pós-venda (Closed)' },
]

function CustomerDetail() {
  const { id } = useParams()
  const { toast } = useToast()
  const [customer, setCustomer] = useState<any>(null)
  const [status, setStatus] = useState<string>('')

  const loadData = async () => {
    if (!id) return
    try {
      const data = await pb.collection('customers').getOne(id)
      setCustomer(data)
      setStatus(data.status || 'Novo')
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('customers', (e) => {
    if (e.action === 'update' && e.record.id === id) {
      setCustomer(e.record)
      setStatus(e.record.status)
    }
  })

  const updateStatus = async (newStatus: string) => {
    setStatus(newStatus)
    try {
      await pb.collection('customers').update(id!, { status: newStatus })
      toast({
        title: 'Status Atualizado',
        description: 'O lead foi movido na cadência e a IA já possui o novo contexto.',
      })
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      })
    }
  }

  if (!customer)
    return <div className="p-8 text-muted-foreground animate-pulse">Carregando lead...</div>

  return (
    <div className="flex flex-col h-full bg-background animate-fade-in">
      <div className="p-6 border-b flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{customer.name || customer.phone}</h2>
          <p className="text-muted-foreground">{customer.email || 'Sem email'}</p>
        </div>
        <div className="w-full md:w-[280px]">
          <label className="text-xs text-muted-foreground mb-1.5 font-medium block">
            Estágio da Cadência (10 Passos)
          </label>
          <Select value={status} onValueChange={updateStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estágio..." />
            </SelectTrigger>
            <SelectContent>
              {STATUS_MAP.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Dados Principais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{customer.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Origem do Lead</p>
              <p className="font-medium capitalize">{customer.source || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                <Flame className="w-4 h-4 text-orange-500" /> Urgência (Nível)
              </p>
              <Badge variant={customer.urgency >= 4 ? 'destructive' : 'secondary'}>
                Nível {customer.urgency || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Notas e Interesses (IA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 border p-4 rounded-md min-h-[160px] whitespace-pre-wrap text-sm">
              {customer.notes || 'Nenhuma nota de qualificação registrada pela IA ainda.'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CustomerList() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const records = await pb.collection('customers').getList(1, 100, {
        sort: '-created',
      })
      setCustomers(records.items)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useRealtime('customers', () => load())

  const filtered = customers.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search),
  )

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Base de Leads</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Novo Lead
        </Button>
      </div>

      <div className="mb-6 max-w-md relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((c) => (
          <Link key={c.id} to={`/customers/${c.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold truncate pr-2">{c.name || 'Sem Nome'}</h3>
                  {c.urgency >= 4 && <Flame className="w-4 h-4 text-orange-500 shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{c.phone}</p>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {STATUS_MAP.find((s) => s.value === c.status)?.label || c.status || 'Novo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">
            Nenhum lead encontrado para esta busca.
          </div>
        )}
      </div>
    </div>
  )
}

export default function Customers() {
  return (
    <Routes>
      <Route path="/" element={<CustomerList />} />
      <Route path="/:id" element={<CustomerDetail />} />
    </Routes>
  )
}
