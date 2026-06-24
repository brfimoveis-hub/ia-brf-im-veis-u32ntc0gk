import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { SidebarList } from '@/components/customers/SidebarList'
import { KanbanBoard } from '@/components/customers/KanbanBoard'
import { Customer } from '@/components/customers/types'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cadences, setCadences] = useState<any[]>([])
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [custs, cads] = await Promise.all([
        pb.collection('customers').getFullList<Customer>({ sort: '-created' }),
        pb.collection('cadences').getFullList({ sort: 'order' }),
      ])
      setCustomers(custs)
      setCadences(cads)
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar dados', variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime<Customer>('customers', (e) => {
    if (e.action === 'create') setCustomers((p) => [e.record, ...p])
    else if (e.action === 'update')
      setCustomers((p) => p.map((c) => (c.id === e.record.id ? e.record : c)))
    else if (e.action === 'delete') setCustomers((p) => p.filter((c) => c.id !== e.record.id))
  })

  const handleStatusChange = async (id: string, newStatus: string) => {
    const old = customers.find((c) => c.id === id)
    if (!old || old.status === newStatus) return

    // Optimistic update
    setCustomers((p) => p.map((c) => (c.id === id ? { ...c, status: newStatus } : c)))

    try {
      await pb.collection('customers').update(id, { status: newStatus })
    } catch (err) {
      // Revert on error
      setCustomers((p) => p.map((c) => (c.id === id ? { ...c, status: old.status } : c)))
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      <SidebarList customers={customers} />
      <KanbanBoard customers={customers} cadences={cadences} onStatusChange={handleStatusChange} />
    </div>
  )
}
