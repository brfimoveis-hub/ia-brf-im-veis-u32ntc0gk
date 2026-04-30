import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  Plus,
  Upload,
  Users,
  Filter,
  Loader2,
  Play,
  Target,
  Clock,
  LayoutGrid,
  List,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { CustomerTable } from '@/components/customers/CustomerTable'
import { CustomerKanban } from '@/components/customers/CustomerKanban'
import { CustomerDashboard } from '@/components/customers/CustomerDashboard'
import { useToast } from '@/hooks/use-toast'
import {
  getPaginatedCustomers,
  deleteCustomer,
  updateCustomer,
  Customer,
} from '@/services/customers'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useRealtime } from '@/hooks/use-realtime'
import { PHASES } from '@/components/customers/constants'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const GoogleContactsImportDialog = lazy(() =>
  import('@/components/customers/GoogleContactsImportDialog').then((m) => ({
    default: m.GoogleContactsImportDialog,
  })),
)
const LeadDialog = lazy(() =>
  import('@/components/customers/LeadDialog').then((m) => ({ default: m.LeadDialog })),
)
const CadenceRoulette = lazy(() =>
  import('@/components/CadenceRoulette').then((m) => ({ default: m.CadenceRoulette })),
)
const RemarketingSyncModal = lazy(() =>
  import('@/components/customers/RemarketingSyncModal').then((m) => ({
    default: m.RemarketingSyncModal,
  })),
)
const DeliverySettingsModal = lazy(() =>
  import('@/components/customers/DeliverySettingsModal').then((m) => ({
    default: m.DeliverySettingsModal,
  })),
)

