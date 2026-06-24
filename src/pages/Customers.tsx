import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Phone, MapPin, DollarSign, Target, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

export default function CustomersPipeline() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const records = await pb.collection('customers').getFullList({
        sort: '-created',
      })
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
      setCustomers((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setCustomers((prev) => prev.map((c) => (c.id === e.record.id ? e.record : c)))
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('customerId', id)
    setDraggedId(id)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverStage(null)
  }

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    setDragOverStage(stage)
  }

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    const customerId = e.dataTransfer.getData('customerId')
    setDragOverStage(null)

    if (customerId) {
      const customer = customers.find((c) => c.id === customerId)
      if (customer && customer.status !== stage) {
        setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, status: stage } : c)))
        try {
          await pb.collection('customers').update(customerId, { status: stage })
          toast.success('Status atualizado')
        } catch (err) {
          console.error(err)
          toast.error('Erro ao atualizar status')
          loadData()
        }
      }
    }
    setDraggedId(null)
  }

  const renderUrgency = (urgency?: number) => {
    if (!urgency) return null
    let color = 'bg-slate-100 text-slate-800'
    if (urgency >= 8) color = 'bg-red-100 text-red-800'
    else if (urgency >= 5) color = 'bg-orange-100 text-orange-800'
    else if (urgency >= 3) color = 'bg-yellow-100 text-yellow-800'

    return (
      <Badge
        variant="outline"
        className={cn('text-xs px-1.5 py-0 border-none font-semibold', color)}
      >
        Urgência: {urgency}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-6 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus leads arrastando os cards entre os estágios do Kanban.
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 whitespace-nowrap rounded-md border bg-slate-50/50">
        <div className="flex h-full items-start gap-4 p-4 min-h-[500px]">
          {PIPELINE_STAGES.map((stage) => {
            const stageCustomers = customers.filter((c) => c.status === stage)
            const isOver = dragOverStage === stage

            return (
              <div
                key={stage}
                className={cn(
                  'flex h-full w-[320px] shrink-0 flex-col gap-3 rounded-lg border bg-slate-100/50 p-3 transition-colors',
                  isOver && 'bg-slate-200 border-primary',
                )}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-semibold text-sm text-slate-700 whitespace-normal">
                    {stage}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {stageCustomers.length}
                  </Badge>
                </div>

                <ScrollArea className="flex-1 -mx-2 px-2">
                  <div className="flex flex-col gap-3 pb-4">
                    {stageCustomers.map((customer) => (
                      <Card
                        key={customer.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, customer.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all',
                          draggedId === customer.id && 'opacity-50',
                        )}
                      >
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-start gap-2 whitespace-normal">
                            <CardTitle className="text-sm font-bold leading-tight">
                              {customer.name || customer.first_name || 'Sem Nome'}
                            </CardTitle>
                            {renderUrgency(customer.urgency)}
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-xs flex flex-col gap-1.5 text-muted-foreground whitespace-normal">
                          {customer.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {customer.neighborhood && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate" title={customer.neighborhood}>
                                {customer.neighborhood}
                              </span>
                            </div>
                          )}
                          {customer.price_range && (
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="h-3 w-3 shrink-0" />
                              <span className="truncate" title={customer.price_range}>
                                {customer.price_range}
                              </span>
                            </div>
                          )}
                          {customer.source && (
                            <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t">
                              <Target className="h-3 w-3 shrink-0" />
                              <span className="truncate" title={customer.source}>
                                {customer.source}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
