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
  {
    step: 1,
    name: '1. Acolhimento',
    desc: 'Acolhimento imediato e conexão com imóvel de interesse',
  },
  { step: 2, name: '2. Qualificação', desc: 'Sondagem de perfil, localização e investimento' },
  {
    step: 3,
    name: '3. Apresentação Consultiva',
    desc: 'Diferenciais do lançamento e encantamento',
  },
  {
    step: 4,
    name: '4. Sondagem Financeira',
    desc: 'Condições de pagamento: à vista, Caixa, FGTS ou permuta',
  },
  {
    step: 5,
    name: '5. Nutrição de Interesse',
    desc: 'Atualização de obras, plantas e valorização',
  },
  { step: 6, name: '6. Convite de Visita', desc: 'Agendamento presencial no imóvel ou estande' },
  { step: 7, name: '7. Confirmação e Rota', desc: 'Confirmação prévia, rota e localização exata' },
  { step: 8, name: '8. Feedback da Visita', desc: 'Coleta de impressões e pontos altos' },
  { step: 9, name: '9. Proposta e Condições', desc: 'Plano financeiro e superação de objeções' },
  {
    step: 10,
    name: '10. Pós-venda e Indicação',
    desc: 'Assinatura, chaves e pedido de indicações',
  },
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
      {PIPELINE_STEPS.map((stage) => {
        const stepCustomers = customers.filter((c) => c.status === stage.name)
        return (
          <div
            key={stage.name}
            className="flex flex-col min-w-[300px] w-[300px] bg-slate-100/60 border rounded-xl p-3 max-h-full snap-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, stage.name)}
          >
            <div className="font-semibold mb-2 flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center bg-primary/10 text-primary text-xs w-5 h-5 rounded-full font-bold">
                  {stage.step}
                </span>
                <span className="text-sm font-bold tracking-tight">{stage.name}</span>
              </div>
              <Badge variant="secondary" className="bg-white">
                {stepCustomers.length}
              </Badge>
            </div>
            <div
              className="text-xs text-muted-foreground mb-4 font-medium px-1 truncate"
              title={stage.desc}
            >
              {stage.desc}
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
