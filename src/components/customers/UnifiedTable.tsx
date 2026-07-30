import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPhone } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import pb from '@/lib/pocketbase/client'
import { customerSelectionStore, useCustomerSelection } from '@/stores/customer-selection'
import { CustomerDetailDrawer } from './CustomerDetailDrawer'
import { PaginationBar } from './PaginationBar'
import { SortableTableHead } from './SortableTableHead'
import { TableErrorState } from './TableErrorState'
import { reportError } from '@/lib/error-reporter'

interface Props {
  filter: string
  sort: string
  onSortChange: (sort: string) => void
  refreshKey: number
}

const PAGE_SIZE = 20

function formatDateSafe(dateStr: string | undefined | null, fmt: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return format(d, fmt, { locale: ptBR })
  } catch {
    return '—'
  }
}

export function UnifiedTable({ filter, sort, onSortChange, refreshKey }: Props) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PAGE_SIZE)
  const [items, setItems] = useState<any[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const selectedIds = useCustomerSelection()
  const requestIdRef = useRef(0)
  const prevDepsRef = useRef({ filter, sort, perPage })

  useEffect(() => {
    const depsChanged =
      prevDepsRef.current.filter !== filter ||
      prevDepsRef.current.sort !== sort ||
      prevDepsRef.current.perPage !== perPage

    if (depsChanged) {
      prevDepsRef.current = { filter, sort, perPage }
      if (page !== 1) {
        setPage(1)
        return
      }
    }

    const rid = ++requestIdRef.current
    setLoading(true)
    if (retryKey > 0) setRetrying(true)
    ;(async () => {
      try {
        const result = await pb.collection('customers').getList(page, perPage, {
          filter: filter || undefined,
          sort,
        })
        if (rid !== requestIdRef.current) return
        setItems(result.items)
        setTotalItems(result.totalItems)
        setFetchError(false)
      } catch (err: any) {
        console.error('UnifiedTable fetch error:', err)
        if (rid === requestIdRef.current) {
          setItems([])
          setTotalItems(0)
          setFetchError(true)
          reportError({
            type: 'customers_list_error',
            message: err?.message || 'Failed to fetch customer list',
            details: {
              filter,
              sort,
              page,
              perPage,
              stack: err?.stack,
            },
          })
        }
      } finally {
        if (rid === requestIdRef.current) {
          setLoading(false)
          setRetrying(false)
        }
      }
    })()
  }, [filter, sort, page, perPage, refreshKey, retryKey])

  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const currentPage = Math.min(page, totalPages)

  const pageIds = useMemo(() => items.map((c) => c.id), [items])
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected

  const handleSelectAllPage = useCallback(() => {
    if (allPageSelected) customerSelectionStore.removeMany(pageIds)
    else customerSelectionStore.addMany(pageIds)
  }, [allPageSelected, pageIds])

  const handleToggle = useCallback((id: string) => {
    customerSelectionStore.toggle(id)
  }, [])

  const toggleSort = useCallback(
    (field: string) => {
      let next: string
      if (sort === field) next = `-${field}`
      else if (sort === `-${field}`) next = field
      else next = field
      onSortChange(next)
    },
    [sort, onSortChange],
  )

  const checkboxChecked = allPageSelected ? true : somePageSelected ? 'indeterminate' : false

  const handleRetryClick = useCallback(() => {
    setRetryKey((k) => k + 1)
  }, [])

  if (fetchError && !loading) {
    return (
      <>
        <div className="rounded-md border flex-1 flex flex-col">
          <TableErrorState onRetry={handleRetryClick} retrying={retrying} />
        </div>
        <CustomerDetailDrawer
          customerId={drawerId}
          open={!!drawerId}
          onOpenChange={(open) => !open && setDrawerId(null)}
        />
      </>
    )
  }

  return (
    <>
      <div className="rounded-md border flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[44px] pl-4">
                  <Checkbox
                    checked={checkboxChecked}
                    onCheckedChange={handleSelectAllPage}
                    aria-label="Selecionar página"
                  />
                </TableHead>
                <SortableTableHead
                  label="Nome"
                  field="name"
                  currentSort={sort}
                  onToggleSort={toggleSort}
                />
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <SortableTableHead
                  label="Origem"
                  field="source"
                  currentSort={sort}
                  onToggleSort={toggleSort}
                />
                <SortableTableHead
                  label="Status"
                  field="status"
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
                  <TableRow key={`sk-${i}`}>
                    <TableCell className="pl-4">
                      <Skeleton className="h-5 w-5" />
                    </TableCell>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((c) => {
                  const isSelected = selectedIds.has(c.id)
                  return (
                    <TableRow
                      key={c.id}
                      className={isSelected ? 'bg-primary/5 cursor-pointer' : 'cursor-pointer'}
                      onClick={() => setDrawerId(c.id)}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(c.id)}
                          aria-label={`Selecionar ${c.name || c.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {c.name || c.first_name || 'Sem nome'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.phone ? formatPhone(c.phone) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.email || c.email_1_value || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.source || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.status || 'Sem status'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateSafe(c.last_sent_at, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateSafe(c.created, 'dd/MM/yyyy')}
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
      <CustomerDetailDrawer
        customerId={drawerId}
        open={!!drawerId}
        onOpenChange={(open) => !open && setDrawerId(null)}
      />
    </>
  )
}
