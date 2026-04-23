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
import { Search, Plus, Upload, Users, Loader2, Filter } from 'lucide-react'
import { GoogleContactsImportDialog } from '@/components/customers/GoogleContactsImportDialog'
import { LeadDialog } from '@/components/customers/LeadDialog'
import { CustomerTable } from '@/components/customers/CustomerTable'
import { useToast } from '@/hooks/use-toast'
import { getPaginatedCustomers, deleteCustomer, Customer } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'
import { PHASES } from '@/components/customers/constants'

export default function Customers() {
  const [leads, setLeads] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [debouncedSourceFilter, setDebouncedSourceFilter] = useState('')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  const [googleContactsOpen, setGoogleContactsOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Customer | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setDebouncedSourceFilter(sourceFilter)
    }, 500)
    return () => clearTimeout(timer)
  }, [search, sourceFilter])

  const loadData = useCallback(
    async (currentPage: number, isLoadMore = false) => {
      try {
        if (isLoadMore) {
          setLoadingMore(true)
        } else {
          setLoading(true)
        }
        setError(false)
        const data = await getPaginatedCustomers(
          currentPage,
          50,
          debouncedSearch,
          phaseFilter,
          debouncedSourceFilter,
        )

        if (isLoadMore) {
          setLeads((prev) => {
            const existingIds = new Set(prev.map((l) => l.id))
            const newItems = data.items.filter((l) => !existingIds.has(l.id))
            return [...prev, ...newItems]
          })
        } else {
          setLeads(data.items)
        }

        setHasMore(data.page < data.totalPages)
        setTotalItems(data.totalItems)
      } catch {
        setError(true)
        toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
      } finally {
        if (isLoadMore) {
          setLoadingMore(false)
        } else {
          setLoading(false)
        }
      }
    },
    [debouncedSearch, phaseFilter, debouncedSourceFilter, toast],
  )

  useEffect(() => {
    setPage(1)
    loadData(1, false)
  }, [debouncedSearch, phaseFilter, debouncedSourceFilter, loadData])

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadData(nextPage, true)
    }
  }, [loading, loadingMore, hasMore, page, loadData])

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  useRealtime('customers', () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await getPaginatedCustomers(
          1,
          page * 50,
          debouncedSearch,
          phaseFilter,
          debouncedSourceFilter,
        )
        setLeads(data.items)
        setTotalItems(data.totalItems)
        setHasMore(data.items.length < data.totalItems)
      } catch {
        // silent background refresh fail
      }
    }, 1000)
  })

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id)
      toast({ title: 'Lead removido' })
      // The realtime hook will refresh the list automatically
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
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
            Gerencie seus leads e contatos importados do Google Contacts de forma otimizada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm">
        <CardContent className="p-0 flex-1 overflow-x-auto relative scroll-smooth">
          <CustomerTable
            leads={leads}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            error={error}
            onEdit={(lead) => {
              setEditingLead(lead)
              setLeadOpen(true)
            }}
            onDelete={handleDelete}
            onLoadMore={handleLoadMore}
          />
        </CardContent>
        <div className="border-t p-3 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="text-sm text-muted-foreground">
            Mostrando {leads.length} de {totalItems} clientes
          </div>
        </div>
      </Card>

      {googleContactsOpen && (
        <GoogleContactsImportDialog
          open={googleContactsOpen}
          onOpenChange={setGoogleContactsOpen}
          onSuccess={() => {
            setPage(1)
            loadData(1, false)
          }}
        />
      )}
      {leadOpen && (
        <LeadDialog open={leadOpen} onOpenChange={setLeadOpen} defaultValues={editingLead} />
      )}
    </div>
  )
}
