import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { cn, formatPhone } from '@/lib/utils'
import type { Customer } from '@/types/customer'

const PIPELINE_STEPS = [
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

interface PipelineBoardProps {
  customers: Customer[]
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
}

export function PipelineBoard({ customers, setCustomers }: PipelineBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setDraggingId(null)
    if (!id) return

    const customer = customers.find((c) => c.id === id)
    if (!customer || customer.status === newStatus) return

    const oldStatus = customer.status
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)))

    try {
      await pb.collection('customers').update(id, { status: newStatus })
      toast.success(`Status atualizado para ${newStatus}`)
    } catch {
      toast.error('Erro ao atualizar status')
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status: oldStatus } : c)))
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start snap-x">
      {PIPELINE_STEPS.map((step, idx) => {
        const stepCustomers = customers.filter((c) => c.status === step)
        return (
          <div
            key={step}
            className="flex flex-col min-w-[300px] w-[300px] bg-slate-100/60 border rounded-xl p-3 max-h-full snap-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, step)}
          >
            <div className="font-semibold mb-2 flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center bg-slate-200 text-slate-600 text-xs w-5 h-5 rounded-full font-bold">
                  {idx}
                </span>
                <span className="text-sm font-bold uppercase tracking-wider">
                  {step.split(' - ')[0]}
                </span>
              </div>
              <Badge variant="secondary" className="bg-white">
                {stepCustomers.length}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mb-4 font-medium px-1 truncate">
              {step.split(' - ')[1] || step}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
              {stepCustomers.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200/80 rounded-lg h-24 flex items-center justify-center text-xs text-slate-400">
                  Arraste leads para cá
                </div>
              ) : (
                stepCustomers.map((c) => (
                  <Card
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', c.id)
                      setDraggingId(c.id)
                    }}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className={cn(
                      'cursor-grab active:cursor-grabbing hover:shadow-md transition-all',
                      draggingId === c.id && 'opacity-50 ring-2 ring-primary scale-[0.98]',
                    )}
                  >
                    <CardContent className="p-3 relative group">
                      <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 text-slate-300">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="font-semibold text-sm pr-6 leading-tight text-slate-800">
                        {c.name || 'Sem nome'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatPhone(c.phone) || c.email}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {c.neighborhood ? `📍 ${c.neighborhood}` : ''}
                        </div>
                        {c.urgency > 0 && (
                          <Badge
                            variant={c.urgency >= 4 ? 'destructive' : 'secondary'}
                            className="text-[9px] px-1.5 py-0"
                          >
                            Urgência {c.urgency}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
