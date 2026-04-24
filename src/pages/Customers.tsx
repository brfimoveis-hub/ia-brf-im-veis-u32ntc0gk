import { useState, useEffect, useRef, useCallback } from 'react'
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
  ChevronLeft,
  ChevronRight,
  MoreHorizontal as Ellipsis,
} from 'lucide-react'
import { lazy, Suspense } from 'react'
import { CustomerTable } from '@/components/customers/CustomerTable'
import { useToast } from '@/hooks/use-toast'
import { getPaginatedCustomers, deleteCustomer, Customer } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'
import { PHASES } from '@/components/customers/constants'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Play } from 'lucide-react'
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

export default function Customers() {
  const [leads, setLeads] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [debouncedSourceFilter, setDebouncedSourceFilter] = useState('')

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [googleContactsOpen, setGoogleContactsOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [rouletteOpen, setRouletteOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Customer | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))

  const { toast } = useToast()

  const handleNextPage = useCallback(() => {
    setPage((p) => (p < totalPages ? p + 1 : 1))
  }, [totalPages])

  const handlePrevPage = useCallback(() => {
    setPage((p) => (p > 1 ? p - 1 : totalPages))
  }, [totalPages])

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
      setPrevFilters({ debouncedSearch, phaseFilter, debouncedSourceFilter })
    }
  }, [debouncedSearch, phaseFilter, debouncedSourceFilter, prevFilters])

  const loadData = useCallback(
    async (currentPage: number, currentPerPage: number) => {
      try {
        setLoading(true)
        setError(false)
        const data = await getPaginatedCustomers(
          currentPage,
          currentPerPage,
          debouncedSearch,
          phaseFilter,
          debouncedSourceFilter,
        )
        setLeads(data.items)
        setTotalItems(data.totalItems)
      } catch {
        setError(true)
        toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    },
    [debouncedSearch, phaseFilter, debouncedSourceFilter, toast],
  )

  useEffect(() => {
    loadData(page, perPage)
  }, [page, perPage, loadData])

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  useRealtime('customers', () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await getPaginatedCustomers(
          page,
          perPage,
          debouncedSearch,
          phaseFilter,
          debouncedSourceFilter,
        )
        setLeads(data.items)
        setTotalItems(data.totalItems)
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

  const renderPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <Button
            key={i}
            variant={page === i ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(i)}
            disabled={loading}
          >
            {i}
          </Button>,
        )
      }
    } else {
      let startPage = Math.max(1, page - 1)
      let endPage = Math.min(totalPages, page + 1)

      if (page === 1) {
        endPage = 3
      } else if (page === totalPages) {
        startPage = totalPages - 2
      }

      if (startPage > 1) {
        pages.push(
          <Button
            key={1}
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(1)}
            disabled={loading}
          >
            1
          </Button>,
        )
        if (startPage > 2) {
          pages.push(
            <div
              key="e1"
              className="h-8 w-8 flex items-center justify-center text-muted-foreground"
            >
              <Ellipsis className="h-4 w-4" />
            </div>,
          )
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <Button
            key={i}
            variant={page === i ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(i)}
            disabled={loading}
          >
            {i}
          </Button>,
        )
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push(
            <div
              key="e2"
              className="h-8 w-8 flex items-center justify-center text-muted-foreground"
            >
              <Ellipsis className="h-4 w-4" />
            </div>,
          )
        }
        pages.push(
          <Button
            key={totalPages}
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(totalPages)}
            disabled={loading}
          >
            {totalPages}
          </Button>,
        )
      }
    }

    return pages
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] gap-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Base de Clientes
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus leads e contatos importados do Google Contacts de forma otimizada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <div className="flex flex-col sm:flex-row gap-4 shrink-0">
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

      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm relative">
        <CardContent className="p-0 flex-1 overflow-x-auto relative scroll-smooth">
          <ErrorBoundary>
            <CustomerTable
              leads={leads}
              loading={loading}
              error={error}
              onEdit={(lead) => {
                setEditingLead(lead)
                setLeadOpen(true)
              }}
              onDelete={handleDelete}
            />
          </ErrorBoundary>
        </CardContent>
        <div className="border-t p-4 flex flex-col sm:flex-row items-center justify-between bg-muted/20 shrink-0 gap-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {totalItems === 0 ? 0 : (page - 1) * perPage + 1} -{' '}
            {Math.min(page * perPage, totalItems)} de {totalItems} clientes
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Itens por página
              </span>
              <Select
                value={perPage.toString()}
                onValueChange={(v) => {
                  setPerPage(Number(v))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[12, 50, 100].map((v) => (
                    <SelectItem key={v} value={v.toString()}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-sm font-medium">
                {renderPageNumbers()}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
              loadData(1, perPage)
            }}
          />
        )}
        {leadOpen && (
          <LeadDialog open={leadOpen} onOpenChange={setLeadOpen} defaultValues={editingLead} />
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
