import { useState, useEffect } from 'react'
import { getCustomers, type Customer } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'
import { CustomerDetailDrawer } from '@/components/customers/CustomerDetailDrawer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Clock, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUSES = [
  'Novo',
  'lead',
  'contact',
  'Qualificação',
  'Engajamento',
  'Visita',
  'Demo Realiz.',
  'Fechamento',
  'closed',
]

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadData = async () => {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (e) {
      console.error(e)
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

  const filtered = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const grouped = STATUSES.reduce(
    (acc, status) => {
      acc[status] = filtered.filter(
        (c) =>
          c.status === status ||
          (status === 'Novo' && (!c.status || c.status === 'Base de Clientes/Novo LYD')),
      )
      return acc
    },
    {} as Record<string, Customer[]>,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes CRM</h1>
          <p className="text-muted-foreground">
            Gerencie seus leads e acompanhe o pipeline de vendas.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
        {STATUSES.map((status) => (
          <div key={status} className="flex-shrink-0 w-80 snap-start flex flex-col gap-3">
            <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md">
              <h3 className="font-semibold text-sm truncate">{status}</h3>
              <Badge variant="secondary">{grouped[status]?.length || 0}</Badge>
            </div>

            <div className="flex-1 space-y-3 min-h-[200px]">
              {grouped[status]?.map((customer) => (
                <Card
                  key={customer.id}
                  className={cn(
                    'cursor-pointer hover:border-primary transition-colors',
                    customer.is_blocked && 'opacity-60',
                  )}
                  onClick={() => {
                    setSelectedCustomerId(customer.id)
                    setDrawerOpen(true)
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-sm leading-tight truncate">
                        {customer.name || 'Sem nome'}
                      </div>
                      {customer.is_blocked && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                          Bloq
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {customer.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />{' '}
                        {new Date(customer.updated).toLocaleDateString()}
                      </div>
                    </div>
                    {customer.tags && customer.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {customer.tags.slice(0, 2).map((t, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4 font-normal"
                          >
                            {t}
                          </Badge>
                        ))}
                        {customer.tags.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{customer.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {grouped[status]?.length === 0 && (
                <div className="h-24 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum lead
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
