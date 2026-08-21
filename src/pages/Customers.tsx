import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLazyMount } from '@/hooks/use-lazy-mount'
import pb from '@/lib/pocketbase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Upload,
  RefreshCw,
  Mail,
  X,
  Users,
  Send,
  CheckCheck,
  Download,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ImportCustomersModal } from '@/components/email-marketing/ImportCustomersModal'
import { RemarketingSyncModal } from '@/components/customers/RemarketingSyncModal'
import { BulkEmailModal } from '@/components/customers/BulkEmailModal'
import { WhatsAppSendModal } from '@/components/customers/WhatsAppSendModal'
import { UnifiedKanban } from '@/components/customers/UnifiedKanban'
import { UnifiedTable } from '@/components/customers/UnifiedTable'
import { UnifiedStatisticsDashboard } from '@/components/customers/UnifiedStatisticsDashboard'
import { CustomerFilterBar } from '@/components/customers/CustomerFilterBar'
import { customerSelectionStore, useCustomerSelection } from '@/stores/customer-selection'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { fetchAllCustomerIds, fetchCustomersByIds } from '@/services/customers'
import { exportCustomersToCSV } from '@/lib/csv-export'
import {
  buildBaseFilter,
  combineFilters,
  escapeFilterValue,
  type CustomerFilterState,
} from '@/lib/customer-filters'

