import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CustomerCard } from '@/components/CustomerCard'

interface Customer {
  id: string
  name: string
  phone: string
  status: string
  urgency: number
  neighborhood: string
  price_range: string
  updated: string
}

interface Cadence {
  id: string
  title: string
  description: string
  content: string
}

const PIPELINE_STAGES = [
  {
    id: 'D0 - Contato Imediato',
    name: 'D0',
    desc: 'Contato Imediato',
    color: 'bg-blue-500',
    border: 'border-blue-500',
    bg: 'bg-blue-50',
  },
  {
    id: 'D1 - Follow up 1',
    name: 'D1',
    desc: 'Follow up 1',
    color: 'bg-indigo-500',
    border: 'border-indigo-500',
    bg: 'bg-indigo-50',
  },
  {
    id: 'D2 - Follow up 2',
    name: 'D2',
    desc: 'Follow up 2',
    color: 'bg-violet-500',
    border: 'border-violet-500',
    bg: 'bg-violet-50',
  },
  {
    id: 'D3 - Follow up 3',
    name: 'D3',
    desc: 'Follow up 3',
    color: 'bg-purple-500',
    border: 'border-purple-500',
    bg: 'bg-purple-50',
  },
  {
    id: 'D4 - Follow up 4',
    name: 'D4',
    desc: 'Follow up 4',
    color: 'bg-fuchsia-500',
    border: 'border-fuchsia-500',
    bg: 'bg-fuchsia-50',
  },
  {
    id: 'D5 - Follow up 5',
    name: 'D5',
    desc: 'Follow up 5',
    color: 'bg-pink-500',
    border: 'border-pink-500',
    bg: 'bg-pink-50',
  },
  {
    id: 'D6 - Follow up 6',
    name: 'D6',
    desc: 'Visita',
    color: 'bg-rose-500',
    border: 'border-rose-500',
    bg: 'bg-rose-50',
  },
  {
    id: 'D7 - Follow up 7',
    name: 'D7',
    desc: 'Follow up 7',
    color: 'bg-red-500',
    border: 'border-red-500',
    bg: 'bg-red-50',
  },
  {
    id: 'D8 - Follow up 8',
    name: 'D8',
    desc: 'Follow up 8',
    color: 'bg-orange-500',
    border: 'border-orange-500',
    bg: 'bg-orange-50',
  },
  {
    id: 'D9 - Despedida/Nutrição',
    name: 'D9',
    desc: 'Despedida/Nutrição',
    color: 'bg-amber-500',
    border: 'border-amber-500',
    bg: 'bg-amber-50',
  },
]

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cadences, setCadences] = useState<Cadence[]>([])

  const loadData = async () => {
    try {
      const [customersRes, cadencesRes] = await Promise.all([
        pb.collection('customers').getFullList<Customer>({ sort: '-updated' }),
        pb.collection('cadences').getFullList<Cadence>({ sort: 'order' }),
      ])
      setCustomers(customersRes)
      setCadences(cadencesRes)
    } catch (error) {
      toast.error('Erro ao carregar dados')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', (e) => {
    if (e.action === 'create') setCustomers((prev) => [e.record as Customer, ...prev])
    else if (e.action === 'update')
      setCustomers((prev) => prev.map((c) => (c.id === e.record.id ? (e.record as Customer) : c)))
    else if (e.action === 'delete') setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
  })

  const handleDragStart = (e: React.DragEvent, customerId: string) =>
    e.dataTransfer.setData('customerId', customerId)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const customerId = e.dataTransfer.getData('customerId')
    if (!customerId) return
    const customer = customers.find((c) => c.id === customerId)
    if (customer && customer.status !== newStatus) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, status: newStatus } : c)),
      )
      try {
        await pb.collection('customers').update(customerId, { status: newStatus })
        toast.success(`Movido para ${newStatus}`)
      } catch (error) {
        toast.error('Erro ao mover cliente')
        loadData()
      }
    }
  }

  const newLeads = customers.filter((c) => c.status === 'Novo')
  const getCadenceContext = (stageId: string) => {
    const stagePrefix = stageId.split(' - ')[0]
    const cadence = cadences.find((c) => c.title.includes(stagePrefix))
    return cadence?.description || cadence?.content || 'Contexto estratégico não definido.'
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -m-4 md:-m-8">
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-slate-800">Pipeline</h1>
      </div>

      <div className="flex flex-1 overflow-hidden bg-slate-50">
        <div
          className="w-80 bg-white border-r flex flex-col shrink-0"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'Novo')}
        >
          <div className="p-4 border-b bg-slate-50/50">
            <h2 className="font-semibold text-slate-700 flex items-center justify-between">
              Novos Leads <Badge variant="secondary">{newLeads.length}</Badge>
            </h2>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {newLeads.map((lead) => (
                <CustomerCard
                  key={lead.id}
                  customer={lead}
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                />
              ))}
              {newLeads.length === 0 && (
                <div className="text-center text-sm text-slate-500 py-8">Nenhum novo lead.</div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-32 shrink-0 border-b bg-white">
            <ScrollArea className="h-full">
              <div className="flex p-4 gap-4 w-max">
                {PIPELINE_STAGES.map((stage) => (
                  <Card
                    key={`context-${stage.id}`}
                    className={cn('w-72 shrink-0 border-l-4', stage.border)}
                  >
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-sm font-semibold">
                        {stage.name} - {stage.desc}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                      <p
                        className="text-xs text-slate-600 line-clamp-2"
                        title={getCadenceContext(stage.id)}
                      >
                        {getCadenceContext(stage.id)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <ScrollArea className="flex-1" type="always">
            <div className="flex h-full p-6 gap-6 w-max items-start">
              {PIPELINE_STAGES.map((stage) => {
                const stageCustomers = customers.filter((c) => c.status === stage.id)
                return (
                  <div
                    key={stage.id}
                    className={cn(
                      'flex flex-col w-80 shrink-0 h-full rounded-xl border border-slate-200 overflow-hidden shadow-sm',
                      stage.bg,
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    <div
                      className={cn(
                        'p-3 border-b border-slate-200 flex items-center justify-between text-white shadow-sm',
                        stage.color,
                      )}
                    >
                      <h3 className="font-semibold text-sm drop-shadow-sm">
                        {stage.name} - {stage.desc}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="bg-white/20 text-white hover:bg-white/30 border-none"
                      >
                        {stageCustomers.length}
                      </Badge>
                    </div>
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-3 pb-4">
                        {stageCustomers.map((c) => (
                          <CustomerCard
                            key={c.id}
                            customer={c}
                            onDragStart={(e) => handleDragStart(e, c.id)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )
              })}
            </div>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
