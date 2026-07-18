import { useState, useEffect, useMemo, useRef } from 'react'
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
import { Search, Loader2, RefreshCw, X, Mail, Users, Send } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'
import { RemarketingSyncModal } from '@/components/customers/RemarketingSyncModal'
import { BulkEmailModal } from '@/components/customers/BulkEmailModal'
import { WhatsAppSendModal } from '@/components/customers/WhatsAppSendModal'
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
  'D9 - Despedida/Nutricao',
]

export default function CustomerList() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)

  const selectedIds = useCustomerSelection()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = async () => {
    try {
      const records = await pb.collection('customers').getFullList({ sort: '-created' })
      setCustomers(records)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  useRealtime('customers', () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(loadData, 300)
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
    if (allVisibleSelected) customerSelectionStore.removeMany(visibleIds)
    else customerSelectionStore.addMany(visibleIds)
  }

  const handleSelectFirst50 = () => {
    customerSelectionStore.addMany(filteredCustomers.slice(0, 50).map((c) => c.id))
  }

  const selectedCount = selectedIds.size
  const hasSelection = selectedCount > 0
  const selectedIdArray = useMemo(() => Array.from(selectedIds), [selectedIds])
  const selectedCustomers = filteredCustomers.filter((c) => selectedIds.has(c.id))

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
          Gerencie e visualize todos os clientes de forma tabular.
        </p>
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
                  onClick={handleSelectFirst50}
                >
                  <Users className="mr-1 h-3.5 w-3.5" /> Selecionar 50
                </Button>
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
                  <TableHead>Último Envio</TableHead>
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
                            onCheckedChange={() => customerSelectionStore.toggle(customer.id)}
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
                        <TableCell className="text-muted-foreground">
                          {customer.last_sent_at
                            ? format(new Date(customer.last_sent_at), 'dd/MM/yyyy')
                            : '—'}
                        </TableCell>
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
