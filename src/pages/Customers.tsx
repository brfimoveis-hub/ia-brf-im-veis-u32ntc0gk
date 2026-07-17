import { useEffect, useState, DragEvent } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, Phone, Calendar, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPhone } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ImportCustomersModal } from '@/components/email-marketing/ImportCustomersModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STAGES = [
  'Novo',
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
  'Fechamento',
]

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const loadData = async () => {
    try {
      const records = await pb.collection('customers').getFullList({
        sort: '-created',
        filter: "status != 'closed' && status != 'Fechamento e Pós-Venda'",
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
      setCustomers((prev) => {
        if (prev.some((c) => c.id === e.record.id)) return prev
        return [e.record, ...prev]
      })
    } else if (e.action === 'update') {
      setCustomers((prev) => {
        const exists = prev.some((c) => c.id === e.record.id)
        if (exists) {
          return prev.map((c) => (c.id === e.record.id ? e.record : c))
        }
        return [e.record, ...prev]
      })
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    // Delay setting the state so the browser can capture the original element's style for the drag image
    setTimeout(() => setDraggingId(id), 0)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetStatus: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return

    const customer = customers.find((c) => c.id === id)
    if (!customer || customer.status === targetStatus) {
      setDraggingId(null)
      return
    }

    const previousStatus = customer.status

    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status: targetStatus } : c)))
    setDraggingId(null)

    try {
      await pb.collection('customers').update(id, { status: targetStatus })
      toast.success('Lead movido com sucesso')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao mover lead')
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status: previousStatus } : c)))
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline Kanban</h1>
          <p className="text-muted-foreground">
            Acompanhe e movimente os leads pelas fases da cadência.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowImport(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importar Clientes
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-4 pt-2 custom-scrollbar">
        {STAGES.map((stage) => {
          const stageCustomers = customers.filter(
            (c) => c.status === stage || (stage === 'Novo' && (!c.status || c.status === 'lead')),
          )

          return (
            <div
              key={stage}
              className="flex w-[280px] shrink-0 flex-col rounded-xl bg-muted/40 border border-border/50 p-3"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="mb-4 flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm text-foreground/80">{stage}</h3>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 h-auto">
                  {stageCustomers.length}
                </Badge>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto min-h-[150px] pr-1 pb-2 custom-scrollbar">
                {stageCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, customer.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      'cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all bg-background',
                      draggingId === customer.id && 'opacity-40 border-dashed border-primary',
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col gap-2">
                        <div className="font-medium text-sm leading-tight flex items-start gap-2">
                          <User className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                          <span className="line-clamp-2">
                            {customer.name || customer.first_name || 'Sem nome'}
                          </span>
                        </div>

                        {customer.phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3 shrink-0" />
                            {formatPhone(customer.phone)}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(customer.created), 'dd/MM', { locale: ptBR })}
                          </div>
                          {customer.source && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 bg-muted/50 border-muted font-normal"
                            >
                              {customer.source.substring(0, 15)}
                              {customer.source.length > 15 ? '...' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {stageCustomers.length === 0 && (
                  <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground pointer-events-none">
                    Solte aqui
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ImportCustomersModal open={showImport} onOpenChange={setShowImport} onSuccess={loadData} />
    </div>
  )
}
