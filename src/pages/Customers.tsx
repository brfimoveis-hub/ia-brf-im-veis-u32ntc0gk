import { useState, useEffect, useRef, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { cn, formatPhone } from '@/lib/utils'
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Flame,
  Loader2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const ACTIVE_10_STEPS = [
  'D0 - Contato Imediato',
  'D1 - Follow up 1',
  'D2 - Follow up 2',
  'D3 - Follow up 3',
  'D4 - Follow up 4',
  'D5 - Follow up 5',
  'D6 - Follow up 6',
  'D7 - Follow up 7',
  'D8 - Follow up 8',
]

const INACTIVE_STEPS = ['D9 - Despedida/Nutrição', 'Fechamento', 'closed', 'Fechamento e Pós-Venda']

export default function CustomersPage() {
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const records = await pb.collection('customers').getFullList({
        sort: '-created',
      })
      setCustomers(records)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
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

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!search) return true
      const s = search.toLowerCase()
      return (
        c.name?.toLowerCase().includes(s) ||
        c.first_name?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.includes(search)
      )
    })
  }, [customers, search])

  const handleDrop = async (customerId: string, newStatus: string) => {
    const originalCustomer = customers.find((c) => c.id === customerId)
    if (!originalCustomer || originalCustomer.status === newStatus) return

    setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, status: newStatus } : c)))

    try {
      await pb.collection('customers').update(customerId, { status: newStatus })
      toast({ title: 'Status atualizado com sucesso' })
    } catch (err) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, status: originalCustomer.status } : c)),
      )
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4 max-w-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clientes</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-[400px]">
            <TabsList className="bg-slate-200/50">
              <TabsTrigger value="pipeline" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <ListIcon className="h-4 w-4" />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 w-full sm:w-auto">
          {view === 'pipeline' && (
            <div className="flex items-center space-x-2 mr-4 bg-white px-3 py-1.5 rounded-md border shadow-sm">
              <Switch
                id="active-only"
                checked={showActiveOnly}
                onCheckedChange={setShowActiveOnly}
              />
              <Label
                htmlFor="active-only"
                className="cursor-pointer text-sm text-slate-700 font-medium"
              >
                Apenas Ativos
              </Label>
            </div>
          )}
          <div className="relative w-full sm:max-w-xs shadow-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar clientes..."
              className="pl-9 bg-white border-slate-200 focus-visible:ring-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex h-full items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : view === 'pipeline' ? (
          <PipelineView
            customers={filteredCustomers}
            showActiveOnly={showActiveOnly}
            onDrop={handleDrop}
          />
        ) : (
          <ListView customers={filteredCustomers} />
        )}
      </div>
    </div>
  )
}

