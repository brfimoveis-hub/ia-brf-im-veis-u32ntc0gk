import { useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Upload, RefreshCw, Mail, X, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ImportCustomersModal } from '@/components/email-marketing/ImportCustomersModal'
import { RemarketingSyncModal } from '@/components/customers/RemarketingSyncModal'
import { BulkEmailModal } from '@/components/customers/BulkEmailModal'
import { UnifiedKanban } from '@/components/customers/UnifiedKanban'
import { UnifiedTable } from '@/components/customers/UnifiedTable'
import { customerSelectionStore, useCustomerSelection } from '@/stores/customer-selection'

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false)

  const selectedIds = useCustomerSelection()

  const loadData = async () => {
    try {
      const records = await pb.collection('customers').getFullList({ sort: '-created' })
      setCustomers(records)
    } catch (err) {
      console.error(err)
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
      setCustomers((prev) => (prev.some((c) => c.id === e.record.id) ? prev : [e.record, ...prev]))
    } else if (e.action === 'update') {
      setCustomers((prev) => {
        const exists = prev.some((c) => c.id === e.record.id)
        return exists ? prev.map((c) => (c.id === e.record.id ? e.record : c)) : [e.record, ...prev]
      })
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return customers
    return customers.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.email_1_value || '').toLowerCase().includes(q),
    )
  }, [customers, search])

  const handleUpdateStatus = async (id: string, status: string) => {
    const prev = customers
    setCustomers((arr) => arr.map((c) => (c.id === id ? { ...c, status } : c)))
    try {
      await pb.collection('customers').update(id, { status })
      toast.success('Lead movido com sucesso')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao mover lead')
      setCustomers(prev)
    }
  }

  const handleSelectFirst50 = () => {
    customerSelectionStore.addMany(filtered.slice(0, 50).map((c) => c.id))
    toast.success('Primeiros 50 leads selecionados')
  }

  const selectedCount = selectedIds.size
  const selectedIdArray = useMemo(() => Array.from(selectedIds), [selectedIds])
  const selectedCustomers = useMemo(
    () => filtered.filter((c) => selectedIds.has(c.id)),
    [filtered, selectedIds],
  )

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col space-y-4">
      <RemarketingSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        selectedIds={selectedCount > 0 ? selectedIdArray : undefined}
      />
      <BulkEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => setIsBulkEmailModalOpen(false)}
        customers={selectedCustomers}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie leads no pipeline e na lista em um único lugar.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowImport(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importar Clientes
        </Button>
      </div>

      <Tabs defaultValue="pipeline" className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline (Kanban)</TabsTrigger>
            <TabsTrigger value="list">Lista de Clientes</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <TabsContent
          value="pipeline"
          className="flex-1 mt-4 min-h-0 data-[state=active]:flex flex-col"
        >
          <UnifiedKanban customers={filtered} onUpdateStatus={handleUpdateStatus} />
        </TabsContent>

        <TabsContent value="list" className="flex-1 mt-4 min-h-0 data-[state=active]:flex flex-col">
          <UnifiedTable customers={filtered} />
        </TabsContent>
      </Tabs>

      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-background shadow-2xl px-4 py-3 animate-fade-in-up">
          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-sm font-semibold text-primary-foreground">
            {selectedCount}
          </span>
          <span className="text-sm font-medium hidden sm:inline">
            {selectedCount === 1 ? '1 lead selecionado' : `${selectedCount} leads selecionados`}
          </span>
          <div className="h-5 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={handleSelectFirst50}>
            <Users className="h-4 w-4 mr-1" /> Primeiros 50
          </Button>
          <Button size="sm" variant="ghost" onClick={() => customerSelectionStore.clear()}>
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button size="sm" variant="outline" onClick={() => setIsBulkEmailModalOpen(true)}>
            <Mail className="h-4 w-4 mr-1" /> Email
          </Button>
          <Button size="sm" onClick={() => setIsSyncModalOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-1" /> Remarketing
          </Button>
        </div>
      )}

      <ImportCustomersModal open={showImport} onOpenChange={setShowImport} onSuccess={loadData} />
    </div>
  )
}
