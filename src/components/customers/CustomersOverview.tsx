import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { PipelineBoard } from './PipelineBoard'
import { CustomerList } from './CustomerList'
import type { Customer } from '@/types/customer'

export function CustomersOverview() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    try {
      const res = await pb.collection('customers').getFullList<Customer>({ sort: '-created' })
      setCustomers(res)
    } catch (err) {
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', (e) => {
    if (e.action === 'create') {
      setCustomers((prev) =>
        prev.some((c) => c.id === e.record.id) ? prev : [e.record as unknown as Customer, ...prev],
      )
    } else if (e.action === 'update') {
      setCustomers((prev) =>
        prev.map((c) => (c.id === e.record.id ? (e.record as unknown as Customer) : c)),
      )
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const filtered = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Leads</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie seus contatos no funil de 10 passos da BIA.
          </p>
        </div>
      </div>
      <Tabs defaultValue="pipeline" className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline (Kanban)</TabsTrigger>
            <TabsTrigger value="list">Lista de Clientes</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou contato..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <TabsContent
              value="pipeline"
              className="flex-1 mt-6 h-full min-h-0 data-[state=active]:flex flex-col"
            >
              <PipelineBoard customers={filtered} setCustomers={setCustomers} />
            </TabsContent>
            <TabsContent
              value="list"
              className="flex-1 mt-6 h-full min-h-0 data-[state=active]:flex flex-col"
            >
              <CustomerList customers={filtered} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
