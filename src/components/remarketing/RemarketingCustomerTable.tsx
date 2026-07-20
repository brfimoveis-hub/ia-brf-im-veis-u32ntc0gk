import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, ChevronLeft, ChevronRight, Loader2, CheckCheck, X } from 'lucide-react'
import { CUSTOMER_STATUSES } from '@/services/remarketing'
import { formatPhone } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const LEAD_PROFILES = ['Investidor', 'Morador', 'Primeiro Imóvel', 'Veranista']
const PAGE_SIZE = 50

interface RemarketingCustomerTableProps {
  selectedIds: Set<string>
  onToggleId: (id: string) => void
  onSelectPage: (ids: string[], select: boolean) => void
  onSelectAllFiltered: (ids: string[]) => void
  onClearSelection: () => void
}

export function RemarketingCustomerTable({
  selectedIds,
  onToggleId,
  onSelectPage,
  onSelectAllFiltered,
  onClearSelection,
}: RemarketingCustomerTableProps) {
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [leadProfileFilter, setLeadProfileFilter] = useState('all')
  const [selectingAll, setSelectingAll] = useState(false)

  const buildFilter = useCallback(() => {
    const parts: string[] = []
    if (search.trim()) {
      const safe = search.trim().replace(/"/g, '\\"')
      parts.push(
        `(name ~ "${safe}" || phone ~ "${safe}" || first_name ~ "${safe}" || email ~ "${safe}" || phone_1_value ~ "${safe}" || email_1_value ~ "${safe}")`,
      )
    }
    if (statusFilter !== 'all') {
      parts.push(`status = "${statusFilter.replace(/"/g, '\\"')}"`)
    }
    if (leadProfileFilter !== 'all') {
      parts.push(`lead_profile = "${leadProfileFilter.replace(/"/g, '\\"')}"`)
    }
    return parts.join(' && ')
  }, [search, statusFilter, leadProfileFilter])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await pb.collection('customers').getList(page, PAGE_SIZE, {
        filter: buildFilter(),
        sort: 'name',
      })
      setItems(result.items)
      setTotalPages(result.totalPages)
      setTotalItems(result.totalItems)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [page, buildFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('customers', () => loadData())

  const resetPage = () => setPage(1)

  const handleSelectAllFiltered = async () => {
    setSelectingAll(true)
    try {
      const all = await pb.collection('customers').getFullList({ filter: buildFilter() })
      onSelectAllFiltered(all.map((r: any) => r.id))
    } catch {
      /* ignore */
    } finally {
      setSelectingAll(false)
    }
  }

  const pageIds = items.map((i) => i.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              resetPage()
            }}
            className="flex-1"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            resetPage()
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {CUSTOMER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={leadProfileFilter}
          onValueChange={(v) => {
            setLeadProfileFilter(v)
            resetPage()
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            {LEAD_PROFILES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {selectedIds.size > 0 ? (
            <>
              <Badge variant="default">{selectedIds.size} selecionado(s)</Badge>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearSelection}>
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            </>
          ) : (
            <span className="text-muted-foreground">{totalItems} clientes</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAllFiltered}
          disabled={selectingAll || totalItems === 0}
        >
          {selectingAll ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4 mr-2" />
          )}
          Selecionar todos ({totalItems})
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[44px] pl-4">
                <Checkbox
                  checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                  onCheckedChange={() => onSelectPage(pageIds, !allPageSelected)}
                  disabled={loading}
                  aria-label="Selecionar página"
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Último Envio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7} className="py-3">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => {
                const isSelected = selectedIds.has(c.id)
                const hasContact =
                  !!(c.email_1_value || c.email || '').trim() ||
                  !!(c.phone_1_value || c.phone || '').trim()
                return (
                  <TableRow key={c.id} className={isSelected ? 'bg-primary/5' : ''}>
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleId(c.id)}
                        disabled={!hasContact}
                        aria-label={`Selecionar ${c.name || c.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.name || c.first_name || 'Sem nome'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.phone ? formatPhone(c.phone) : c.phone_1_value || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email || c.email_1_value || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.status || 'Sem status'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.lead_profile || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.last_sent_at
                        ? format(new Date(c.last_sent_at), 'dd/MM/yyyy', { locale: ptBR })
                        : '—'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {totalItems} clientes • Página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
