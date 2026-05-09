import React, { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from 'react'
import { getPaginatedCustomers, updateCustomer, type Customer } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'
import { Loader2, Ban, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { PHASES } from '@/components/customers/constants'
import { CustomerDetailDrawer } from '@/components/customers/CustomerDetailDrawer'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { LeadOriginsDashboard } from '@/components/LeadOriginsDashboard'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

const GoogleContactsImportDialog = lazy(() =>
  import('@/components/customers/GoogleContactsImportDialog').then((m) => ({
    default: m.GoogleContactsImportDialog,
  })),
)

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const perPage = 200
  const { toast } = useToast()

  const observer = useRef<IntersectionObserver | null>(null)
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return
      if (observer.current) observer.current.disconnect()
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1)
        }
      })
      if (node) observer.current.observe(node)
    },
    [loading, loadingMore, hasMore],
  )

  const loadData = async (currentPage: number) => {
    try {
      if (currentPage === 1) setLoading(true)
      else setLoadingMore(true)

      const data = await getPaginatedCustomers(currentPage, perPage, '', 'all', '')

      if (currentPage === 1) {
        setCustomers(data.items)
      } else {
        setCustomers((prev) => {
          const newItems = data.items.filter((item) => !prev.some((p) => p.id === item.id))
          return [...prev, ...newItems]
        })
      }
      setHasMore(currentPage < data.totalPages)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadData(page)
  }, [page])

  useRealtime('customers', (e) => {
    if (e.action === 'create') {
      setCustomers((prev) => {
        if (prev.some((c) => c.id === e.record.id)) return prev
        return [e.record as unknown as Customer, ...prev]
      })
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
        toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
        loadData(1)
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
      const status = c.status || 'Base de Clientes/Novo LYD'
      let col = columns.find((col) => col.toLowerCase() === status.toLowerCase())
      if (!col && status.toLowerCase() === 'lead novo') {
        col = columns.find((col) => col.toLowerCase() === 'base de clientes/novo lyd')
      }
      if (col) {
        grouped[col].push(c)
      } else {
        grouped[columns[0]].push(c)
      }
    })
    return grouped
  }, [customers, columns])

  const isNewLead = (created: string) => {
    const diff = new Date().getTime() - new Date(created).getTime()
    return diff < 24 * 60 * 60 * 1000
  }

  if (loading && page === 1) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-4 pt-2 animate-fade-in-up">
      <LeadOriginsDashboard />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CRM Pipeline</h2>
          <p className="text-muted-foreground">
            Acompanhe o status e histórico de conversas dos seus leads arrastando os cards.
          </p>
        </div>
        <Button
          onClick={() => setImportOpen(true)}
          className="gap-2 shrink-0 shadow-sm hover:shadow-md transition-all"
        >
          <Upload className="h-4 w-4" /> Importar Contatos (CSV/VCF)
        </Button>
      </div>

      <ScrollArea className="flex-1 w-full whitespace-nowrap rounded-lg border bg-card shadow-sm">
        <div className="flex gap-4 p-4 h-[calc(100vh-14rem)] items-start">
          {columns.map((col, index) => {
            const isFirstColumn = index === 0
            return (
              <div
                key={col}
                className="flex flex-col w-80 bg-muted/40 rounded-xl p-3 shrink-0 h-full border border-border/50 shadow-inner"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full shadow-sm ${getPhaseColor(col)}`} />
                    <h3 className="font-semibold text-sm truncate max-w-[200px] text-foreground/90">
                      {col}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-xs shadow-sm bg-background border">
                    {customersByStatus[col].length}
                  </Badge>
                </div>

                <ScrollArea className="flex-1 pr-3">
                  <div className="flex flex-col gap-2.5 pb-2">
                    {customersByStatus[col].map((customer) => (
                      <Card
                        key={customer.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, customer.id)}
                        onClick={() => {
                          setSelectedCustomerId(customer.id)
                          setIsDrawerOpen(true)
                        }}
                        className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md shadow-sm select-none group bg-background"
                      >
                        <CardContent className="p-3.5">
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              {isFirstColumn && isNewLead(customer.created) && (
                                <div
                                  className="w-2 h-2 rounded-full bg-green-500 shrink-0 shadow-sm animate-pulse"
                                  title="Novo LYD (últimas 24h)"
                                />
                              )}
                              <p
                                className="font-semibold text-sm truncate group-hover:text-primary transition-colors"
                                title={customer.name}
                              >
                                {customer.name || 'Sem nome'}
                              </p>
                            </div>
                            {customer.is_blocked && (
                              <Ban
                                className="h-4 w-4 text-destructive shrink-0"
                                title="Bloqueado"
                              />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mb-3 font-medium">
                            {customer.phone
                              ? formatPhoneLocal(customer.phone)
                              : customer.email || 'Sem contato'}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4 font-medium max-w-[120px] truncate bg-secondary/40 text-secondary-foreground border-transparent"
                            >
                              {customer.source || 'Orgânico'}
                            </Badge>
                            <span className="font-medium text-foreground/60">
                              {format(new Date(customer.created), 'dd/MM')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {customersByStatus[col].length === 0 && (
                      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-xl bg-background/50">
                        Arraste leads para cá
                      </div>
                    )}
                    {isFirstColumn && hasMore && (
                      <div
                        ref={lastElementRef}
                        className="h-8 w-full flex items-center justify-center pt-2 pb-4"
                      >
                        {loadingMore && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-2.5" />
      </ScrollArea>

      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />

      <Suspense fallback={null}>
        {importOpen && (
          <GoogleContactsImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            onSuccess={() => {
              setPage(1)
              loadData(1)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