export default function Customers() {
  const [leads, setLeads] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [debouncedSourceFilter, setDebouncedSourceFilter] = useState('')

  const [page, setPage] = useState(1)
  const perPage = 100
  const [hasMore, setHasMore] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  const [googleContactsOpen, setGoogleContactsOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [rouletteOpen, setRouletteOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [deliverySettingsOpen, setDeliverySettingsOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Customer | null>(null)
  const [view, setView] = useState<'list' | 'kanban' | 'dashboard'>('kanban')

  const { toast } = useToast()

  const observer = useRef<IntersectionObserver | null>(null)
  const lastElementRef = useCallback(
    (node: HTMLTableRowElement | null) => {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setDebouncedSourceFilter(sourceFilter)
    }, 500)
    return () => clearTimeout(timer)
  }, [search, sourceFilter])

  const [prevFilters, setPrevFilters] = useState({
    debouncedSearch,
    phaseFilter,
    debouncedSourceFilter,
  })

  useEffect(() => {
    if (
      prevFilters.debouncedSearch !== debouncedSearch ||
      prevFilters.phaseFilter !== phaseFilter ||
      prevFilters.debouncedSourceFilter !== debouncedSourceFilter
    ) {
      setPage(1)
      setLeads([])
      setPrevFilters({ debouncedSearch, phaseFilter, debouncedSourceFilter })
    }
  }, [debouncedSearch, phaseFilter, debouncedSourceFilter, prevFilters])

  const loadData = useCallback(
    async (currentPage: number, isLoadMore = false) => {
      try {
        if (isLoadMore) setLoadingMore(true)
        else setLoading(true)
        setError(false)
        const data = await getPaginatedCustomers(
          currentPage,
          perPage,
          debouncedSearch,
          phaseFilter,
          debouncedSourceFilter,
        )
        if (isLoadMore) {
          setLeads((prev) => {
            const newItems = data.items.filter((item) => !prev.some((p) => p.id === item.id))
            return [...prev, ...newItems]
          })
        } else {
          setLeads(data.items)
        }
        setTotalItems(data.totalItems)
        setHasMore(currentPage < data.totalPages)
      } catch {
        setError(true)
        if (!isLoadMore) toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [debouncedSearch, phaseFilter, debouncedSourceFilter, toast, perPage],
  )

  useEffect(() => {
    loadData(page, page > 1)
  }, [page, loadData])

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useRealtime('customers', (e) => {
    if (e.action === 'delete') {
      setLeads((prev) => prev.filter((c) => c.id !== e.record.id))
      setTotalItems((prev) => Math.max(0, prev - 1))
      return
    }

    if (e.action === 'update') {
      setLeads((prev) => prev.map((c) => (c.id === e.record.id ? (e.record as Customer) : c)))
      return
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        if (page === 1 && e.action === 'create') {
          const data = await getPaginatedCustomers(
            1,
            perPage,
            debouncedSearch,
            phaseFilter,
            debouncedSourceFilter,
          )
          setLeads(data.items)
          setTotalItems(data.totalItems)
        }
      } catch {
        // silent background refresh fail
      }
    }, 1000)
  })

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id)
      toast({ title: 'Lead removido' })
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.status === newStatus) return

    const oldStatus = lead.status
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)))

    try {
      await updateCustomer(id, { status: newStatus })
      toast({ title: `Status atualizado para ${newStatus}` })
    } catch (error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: oldStatus } : l)))
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] gap-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Base de Clientes
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus leads em uma lista contínua e fluida, sem se preocupar com páginas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setDeliverySettingsOpen(true)}
            className="gap-2 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20 border"
          >
            <Clock className="h-4 w-4" /> Horários de Envio
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSyncModalOpen(true)}
            className="gap-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20 border"
          >
            <Target className="h-4 w-4" /> Sincronizar Meta
          </Button>
          <Button
            variant="secondary"
            onClick={() => setRouletteOpen(true)}
            className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 border"
          >
            <Play className="h-4 w-4" /> Roleta Mágica
          </Button>
          <Button variant="default" onClick={() => setGoogleContactsOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Importar Contatos
          </Button>
          <Button
            onClick={() => {
              setEditingLead(null)
              setLeadOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 text-primary font-medium mb-1">
              <Users className="h-4 w-4" /> Total de Leads
            </div>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 text-green-600 font-medium mb-1">
              <Target className="h-4 w-4" /> Visitas & Fechamentos
            </div>
            <div className="text-2xl font-bold text-green-700">
              {
                leads.filter((l) => ['Visita', 'Fechamento', 'Demo Realiz.'].includes(l.status))
                  .length
              }
              <span className="text-sm font-normal text-green-600/70 ml-2">na visão atual</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 text-blue-600 font-medium mb-1">
              <TrendingUp className="h-4 w-4" /> Engajamento
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {leads.filter((l) => ['Engajamento', 'Qualificação'].includes(l.status)).length}
              <span className="text-sm font-normal text-blue-600/70 ml-2">na visão atual</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 shrink-0 justify-between">
        <div className="flex flex-1 gap-4 items-center">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {PHASES.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full max-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Origem (ex: Google Contacts)"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as any)}
          className="justify-end shrink-0 bg-card p-1 rounded-md border"
        >
          <ToggleGroupItem value="list" aria-label="Lista">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="Kanban">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="dashboard" aria-label="Dashboard">
            <BarChart3 className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm relative bg-transparent border-none sm:bg-card sm:border">
        <CardContent className="p-0 flex-1 overflow-hidden relative sm:p-0 h-full flex flex-col">
          <ErrorBoundary>
            {view === 'dashboard' ? (
              <div className="flex-1 overflow-auto bg-background">
                <CustomerDashboard leads={leads} />
              </div>
            ) : view === 'list' ? (
              <div className="flex-1 overflow-auto scroll-smooth">
                <CustomerTable
                  leads={leads}
                  loading={loading}
                  error={error}
                  lastElementRef={lastElementRef}
                  onEdit={(lead) => {
                    setEditingLead(lead)
                    setLeadOpen(true)
                  }}
                  onDelete={handleDelete}
                />
                {loadingMore && (
                  <div className="flex justify-center items-center p-4 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm animate-pulse">Carregando mais clientes...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 h-full overflow-hidden p-2 sm:p-4">
                <CustomerKanban
                  leads={leads}
                  onUpdateStatus={handleUpdateStatus}
                  onEdit={(lead) => {
                    setEditingLead(lead)
                    setLeadOpen(true)
                  }}
                />
              </div>
            )}
          </ErrorBoundary>
        </CardContent>
        <div className="border-t p-4 flex flex-col sm:flex-row items-center justify-between bg-muted/20 shrink-0 gap-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {leads.length} de {totalItems} clientes
          </div>
        </div>
      </Card>

      <Suspense fallback={null}>
        {googleContactsOpen && (
          <GoogleContactsImportDialog
            open={googleContactsOpen}
            onOpenChange={setGoogleContactsOpen}
            onSuccess={() => {
              setPage(1)
              setLeads([])
              loadData(1, false)
            }}
          />
        )}
        {leadOpen && (
          <LeadDialog open={leadOpen} onOpenChange={setLeadOpen} defaultValues={editingLead} />
        )}
        {syncModalOpen && (
          <RemarketingSyncModal
            isOpen={syncModalOpen}
            onClose={() => setSyncModalOpen(false)}
            searchTerm={debouncedSearch}
            phaseFilter={phaseFilter}
            sourceFilter={debouncedSourceFilter}
          />
        )}
        {deliverySettingsOpen && (
          <DeliverySettingsModal
            open={deliverySettingsOpen}
            onOpenChange={setDeliverySettingsOpen}
          />
        )}
      </Suspense>

      <Dialog open={rouletteOpen} onOpenChange={setRouletteOpen}>
        <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="h-[400px] w-full rounded-xl bg-background animate-pulse border border-border/50" />
              }
            >
              <CadenceRoulette
                search={debouncedSearch}
                phaseFilter={phaseFilter}
                sourceFilter={debouncedSourceFilter}
                onCustomerUpdated={(updated) => {
                  setLeads((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
                }}
              />
            </Suspense>
          </ErrorBoundary>
        </DialogContent>
      </Dialog>
    </div>
  )
}
