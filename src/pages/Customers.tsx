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
import { getPaginatedCustomers, Customer } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { CustomerDashboard } from '@/components/customers/CustomerDashboard'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allLeads, setAllLeads] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [phaseFilter, setPhaseFilter] = useState('all')

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
    } catch (err) {
      console.error(err)
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Base de Clientes</h2>
        <p className="text-muted-foreground">
          Gerenciamento de leads e contatos ({totalItems.toLocaleString('pt-BR')} registros).
        </p>
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum cliente encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      customers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            {c.name || c.first_name || 'Sem nome'}
                          </TableCell>
                          <TableCell>{c.email || c.email_1_value || '-'}</TableCell>
                          <TableCell>{c.phone || c.phone_1_value || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{c.status || 'Novo'}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(c.created).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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
    </div>
  )
}