export default function Customers() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [neighborhood, setNeighborhood] = useState('')
  const [leadProfile, setLeadProfile] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [noSend, setNoSend] = useState(false)
  const [tags, setTags] = useState('')
  const [sort, setSort] = useState('-created')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [modalCustomers, setModalCustomers] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)

  const selectedIds = useCustomerSelection()
  const kanbanLazy = useLazyMount('200px')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const filters: CustomerFilterState = {
    search,
    source: sourceFilter,
    neighborhood,
    leadProfile,
    urgency: urgencyFilter,
    noSend,
    tags,
  }
  const baseFilter = buildBaseFilter(filters)
  const listFilter = combineFilters(
    baseFilter,
    statusFilter !== 'all' ? `status = "${escapeFilterValue(statusFilter)}"` : '',
  )

  const hasActiveFilters =
    !!searchInput ||
    statusFilter !== 'all' ||
    sourceFilter !== 'all' ||
    !!neighborhood.trim() ||
    leadProfile !== 'all' ||
    urgencyFilter !== 'all' ||
    noSend

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setSearch('')
    setStatusFilter('all')
    setSourceFilter('all')
    setNeighborhood('')
    setLeadProfile('all')
    setUrgencyFilter('all')
    setNoSend(false)
    setTags('')
  }, [])

  const handleUpdateStatus = useCallback(async (id: string, status: string) => {
    try {
      await pb.collection('customers').update(id, { status })
      toast.success('Lead movido com sucesso')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao mover lead')
      throw err
    }
  }, [])

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const handleSelectFirst50 = useCallback(async () => {
    try {
      const ids = await fetchAllCustomerIds(listFilter)
      customerSelectionStore.addMany(ids.slice(0, 50))
      toast.success(`${Math.min(50, ids.length)} clientes selecionados`)
    } catch {
      toast.error('Erro ao selecionar clientes')
    }
  }, [listFilter])

  const handleSelectAll = useCallback(async () => {
    try {
      const ids = await fetchAllCustomerIds(listFilter)
      customerSelectionStore.addMany(ids)
      toast.success(`${ids.length} clientes selecionados`)
    } catch {
      toast.error('Erro ao selecionar clientes')
    }
  }, [listFilter])

  const handleExportCSV = useCallback(async () => {
    setExporting(true)
    try {
      const records = await pb.collection('customers').getFullList({
        filter: listFilter || undefined,
        sort: '-created',
        fields:
          'id,name,first_name,phone,phone_1_value,email,email_1_value,status,urgency,source,neighborhood,last_sent_at,tags',
      })
      exportCustomersToCSV(records as any)
      toast.success(`${records.length} clientes exportados`)
    } catch {
      toast.error('Erro ao exportar CSV')
    } finally {
      setExporting(false)
    }
  }, [listFilter])

  const selectedCount = selectedIds.size
  const selectedIdArray = useMemo(() => Array.from(selectedIds), [selectedIds])

  const openModalWithSelected = useCallback(
    async (setter: (v: boolean) => void) => {
      try {
        const customers = await fetchCustomersByIds(selectedIdArray)
        setModalCustomers(customers)
        setter(true)
      } catch {
        toast.error('Erro ao carregar selecionados')
      }
    },
    [selectedIdArray],
  )

  return (
    <div className="flex flex-1 flex-col space-y-4 min-h-0">
      <RemarketingSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        selectedIds={selectedCount > 0 ? selectedIdArray : undefined}
      />
      <BulkEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => setIsBulkEmailModalOpen(false)}
        customers={modalCustomers}
      />
      <WhatsAppSendModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        customers={modalCustomers}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie leads no Pipeline Kanban e na lista em um único lugar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={handleSelectFirst50}>
            <Users className="h-4 w-4 mr-2" /> Selecionar 50
          </Button>
          <Button variant="outline" onClick={handleSelectAll}>
            <CheckCheck className="h-4 w-4 mr-2" /> Selecionar Todos
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" /> Importar Clientes
          </Button>
        </div>
      </div>

      <ErrorBoundary
        fallback={
          <div className="py-2 text-xs text-muted-foreground text-center">
            Estatísticas indisponíveis no momento.
          </div>
        }
      >
        <UnifiedStatisticsDashboard />
      </ErrorBoundary>

      <CustomerFilterBar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        neighborhood={neighborhood}
        onNeighborhoodChange={setNeighborhood}
        leadProfile={leadProfile}
        onLeadProfileChange={setLeadProfile}
        urgencyFilter={urgencyFilter}
        onUrgencyChange={setUrgencyFilter}
        noSend={noSend}
        onNoSendChange={setNoSend}
        tags={tags}
        onTagsChange={setTags}
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background shadow-sm px-4 py-3">
          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-sm font-semibold text-primary-foreground">
            {selectedCount}
          </span>
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'contato selecionado' : 'contatos selecionados'}
          </span>
          <div className="h-5 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={() => customerSelectionStore.clear()}>
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => openModalWithSelected(setIsBulkEmailModalOpen)}
          >
            <Mail className="h-4 w-4 mr-1" /> Email
          </Button>
          <Button size="sm" onClick={() => openModalWithSelected(setIsWhatsAppModalOpen)}>
            <Send className="h-4 w-4 mr-1" /> Enviar Mensagem
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsSyncModalOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-1" /> Remarketing
          </Button>
        </div>
      )}

      <Tabs defaultValue="pipeline" className="flex-1 flex flex-col min-h-0">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        <TabsContent
          value="pipeline"
          className="flex-1 mt-4 min-h-0 data-[state=active]:flex flex-col"
        >
          <div ref={kanbanLazy.ref} className="flex-1 min-h-0 flex flex-col">
            {kanbanLazy.visible ? (
              <ErrorBoundary
                fallback={
                  <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
                    Erro ao carregar o Pipeline Kanban. Recarregue a página.
                  </div>
                }
              >
                <UnifiedKanban
                  filters={filters}
                  refreshKey={refreshKey}
                  onUpdateStatus={handleUpdateStatus}
                />
              </ErrorBoundary>
            ) : (
              <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando pipeline...</span>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="list" className="flex-1 mt-4 min-h-0 data-[state=active]:flex flex-col">
          <ErrorBoundary
            fallback={
              <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
                Erro ao carregar a lista de clientes. Recarregue a página.
              </div>
            }
          >
            <UnifiedTable
              filter={listFilter}
              sort={sort}
              onSortChange={setSort}
              refreshKey={refreshKey}
            />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      <ImportCustomersModal
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
