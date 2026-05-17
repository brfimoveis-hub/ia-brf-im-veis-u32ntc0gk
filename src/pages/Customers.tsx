import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { getPaginatedCustomers, Customer, deleteCustomer } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'
import { Loader2, Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { CustomerDashboard } from '@/components/customers/CustomerDashboard'
import { CustomerTable } from '@/components/customers/CustomerTable'
import { LeadDialog } from '@/components/customers/LeadDialog'
import { useToast } from '@/hooks/use-toast'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const { toast } = useToast()
  const [allLeads, setAllLeads] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [error, setError] = useState(false)

  const fetchCustomers = async (
    currentPage: number,
    currentSearch: string,
    currentPhase: string,
  ) => {
    setLoading(true)
    try {
      const result = await getPaginatedCustomers(currentPage, 50, currentSearch, currentPhase)
      setCustomers(result.items)
      setTotalPages(result.totalPages)
      setTotalItems(result.totalItems)

      setAllLeads(result.items)
      setError(false)
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers(page, search, phaseFilter)
    }, 500)
    return () => clearTimeout(delayDebounce)
  }, [page, search, phaseFilter])

  useRealtime('customers', () => {
    fetchCustomers(page, search, phaseFilter)
  })

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id)
      toast({ title: 'Cliente excluído com sucesso' })
      fetchCustomers(page, search, phaseFilter)
    } catch (err) {
      toast({ title: 'Erro ao excluir cliente', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Base de Clientes</h2>
          <p className="text-muted-foreground">
            Gerenciamento de leads e contatos ({totalItems.toLocaleString('pt-BR')} registros).
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedCustomer(null)
            setIsDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Lead
        </Button>
      </div>

      <CustomerDashboard leads={allLeads} />

      <Card>
        <CardHeader>
          <CardTitle>Todos os Clientes</CardTitle>
          <CardDescription>Busque por nome, email ou telefone.</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <select
              className="flex h-10 w-full sm:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={phaseFilter}
              onChange={(e) => {
                setPhaseFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">Todas as Fases</option>
              <option value="lead">Lead</option>
              <option value="contact">Contato</option>
              <option value="closed">Fechado</option>
              <option value="Visita">Visita</option>
              <option value="Fechamento">Fechamento</option>
              <option value="Demo Realiz.">Demo Realiz.</option>
              <option value="Engajamento">Engajamento</option>
              <option value="Qualificação">Qualificação</option>
              <option value="Novo">Novo</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading && customers.length === 0 ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <CustomerTable
                leads={customers}
                loading={loading}
                error={error}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * 50 + 1} a {Math.min(page * 50, totalItems)} de{' '}
                  {totalItems}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm font-medium">
                    {page} / {totalPages || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || totalPages === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <LeadDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            fetchCustomers(page, search, phaseFilter)
          }
        }}
        defaultValues={selectedCustomer}
      />
    </div>
  )
}
