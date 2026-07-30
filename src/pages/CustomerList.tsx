import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, X, Mail, Send, RefreshCw } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { format } from 'date-fns'
import { TableErrorState } from '@/components/customers/TableErrorState'
import { RemarketingSyncModal } from '@/components/customers/RemarketingSyncModal'
import { BulkEmailModal } from '@/components/customers/BulkEmailModal'
import { WhatsAppSendModal } from '@/components/customers/WhatsAppSendModal'
import { PaginationBar } from '@/components/customers/PaginationBar'
import { SortableTableHead } from '@/components/customers/SortableTableHead'
import { customerSelectionStore, useCustomerSelection } from '@/stores/customer-selection'

const PIPELINE_STAGES = [
  'D0 - Contato Imediato',
  'Contato Inicial',
  'D1 - Follow up 1',
  'Novo',
  'D2 - Follow up 2',
  'contact',
  'D3 - Follow up 3',
  'Qualificação',
  'D4 - Follow up 4',
  'Engajamento',
  'D5 - Follow up 5',
  'Demo Realiz.',
  'D6 - Follow up 6',
  'Visita',
  'D7 - Follow up 7',
  'D8 - Follow up 8',
  'Proposta',
  'D9 - Despedida/Nutrição',
  'Fechamento',
  'closed',
  'lead',
]

const SOURCE_OPTIONS = ['Villa dos Açores', 'Google Ads', 'Meta Ads', 'Instagram', 'Website']
const URGENCY_OPTIONS = [
  { label: 'Alta (7+)', value: 'urgency >= 7' },
  { label: 'Média (4-6)', value: 'urgency >= 4 && urgency <= 6' },
  { label: 'Baixa (1-3)', value: 'urgency >= 1 && urgency <= 3' },
  { label: 'Sem urgência', value: 'urgency = 0' },
]