function PipelineView({
  customers,
  showActiveOnly,
  onDrop,
}: {
  customers: any[]
  showActiveOnly: boolean
  onDrop: (id: string, s: string) => void
}) {
  const columns = useMemo(() => {
    if (showActiveOnly) return ACTIVE_10_STEPS

    const presentStatuses = Array.from(new Set(customers.map((c) => c.status).filter(Boolean)))
    const allKnown = [...ACTIVE_10_STEPS, ...INACTIVE_STEPS]
    const others = presentStatuses.filter((s) => !allKnown.includes(s))

    return [...ACTIVE_10_STEPS, ...others, ...INACTIVE_STEPS]
  }, [showActiveOnly, customers])

  return (
    <ScrollArea className="h-full w-full rounded-xl border bg-slate-100/50 p-4 shadow-inner">
      <div className="flex gap-4 h-full min-h-[500px]">
        {columns.map((status) => (
          <PipelineColumn key={status} status={status} customers={customers} onDrop={onDrop} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function PipelineColumn({
  status,
  customers,
  onDrop,
}: {
  status: string
  customers: any[]
  onDrop: (id: string, s: string) => void
}) {
  const columnCustomers = useMemo(
    () => customers.filter((c) => c.status === status),
    [customers, status],
  )

  const [limit, setLimit] = useState(20)
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLimit((prev) => Math.min(prev + 20, columnCustomers.length))
        }
      },
      { threshold: 0.1 },
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [columnCustomers.length])

  const visibleCustomers = columnCustomers.slice(0, limit)

  return (
    <div
      className="flex flex-col w-[300px] shrink-0 bg-slate-200/40 rounded-xl border border-slate-200 shadow-sm h-full"
      onDragOver={(e) => {
        e.preventDefault()
        e.currentTarget.classList.add('bg-slate-300/50')
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove('bg-slate-300/50')
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.currentTarget.classList.remove('bg-slate-300/50')
        const id = e.dataTransfer.getData('customerId')
        if (id) {
          onDrop(id, status)
        }
      }}
    >
      <div className="p-3 bg-white/60 backdrop-blur border-b border-slate-200/60 flex items-center justify-between sticky top-0 z-10 rounded-t-xl">
        <h3 className="font-semibold text-sm text-slate-700 truncate pr-2">
          {status || 'Sem Status'}
        </h3>
        <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600">
          {columnCustomers.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 relative">
        {visibleCustomers.map((c) => (
          <PipelineCard key={c.id} customer={c} />
        ))}
        {limit < columnCustomers.length && (
          <div ref={observerTarget} className="h-10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        )}
        {columnCustomers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 font-medium">
            Solte para mover
          </div>
        )}
      </div>
    </div>
  )
}

function PipelineCard({ customer }: { customer: any }) {
  return (
    <Card
      className="cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors shadow-sm"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('customerId', customer.id)
        e.dataTransfer.effectAllowed = 'move'
        setTimeout(() => {
          ;(e.target as HTMLElement).classList.add('opacity-50')
        }, 0)
      }}
      onDragEnd={(e) => {
        ;(e.target as HTMLElement).classList.remove('opacity-50')
      }}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-sm leading-tight text-slate-800 line-clamp-2">
            {customer.name || customer.first_name || 'Sem nome'}
          </div>
          {customer.urgency && (
            <Badge
              variant="outline"
              className={cn(
                'px-1.5 py-0 h-5 text-[10px] gap-1 shrink-0 font-bold',
                customer.urgency >= 4
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : customer.urgency === 3
                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : 'bg-blue-50 text-blue-600 border-blue-200',
              )}
            >
              <Flame className="h-3 w-3" />
              {customer.urgency}
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-1 text-xs text-slate-500">
          {customer.source && (
            <div className="flex items-center gap-1.5 truncate">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 shrink-0" />
              <span className="truncate">{customer.source}</span>
            </div>
          )}
          {customer.neighborhood && (
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{customer.neighborhood}</span>
            </div>
          )}
          {customer.price_range && (
            <div className="flex items-center gap-1.5 truncate">
              <DollarSign className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{customer.price_range}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ListView({ customers }: { customers: any[] }) {
  return (
    <div className="rounded-xl border bg-white flex-1 flex flex-col overflow-hidden shadow-sm h-full">
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-slate-50/60">
            <TableRow>
              <TableHead className="font-semibold">Nome</TableHead>
              <TableHead className="font-semibold">Contato</TableHead>
              <TableHead className="font-semibold">Status / Pipeline</TableHead>
              <TableHead className="font-semibold">Origem</TableHead>
              <TableHead className="font-semibold text-center">Urgência</TableHead>
              <TableHead className="font-semibold">Bairro / Preço</TableHead>
              <TableHead className="text-right font-semibold">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id} className="hover:bg-slate-50">
                <TableCell className="font-medium text-slate-800">
                  {c.name || c.first_name || 'Sem nome'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm text-slate-600">
                    {c.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" />{' '}
                        {typeof formatPhone === 'function' ? formatPhone(c.phone) : c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-slate-400" /> {c.email}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium">
                    {c.status || 'Sem status'}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">{c.source || '-'}</TableCell>
                <TableCell className="text-center">
                  {c.urgency ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        'px-1.5 py-0 h-5 text-[10px] gap-1 font-bold inline-flex items-center',
                        c.urgency >= 4
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : c.urgency === 3
                            ? 'bg-orange-50 text-orange-600 border-orange-200'
                            : 'bg-blue-50 text-blue-600 border-blue-200',
                      )}
                    >
                      {c.urgency}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-slate-500 text-sm">
                  <div className="flex flex-col gap-1">
                    {c.neighborhood ? (
                      <span className="truncate max-w-[150px]" title={c.neighborhood}>
                        {c.neighborhood}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                    {c.price_range && (
                      <span className="text-xs text-slate-400">{c.price_range}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-slate-500 text-sm">
                  {new Date(c.created).toLocaleDateString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                  Nenhum cliente encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
