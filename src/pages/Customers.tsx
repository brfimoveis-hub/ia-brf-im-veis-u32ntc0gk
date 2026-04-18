import { useState, useEffect, useRef } from 'react'
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Search, Plus, Upload, Users, Loader2, Filter } from 'lucide-react'
import { CsvImportDialog } from '@/components/customers/CsvImportDialog'
import { ZapVivaImportDialog } from '@/components/customers/ZapVivaImportDialog'
import { LeadDialog } from '@/components/customers/LeadDialog'
import { CustomerTable } from '@/components/customers/CustomerTable'
import { useToast } from '@/hooks/use-toast'
import {
  getPaginatedCustomers,
  deleteCustomer,
  createCustomer,
  Customer,
} from '@/services/customers'
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
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [csvOpen, setCsvOpen] = useState(false)
  const [zapVivaOpen, setZapVivaOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [editingLead, setEditingLead] = useState<Customer | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setDebouncedSourceFilter(sourceFilter)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search, sourceFilter])

  useEffect(() => {
    setPage(1)
  }, [phaseFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const data = await getPaginatedCustomers(
        page,
        50,
        debouncedSearch,
        phaseFilter,
        debouncedSourceFilter,
      )
      setLeads(data.items)
      setTotalPages(data.totalPages)
      setTotalItems(data.totalItems)
    } catch {
      setError(true)
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, debouncedSearch, phaseFilter, debouncedSourceFilter])

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  useRealtime('customers', () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      loadData()
    }, 1000)
  })

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id)
      toast({ title: 'Lead removido' })
      loadData()
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleImport = async (newLeads: any[]) => {
    setImporting(true)
    setImportProgress({ current: 0, total: newLeads.length })
    let successCount = 0
    let processedCount = 0
    const batchSize = 50
    for (let i = 0; i < newLeads.length; i += batchSize) {
      const batch = newLeads.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (lead) => {
          try {
            const nameParts = [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean)
            const fullName = nameParts.length > 0 ? nameParts.join(' ') : 'Contato Sem Nome'
            let tags: string[] = []
            if (lead.tags) {
              tags =
                typeof lead.tags === 'string' ? lead.tags.split(' ::: ').filter(Boolean) : lead.tags
            } else {
              tags = ['Importado']
            }
            let status = '1'
            const possiblePhaseTitle = tags.find((t: string) =>
              PHASES.some((p) => p.title.toLowerCase() === t.toLowerCase()),
            )
            if (possiblePhaseTitle) {
              const matchedPhase = PHASES.find(
                (p) => p.title.toLowerCase() === possiblePhaseTitle.toLowerCase(),
              )
              if (matchedPhase) status = matchedPhase.id.toString()
            }
            await createCustomer({
              ...lead,
              name: lead.name || fullName,
              email: lead.email_1_value || lead.email,
              phone: lead.phone_1_value || lead.phone,
              status,
              tags,
            })
            successCount++
          } catch {
            // silent fail
          } finally {
            processedCount++
          }
        }),
      )
      setImportProgress({ current: processedCount, total: newLeads.length })
    }
    setImporting(false)
    setCsvOpen(false)
    toast({
      title: successCount > 0 ? `${successCount} contatos importados!` : 'Falha na importação',
      variant: successCount > 0 ? 'default' : 'destructive',
    })
    loadData()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] gap-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Base de Clientes
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus leads e contatos importados de forma otimizada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={() => setZapVivaOpen(true)}
            disabled={importing}
            className="gap-2"
          >
            <Upload className="h-4 w-4" /> Importar Leads (CSV/JSON)
          </Button>
          <Button
            variant="outline"
            onClick={() => setCsvOpen(true)}
            disabled={importing}
            className="gap-2"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importing ? 'Importando...' : 'Importar Google Contacts'}
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
            placeholder="Origem (ex: Zap/Viva)"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm">
        <CardContent className="p-0 flex-1 overflow-x-auto relative">
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
        </CardContent>
        <div className="border-t p-3 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="text-sm text-muted-foreground">
            Mostrando página {page} de {totalPages || 1} ({totalItems} total)
          </div>
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={
                    page === totalPages || totalPages === 0
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Card>

      {csvOpen && (
        <CsvImportDialog
          open={csvOpen}
          onOpenChange={setCsvOpen}
          onImport={handleImport}
          isImporting={importing}
          progress={importProgress}
        />
      )}
      {zapVivaOpen && (
        <ZapVivaImportDialog
          open={zapVivaOpen}
          onOpenChange={setZapVivaOpen}
          onSuccess={loadData}
        />
      )}
      {leadOpen && (
        <LeadDialog open={leadOpen} onOpenChange={setLeadOpen} defaultValues={editingLead} />
      )}
    </div>
  )
}
