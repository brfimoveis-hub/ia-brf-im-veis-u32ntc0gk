import { useEffect, useState, useMemo } from 'react'
import { getCustomers, updateCustomer, type Customer } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'
import { Loader2, Ban } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { PHASES } from '@/components/customers/constants'
import { CustomerDetailDrawer } from '@/components/customers/CustomerDetailDrawer'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const formatPhoneLocal = (phone: string) => {
  const cleaned = ('' + phone).replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`
  } else if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}`
  }
  return phone
}

export default function Index() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const loadData = async () => {
    try {
      const data = await getCustomers('created >= "2024-04-28 00:00:00"')
      setCustomers(data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', (e) => {
    if (e.action === 'create') {
      if (new Date(e.record.created) >= new Date('2024-04-28 00:00:00')) {
        setCustomers((prev) => [e.record as unknown as Customer, ...prev])
      }
    } else if (e.action === 'update') {
      setCustomers((prev) =>
        prev.map((c) => (c.id === e.record.id ? (e.record as unknown as Customer) : c)),
      )
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const handleDragStart = (e: React.DragEvent, customerId: string) => {
    e.dataTransfer.setData('customerId', customerId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const customerId = e.dataTransfer.getData('customerId')
    if (!customerId) return

    const customer = customers.find((c) => c.id === customerId)
    if (customer && customer.status !== newStatus) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, status: newStatus } : c)),
      )
      try {
        await updateCustomer(customerId, { status: newStatus })
      } catch (error) {
        console.error('Failed to update status', error)
        loadData()
      }
    }
  }

  const getPhaseColor = (title: string) => {
    const phase = PHASES.find((p) => p.title.toLowerCase() === title.toLowerCase())
    return phase ? phase.color : 'bg-slate-500'
  }

  const columns = PHASES.map((p) => p.title)

  const customersByStatus = useMemo(() => {
    const grouped: Record<string, Customer[]> = {}
    columns.forEach((col) => (grouped[col] = []))

    customers.forEach((c) => {
      const status = c.status || 'Lead Novo'
      const col = columns.find((col) => col.toLowerCase() === status.toLowerCase())
      if (col) {
        grouped[col].push(c)
      } else {
        grouped[columns[0]].push(c)
      }
    })
    return grouped
  }, [customers, columns])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-4 pt-2">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">CRM Pipeline</h2>
        <p className="text-muted-foreground">
          Acompanhe o status e histórico de conversas dos seus leads arrastando os cards.
        </p>
      </div>

      <ScrollArea className="flex-1 w-full whitespace-nowrap rounded-lg border bg-card">
        <div className="flex gap-4 p-4 h-[calc(100vh-14rem)] items-start">
          {columns.map((col) => (
            <div
              key={col}
              className="flex flex-col w-80 bg-muted/40 rounded-xl p-3 shrink-0 h-full"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getPhaseColor(col)}`} />
                  <h3 className="font-semibold text-sm">{col}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {customersByStatus[col].length}
                </Badge>
              </div>

              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-2 pb-2 pr-3">
                  {customersByStatus[col].map((customer) => (
                    <Card
                      key={customer.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, customer.id)}
                      onClick={() => {
                        setSelectedCustomerId(customer.id)
                        setIsDrawerOpen(true)
                      }}
                      className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm select-none"
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <p className="font-medium text-sm truncate" title={customer.name}>
                            {customer.name || 'Sem nome'}
                          </p>
                          {customer.is_blocked && (
                            <Ban className="h-4 w-4 text-destructive shrink-0" title="Bloqueado" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">
                          {customer.phone
                            ? formatPhoneLocal(customer.phone)
                            : customer.email || 'Sem contato'}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-normal">
                            {customer.source || 'Orgânico'}
                          </Badge>
                          <span>{format(new Date(customer.created), 'dd/MM/yyyy')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {customersByStatus[col].length === 0 && (
                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-lg">
                      Arraste leads para cá
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  )
}
