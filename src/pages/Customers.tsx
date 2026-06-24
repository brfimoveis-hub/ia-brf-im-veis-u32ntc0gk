import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { Flame, Phone, MapPin, DollarSign, Loader2, Bot, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const PIPELINE_STAGES = [
  { id: 'D0 - Contato Imediato', name: 'D0 - Contato Imediato', headerColor: 'border-blue-500' },
  { id: 'D1 - Follow up 1', name: 'D1 - Follow up 1', headerColor: 'border-green-500' },
  { id: 'D2 - Follow up 2', name: 'D2 - Follow up 2', headerColor: 'border-yellow-500' },
  { id: 'D3 - Follow up 3', name: 'D3 - Follow up 3', headerColor: 'border-amber-600' },
  { id: 'D4 - Follow up 4', name: 'D4 - Follow up 4', headerColor: 'border-orange-500' },
  { id: 'D5 - Follow up 5', name: 'D5 - Follow up 5', headerColor: 'border-red-500' },
  { id: 'D6 - Follow up 6', name: 'D6 - Follow up 6', headerColor: 'border-pink-500' },
  { id: 'D7 - Follow up 7', name: 'D7 - Follow up 7', headerColor: 'border-purple-500' },
  { id: 'D8 - Follow up 8', name: 'D8 - Follow up 8', headerColor: 'border-indigo-500' },
  {
    id: 'D9 - Despedida/Nutrição',
    name: 'D9 - Despedida/Nutrição',
    headerColor: 'border-gray-500',
  },
]

const STAGE_INSTRUCTIONS: Record<string, string> = {
  'D0 - Contato Imediato':
    'Prioridade máxima: Tente contato em até 5 minutos após a captura do lead. O objetivo é a qualificação inicial rápida e agendamento de visita.',
  'D1 - Follow up 1':
    'No dia seguinte, envie uma mensagem ou faça uma ligação para quem não respondeu, reforçando a disponibilidade e o interesse em ajudar.',
  'D2 - Follow up 2':
    'Segundo dia após a tentativa falha. Envie opções de imóveis baseadas na origem do lead para gerar interesse visual e prático.',
  'D3 - Follow up 3':
    'Terceiro dia. Focar em gatilhos de escassez e novidades do mercado. Se ainda não houve resposta, mantenha a educação do lead com valor.',
  'D4 - Follow up 4':
    'Quarto dia. Reforce depoimentos ou casos de sucesso de clientes anteriores, passando segurança e autoridade.',
  'D5 - Follow up 5':
    'Quinto dia. Pergunte abertamente se o cliente ainda está buscando imóvel ou se já encontrou, para entender o momento e limpar o Pipeline.',
  'D6 - Follow up 6':
    'Sexto dia. Tente uma ligação. Se não atender, envie uma mensagem de texto curta e direta sobre uma oportunidade única.',
  'D7 - Follow up 7':
    'Sétimo dia. Envie um material de alto valor: e-book sobre a região, tabela de preços atualizada, ou análise de mercado.',
  'D8 - Follow up 8':
    'Oitavo dia. Faça uma oferta especial, destaque uma facilidade na negociação, ou faça um convite exclusivo para um evento/lançamento.',
  'D9 - Despedida/Nutrição':
    'Nono dia. Despedida educada. Avise que o contato direto passará a ser menos frequente, deixando a porta aberta para quando estiver no momento.',
}

export default function Customers() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredStage, setHoveredStage] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [leadsData, customersData] = await Promise.all([
        pb.collection('leads').getFullList({ sort: '-created' }),
        pb.collection('customers').getFullList({ sort: '-created' }),
      ])
      setLeads(leadsData)
      setCustomers(customersData)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados do Pipeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('leads', (e) => {
    if (e.action === 'create') setLeads((prev) => [e.record, ...prev])
    if (e.action === 'update')
      setLeads((prev) => prev.map((l) => (l.id === e.record.id ? e.record : l)))
    if (e.action === 'delete') setLeads((prev) => prev.filter((l) => l.id !== e.record.id))
  })

  useRealtime('customers', (e) => {
    if (e.action === 'create')
      setCustomers((prev) => (prev.find((c) => c.id === e.record.id) ? prev : [e.record, ...prev]))
    if (e.action === 'update')
      setCustomers((prev) => prev.map((c) => (c.id === e.record.id ? e.record : c)))
    if (e.action === 'delete') setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
  })

  const handleDropLead = async (leadId: string, targetStage: string) => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    setLeads((prev) => prev.filter((l) => l.id !== leadId))

    const tempId = `temp-${Date.now()}`
    const newCustomerObj = {
      id: tempId,
      user_id: user?.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      notes: lead.notes,
      status: targetStage,
      created: new Date().toISOString(),
    }
    setCustomers((prev) => [newCustomerObj, ...prev])

    try {
      const created = await pb.collection('customers').create(newCustomerObj)
      await pb.collection('leads').update(lead.id, { status: 'converted' })
      toast.success('Lead convertido para o Pipeline com sucesso!')
      setCustomers((prev) => prev.filter((c) => c.id !== tempId).concat(created))
    } catch (err) {
      toast.error(getErrorMessage(err))
      loadData()
    }
  }

  const handleDropCustomer = async (customerId: string, targetStage: string) => {
    const customer = customers.find((c) => c.id === customerId)
    if (!customer || customer.status === targetStage) return

    const previousStatus = customer.status
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status: targetStage } : c)),
    )

    try {
      await pb.collection('customers').update(customerId, { status: targetStage })
    } catch (err) {
      toast.error(getErrorMessage(err))
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, status: previousStatus } : c)),
      )
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const activeStageInstructions = hoveredStage
    ? STAGE_INSTRUCTIONS[hoveredStage]
    : 'Passe o mouse sobre os estágios para ver a estratégia e instruções do Cérebro do Sistema.'

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] min-h-[700px] overflow-hidden">
      {/* Strategy Panel */}
      <div className="flex-none mb-4 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-slate-800 flex items-center">
          <Bot className="w-5 h-5 mr-2 text-primary" />
          Estratégia do Cérebro do Sistema {hoveredStage ? `- ${hoveredStage}` : ''}
        </h2>
        <p className="text-sm text-slate-600 transition-opacity min-h-[40px] flex items-center">
          {activeStageInstructions}
        </p>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden border rounded-lg shadow-sm bg-white">
        {/* New Leads Sidebar */}
        <div className="w-72 flex-none border-r bg-slate-50 flex flex-col z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
          <div className="p-4 font-bold border-b flex items-center justify-between text-slate-800 bg-white">
            <span>Novos Leads</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {leads.filter((l) => l.status !== 'converted').length}
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3 pb-8">
              {leads
                .filter((l) => l.status !== 'converted')
                .map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('type', 'lead')
                      e.dataTransfer.setData('leadId', lead.id)
                      ;(e.target as HTMLElement).style.opacity = '0.5'
                    }}
                    onDragEnd={(e) => {
                      ;(e.target as HTMLElement).style.opacity = '1'
                    }}
                    className="cursor-grab active:cursor-grabbing rounded-md border bg-white p-3 shadow-sm hover:border-primary/50 hover:shadow transition-all group relative"
                  >
                    <GripVertical className="absolute right-2 top-3 h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="font-semibold text-sm text-slate-900 pr-5">
                      {lead.name || 'Sem nome'}
                    </div>
                    {lead.source && (
                      <div className="text-xs font-medium text-primary mt-1 bg-primary/10 inline-block px-1.5 py-0.5 rounded">
                        {lead.source}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-2 font-medium">
                      Capturado em {new Date(lead.created).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              {leads.filter((l) => l.status !== 'converted').length === 0 && (
                <div className="text-center text-sm text-slate-500 mt-8">
                  Nenhum novo lead no momento.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto bg-slate-50">
          <div className="flex h-full p-4 gap-4" style={{ minWidth: 'max-content' }}>
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.id}
                className={cn(
                  'flex w-[320px] flex-col rounded-lg bg-slate-100/80 shadow-sm border-t-4 transition-all duration-200',
                  stage.headerColor,
                  dragOverStage === stage.id
                    ? 'ring-2 ring-primary ring-inset bg-slate-200/50'
                    : '',
                )}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragOverStage !== stage.id) setDragOverStage(stage.id)
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOverStage(null)
                  const type = e.dataTransfer.getData('type')
                  if (type === 'lead') {
                    if (stage.id !== 'D0 - Contato Imediato') {
                      toast.error(
                        'Novos leads devem ser convertidos apenas para o estágio D0 - Contato Imediato.',
                      )
                      return
                    }
                    const leadId = e.dataTransfer.getData('leadId')
                    handleDropLead(leadId, stage.id)
                  } else if (type === 'customer') {
                    const customerId = e.dataTransfer.getData('customerId')
                    handleDropCustomer(customerId, stage.id)
                  }
                }}
              >
                <div
                  className="p-3 font-semibold text-slate-700 flex justify-between items-center bg-white/40 rounded-t-sm"
                  onMouseEnter={() => setHoveredStage(stage.id)}
                >
                  <span className="truncate pr-2">{stage.name}</span>
                  <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0">
                    {customers.filter((c) => c.status === stage.id).length}
                  </span>
                </div>
                <ScrollArea className="flex-1">
                  <div
                    className="p-3 space-y-3 pb-8 min-h-[200px]"
                    onMouseEnter={() => setHoveredStage(stage.id)}
                  >
                    {customers
                      .filter((c) => c.status === stage.id)
                      .map((customer) => (
                        <div
                          key={customer.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('type', 'customer')
                            e.dataTransfer.setData('customerId', customer.id)
                            ;(e.target as HTMLElement).style.opacity = '0.5'
                          }}
                          onDragEnd={(e) => {
                            ;(e.target as HTMLElement).style.opacity = '1'
                          }}
                          className="cursor-grab active:cursor-grabbing rounded-md border bg-white p-3 shadow-sm hover:border-primary/50 hover:shadow transition-all group relative"
                        >
                          <GripVertical className="absolute right-2 top-3 h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="font-medium text-sm text-slate-900 mb-2 pr-6">
                            {customer.name || customer.phone || 'Sem nome'}
                          </div>
                          <div className="space-y-1.5">
                            {customer.phone && (
                              <div className="flex items-center text-xs text-slate-500">
                                <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                {customer.phone}
                              </div>
                            )}
                            {customer.neighborhood && (
                              <div className="flex items-center text-xs text-slate-500">
                                <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                {customer.neighborhood}
                              </div>
                            )}
                            {customer.price_range && (
                              <div className="flex items-center text-xs text-slate-500">
                                <DollarSign className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                {customer.price_range}
                              </div>
                            )}
                            {customer.urgency !== undefined && customer.urgency !== null && (
                              <div className="flex items-center gap-0.5 mt-3 pt-2 border-t border-slate-100">
                                <span className="text-[10px] uppercase text-slate-400 font-semibold mr-1">
                                  Urgência
                                </span>
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Flame
                                    key={i}
                                    className={cn(
                                      'w-3.5 h-3.5',
                                      i < customer.urgency
                                        ? 'text-orange-500 fill-orange-500'
                                        : 'text-slate-200 fill-slate-200',
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
