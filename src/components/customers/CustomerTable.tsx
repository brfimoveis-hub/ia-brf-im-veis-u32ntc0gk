import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { MoreHorizontal, Edit, Trash2, RefreshCw, X, Mail } from 'lucide-react'
import { Customer } from '@/services/customers'
import { PHASES } from './constants'
import { cn, formatPhone } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSearchParams } from 'react-router-dom'
import { RemarketingSyncModal } from './RemarketingSyncModal'
import { BulkEmailModal } from './BulkEmailModal'
import { useState, useMemo } from 'react'
import { CustomerDetailDrawer } from './CustomerDetailDrawer'
import { customerSelectionStore, useCustomerSelection } from '@/stores/customer-selection'
import pb from '@/lib/pocketbase/client'

const COLUMNS = [
  { key: 'name', label: 'Nome' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'E-mail' },
  { key: 'last_sent_at', label: 'Último Envio' },
]

interface CustomerTableProps {
  leads: Customer[]
  loading: boolean
  error: boolean
  onEdit: (lead: Customer) => void
  onDelete: (id: string) => void
  lastElementRef?: (node: HTMLTableRowElement | null) => void
}

export function CustomerTable({
  leads,
  loading,
  error,
  onEdit,
  onDelete,
  lastElementRef,
}: CustomerTableProps) {
  const [searchParams] = useSearchParams()
  const searchTerm = searchParams.get('search') || searchParams.get('q') || ''
  const phaseFilter = searchParams.get('phase') || searchParams.get('status') || ''
  const hasFilter = !!searchTerm || !!phaseFilter || Array.from(searchParams.keys()).length > 0
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectAllLoading, setSelectAllLoading] = useState(false)

  const selectedIds = useCustomerSelection()

  const visibleIds = useMemo(() => leads.map((l) => l.id), [leads])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected

  const handleSelectAll = async () => {
    if (allVisibleSelected) {
      customerSelectionStore.removeMany(visibleIds)
      return
    }

    setSelectAllLoading(true)
    try {
      const filters: string[] = []
      if (searchTerm) {
        const safeSearch = searchTerm.replace(/"/g, '\\"')
        filters.push(
          `(name ~ "${safeSearch}" || email ~ "${safeSearch}" || phone ~ "${safeSearch}" || first_name ~ "${safeSearch}" || email_1_value ~ "${safeSearch}" || phone_1_value ~ "${safeSearch}")`,
        )
      }
      if (phaseFilter && phaseFilter !== 'all') {
        const safePhase = phaseFilter.replace(/"/g, '\\"')
        filters.push(`status = "${safePhase}"`)
      }
      const sourceFilterVal = searchParams.get('source') || ''
      if (sourceFilterVal) {
        const safeSource = sourceFilterVal.replace(/"/g, '\\"')
        filters.push(`source ~ "${safeSource}"`)
      }
      const filterString = filters.join(' && ')
      const allRecords = await pb.collection('customers').getFullList({ filter: filterString })
      customerSelectionStore.addMany(allRecords.map((r) => r.id))
    } catch (err) {
      customerSelectionStore.addMany(visibleIds)
    } finally {
      setSelectAllLoading(false)
    }
  }

  const handleToggleRow = (id: string) => {
    customerSelectionStore.toggle(id)
  }

  const selectedCount = selectedIds.size
  const hasSelection = selectedCount > 0
  const selectedIdArray = useMemo(() => Array.from(selectedIds), [selectedIds])

  return (
    <div className="space-y-4">
      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        open={!!selectedCustomerId}
        onOpenChange={(open) => !open && setSelectedCustomerId(null)}
      />
      <RemarketingSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        leads={leads}
        searchTerm={searchTerm}
        phaseFilter={phaseFilter}
        selectedIds={hasSelection ? selectedIdArray : undefined}
      />
      <BulkEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => setIsBulkEmailModalOpen(false)}
        customers={leads.filter((l) => selectedIds.has(l.id))}
      />

      {hasSelection && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-2.5 animate-fade-in">
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
              <Mail className="h-4 w-4" /> Enviar Email
            </Button>
            <Button onClick={() => setIsSyncModalOpen(true)} size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Sincronizar Remarketing
            </Button>
          </div>
        </div>
      )}

      {!hasSelection && leads.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => setIsSyncModalOpen(true)}
            variant="outline"
            className="gap-2"
            disabled
            title="Selecione ao menos um contato"
          >
            <RefreshCw className="h-4 w-4" /> Sincronizar Remarketing
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table className="w-full">
          <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[44px] pl-4">
                <Checkbox
                  checked={
                    allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecionar todos"
                  disabled={loading || leads.length === 0 || selectAllLoading}
                />
              </TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Fase/Status</TableHead>
              {COLUMNS.map((col) => (
                <TableHead key={col.key} className="whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-[50px] sticky right-0 bg-muted"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 15 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={COLUMNS.length + 3} className="py-3">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length + 3}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead, index) => {
                const phase = PHASES.find(
                  (p) =>
                    p.id === lead.status ||
                    p.title === lead.status ||
                    (p.aliases && p.aliases.includes(lead.status)),
                )
                const isLast = index === leads.length - 1
                const isSelected = selectedIds.has(lead.id)
                return (
                  <TableRow
                    key={lead.id}
                    ref={isLast ? lastElementRef : null}
                    className={cn(
                      'group hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-primary/5',
                    )}
                  >
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleRow(lead.id)}
                        aria-label={`Selecionar ${lead.name || lead.id}`}
                      />
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap cursor-pointer"
                      onClick={() => setSelectedCustomerId(lead.id)}
                    >
                      <div className="flex items-center gap-2">
                        {(lead.status === 'Lead Novo' ||
                          lead.status === 'Base de Clientes/Novo LYD' ||
                          lead.status === '') && (
                          <span className="relative flex h-2.5 w-2.5" title="Novo Lead">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                          </span>
                        )}
                        <Badge
                          variant="secondary"
                          className={cn('text-white', phase?.color || 'bg-slate-500')}
                        >
                          {phase?.title || 'Desconhecido'}
                        </Badge>
                      </div>
                    </TableCell>
                    {COLUMNS.map((col) => {
                      if (col.key === 'tags') {
                        return (
                          <TableCell
                            key={col.key}
                            className="whitespace-nowrap cursor-pointer"
                            onClick={() => setSelectedCustomerId(lead.id)}
                          >
                            <div className="flex gap-1">
                              {(lead.tags || []).map((t: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        )
                      }
                      let val = (lead as any)[col.key]

                      if (col.key === 'email') {
                        val = lead.email || '—'
                      } else if (col.key === 'phone') {
                        val = lead.phone ? formatPhone(lead.phone) : '—'
                      } else if (col.key === 'name') {
                        val = lead.name && lead.name.trim() !== '' ? lead.name : 'Sem nome'
                      } else if (col.key === 'last_sent_at') {
                        val = lead.last_sent_at
                          ? format(new Date(lead.last_sent_at), 'dd/MM/yyyy', { locale: ptBR })
                          : '—'
                      }

                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            'whitespace-nowrap text-sm text-muted-foreground cursor-pointer',
                            col.key === 'name' && 'font-medium text-foreground',
                          )}
                          onClick={() => setSelectedCustomerId(lead.id)}
                        >
                          {val}
                        </TableCell>
                      )
                    })}
                    <TableCell
                      className="sticky right-0 bg-background group-hover:bg-muted/50 border-l transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(lead)}>
                            <Edit className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(lead.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
