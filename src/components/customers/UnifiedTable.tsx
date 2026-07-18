import { useEffect, useMemo, useState, useCallback } from 'react'
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
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatPhone } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { customerSelectionStore, useCustomerSelection } from '@/stores/customer-selection'
import { CustomerDetailDrawer } from './CustomerDetailDrawer'

const PAGE_SIZE = 25

interface Props {
  customers: any[]
}

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

export function UnifiedTable({ customers }: Props) {
  const [page, setPage] = useState(1)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const selectedIds = useCustomerSelection()

  useEffect(() => {
    setPage(1)
  }, [customers])

  useEffect(() => {
    setDrawerId(null)
  }, [customers])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(customers.length / PAGE_SIZE)),
    [customers.length],
  )

  const currentPage = useMemo(() => Math.min(page, totalPages), [page, totalPages])

  const pageItems = useMemo(
    () => customers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [customers, currentPage],
  )

  const pageIds = useMemo(() => pageItems.map((c) => c.id), [pageItems])

  const allPageSelected = useMemo(
    () => pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id)),
    [pageIds, selectedIds],
  )

  const somePageSelected = useMemo(
    () => pageIds.some((id) => selectedIds.has(id)) && !allPageSelected,
    [pageIds, selectedIds, allPageSelected],
  )

  const handleSelectAllPage = useCallback(() => {
    if (allPageSelected) customerSelectionStore.removeMany(pageIds)
    else customerSelectionStore.addMany(pageIds)
  }, [allPageSelected, pageIds])

  const handleToggle = useCallback((id: string) => {
    customerSelectionStore.toggle(id)
  }, [])

  const handleCloseDrawer = useCallback((open: boolean) => {
    if (!open) setDrawerId(null)
  }, [])

  const handleRowClick = useCallback((id: string) => {
    setDrawerId(id)
  }, [])

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1))
  }, [totalPages])

  const checkboxChecked = allPageSelected ? true : somePageSelected ? 'indeterminate' : false

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
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Envio</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow key="empty-row">
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((c) => {
                  const isSelected = selectedIds.has(c.id)
                  return (
                    <TableRow
                      key={c.id}
                      className={isSelected ? 'bg-primary/5 cursor-pointer' : 'cursor-pointer'}
                      onClick={() => handleRowClick(c.id)}
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
        <div className="flex items-center justify-between border-t px-4 py-2 bg-background">
          <span className="text-xs text-muted-foreground">
            {customers.length} clientes • Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <CustomerDetailDrawer
        customerId={drawerId}
        open={!!drawerId}
        onOpenChange={handleCloseDrawer}
      />
    </>
  )
}
