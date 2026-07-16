import { useState, useEffect, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Loader2, RefreshCw, X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'
import { RemarketingSyncModal } from '@/components/customers/RemarketingSyncModal'
import { customerSelectionStore, useCustomerSelection } from '@/stores/customer-selection'

const PIPELINE_STAGES = [
  'D0 - Contato Imediato',
  'D1 - Follow up 1',
  'D2 - Follow up 2',
  'D3 - Follow up 3',
  'D4 - Follow up 4',
  'D5 - Follow up 5',
  'D6 - Follow up 6',
  'D7 - Follow up 7',
  'D8 - Follow up 8',
  'D9 - Despedida/Nutrição',
]

export default function CustomerList() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)

  const selectedIds = useCustomerSelection()

  const loadData = async () => {
    try {
      const records = await pb.collection('customers').getFullList({
        sort: '-created',
      })
      setCustomers(records)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', (e) => {
    if (e.action === 'create') {
      setCustomers((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setCustomers((prev) => prev.map((c) => (c.id === e.record.id ? e.record : c)))
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm)

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [customers, searchTerm, statusFilter])

  const visibleIds = useMemo(() => filteredCustomers.map((c) => c.id), [filteredCustomers])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      customerSelectionStore.removeMany(visibleIds)
    } else {
      customerSelectionStore.addMany(visibleIds)
    }
  }

  const handleToggleRow = (id: string) => {
    customerSelectionStore.toggle(id)
  }

  const selectedCount = selectedIds.size
  const hasSelection = selectedCount > 0
  const selectedIdArray = useMemo(() => Array.from(selectedIds), [selectedIds])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <RemarketingSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        leads={filteredCustomers}
        searchTerm={searchTerm}
        phaseFilter={statusFilter}
        selectedIds={hasSelection ? selectedIdArray : undefined}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lista de Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie e visualize todos os clientes de forma tabular.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4">
          <CardTitle>Todos os Leads</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou tel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Filtrar por status" />
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
          </div>
        </CardHeader>
        <CardContent>
          {hasSelection && (
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-2.5 mb-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-sm font-semibold text-primary-foreground">
                  {selectedCount}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {selectedCount === 1
                    ? '1 lead selecionado'
                    : `${selectedCount} leads selecionados`}
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
              <Button onClick={() => setIsSyncModalOpen(true)} size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Sincronizar Remarketing
              </Button>
            </div>
          )}

          {!hasSelection && filteredCustomers.length > 0 && (
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setIsSyncModalOpen(true)}
                variant="outline"
                className="gap-2"
                disabled
                title="Selecione ao menos um lead"
              >
                <RefreshCw className="h-4 w-4" /> Sincronizar Remarketing
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px] pl-4">
                    <Checkbox
                      checked={
                        allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todos"
                      disabled={loading || filteredCustomers.length === 0}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Faixa de Preço</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    const isSelected = selectedIds.has(customer.id)
                    return (
                      <TableRow key={customer.id} className={isSelected ? 'bg-primary/5' : ''}>
                        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleRow(customer.id)}
                            aria-label={`Selecionar ${customer.name || customer.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {customer.name || customer.first_name || 'Sem nome'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>{customer.phone || 'Sem telefone'}</span>
                            <span className="text-muted-foreground text-xs">
                              {customer.email || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{customer.status || 'Sem status'}</Badge>
                        </TableCell>
                        <TableCell>{customer.source || '-'}</TableCell>
                        <TableCell>{customer.neighborhood || '-'}</TableCell>
                        <TableCell>{customer.price_range || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  )
}