export default function CustomerList() {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    items: customers,
    totalItems,
    totalPages,
    currentPage,
    perPage,
    sort,
    loading,
    error,
    retry,
    searchInput,
    search,
    setPage,
    setPerPage,
    toggleSort,
    setSearchInput,
    submitSearch,
    setFilter,
    clearFilters,
    refresh,
  } = usePaginatedList<any>({
    collection: 'customers',
    perPage: 20,
    initialSort: '-created',
    searchFields: ['name', 'phone', 'email', 'email_1_value', 'first_name', 'phone_1_value'],
  })

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const pageParam = searchParams.get('page')
    const urlPage = pageParam ? parseInt(pageParam, 10) : 1
    if (!isNaN(urlPage) && urlPage >= 1 && urlPage !== currentPage) {
      setPage(urlPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const pageParam = searchParams.get('page')
    const currentPageStr = String(currentPage)
    if ((pageParam || '1') !== currentPageStr) {
      const next = new URLSearchParams(searchParams)
      if (currentPage > 1) next.set('page', currentPageStr)
      else next.delete('page')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  useRealtime('customers', () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(refresh, 300)
  })

  const selectedIds = useCustomerSelection()
  const selectedCount = selectedIds.size
  const hasSelection = selectedCount > 0

  const visibleIds = useMemo(() => customers.map((c) => c.id), [customers])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected

  const handleSelectAll = useCallback(() => {
    if (allVisibleSelected) customerSelectionStore.removeMany(visibleIds)
    else customerSelectionStore.addMany(visibleIds)
  }, [allVisibleSelected, visibleIds])

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedIds.has(c.id)),
    [customers, selectedIds],
  )
  const selectedIdArray = useMemo(() => Array.from(selectedIds), [selectedIds])

  const hasActiveFilters =
    !!searchInput || statusFilter !== 'all' || sourceFilter !== 'all' || urgencyFilter !== 'all'

  const handleStatusChange = (v: string) => {
    setStatusFilter(v)
    setFilter('status', v === 'all' ? '' : `status = "${v}"`)
  }
  const handleSourceChange = (v: string) => {
    setSourceFilter(v)
    setFilter('source', v === 'all' ? '' : `source ~ "${v}"`)
  }
  const handleUrgencyChange = (v: string) => {
    setUrgencyFilter(v)
    setFilter('urgency', v === 'all' ? '' : v)
  }
  const handleClearFilters = () => {
    setStatusFilter('all')
    setSourceFilter('all')
    setUrgencyFilter('all')
    clearFilters()
  }

  return (
    <div className="p-6 space-y-6">
      <RemarketingSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        leads={customers}
        searchTerm={search}
        phaseFilter={statusFilter}
        sourceFilter={sourceFilter !== 'all' ? sourceFilter : ''}
        selectedIds={hasSelection ? selectedIdArray : undefined}
      />
      <BulkEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => setIsBulkEmailModalOpen(false)}
        customers={selectedCustomers}
      />
      <WhatsAppSendModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        customers={selectedCustomers}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lista de Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie e visualize todos os clientes com paginação server-side.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4">
          <CardTitle>Todos os Leads</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, tel, email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch()
                }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={handleSourceChange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={handleUrgencyChange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda Urgência</SelectItem>
                {URGENCY_OPTIONS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleClearFilters}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Limpar filtros
              </Button>
            </div>
          )}

          {hasSelection && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-2.5 mb-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-sm font-semibold text-primary-foreground">
                  {selectedCount}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {selectedCount === 1
                    ? '1 contato selecionado'
                    : `${selectedCount} contatos selecionados`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => customerSelectionStore.clear()}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Limpar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsBulkEmailModalOpen(true)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" /> Email
                </Button>
                <Button
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Send className="h-4 w-4" /> WhatsApp
                </Button>
                <Button onClick={() => setIsSyncModalOpen(true)} size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Remarketing
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px] pl-4">
                      <Checkbox
                        checked={
                          allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Selecionar todos da página"
                        disabled={loading || customers.length === 0}
                      />
                    </TableHead>
                    <SortableTableHead
                      label="Nome"
                      field="name"
                      currentSort={sort}
                      onToggleSort={toggleSort}
                    />
                    <TableHead>Contato</TableHead>
                    <SortableTableHead
                      label="Status"
                      field="status"
                      currentSort={sort}
                      onToggleSort={toggleSort}
                    />
                    <SortableTableHead
                      label="Origem"
                      field="source"
                      currentSort={sort}
                      onToggleSort={toggleSort}
                    />
                    <SortableTableHead
                      label="Bairro"
                      field="neighborhood"
                      currentSort={sort}
                      onToggleSort={toggleSort}
                    />
                    <SortableTableHead
                      label="Urgência"
                      field="urgency"
                      currentSort={sort}
                      onToggleSort={toggleSort}
                    />
                    <SortableTableHead
                      label="Último Envio"
                      field="last_sent_at"
                      currentSort={sort}
                      onToggleSort={toggleSort}
                    />
                    <SortableTableHead
                      label="Criado em"
                      field="created"
                      currentSort={sort}
                      onToggleSort={toggleSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: Math.min(perPage, 10) }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell className="pl-4">
                          <Skeleton className="h-5 w-5" />
                        </TableCell>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0">
                        <TableErrorState
                          message="Não foi possível carregar a lista de clientes."
                          onRetry={retry}
                          retrying={loading}
                        />
                      </TableCell>
                    </TableRow>
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => {
                      const isSelected = selectedIds.has(customer.id)
                      return (
                        <TableRow key={customer.id} className={isSelected ? 'bg-primary/5' : ''}>
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => customerSelectionStore.toggle(customer.id)}
                              aria-label={`Selecionar ${customer.name || customer.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {customer.name || customer.first_name || 'Sem nome'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="whitespace-nowrap">
                                {customer.phone || 'Sem telefone'}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {customer.email || '-'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="whitespace-nowrap">
                              {customer.status || 'Sem status'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {customer.source || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {customer.neighborhood || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {customer.urgency ?? '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {customer.last_sent_at
                              ? format(new Date(customer.last_sent_at), 'dd/MM/yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {customer.created
                              ? format(new Date(customer.created), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              disabled={loading}
              itemName="clientes"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
