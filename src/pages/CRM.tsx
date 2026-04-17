import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, TrendingUp, Sparkles, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const PHASES = [
  { id: 1, title: 'Lead Novo', color: 'bg-slate-500' },
  { id: 2, title: 'Contato 1', color: 'bg-blue-400' },
  { id: 3, title: 'Contato 2', color: 'bg-blue-500' },
  { id: 4, title: 'Qualificação', color: 'bg-indigo-400' },
  { id: 5, title: 'Qualificado', color: 'bg-indigo-500' },
  { id: 6, title: 'Demo Agend.', color: 'bg-purple-500' },
  { id: 7, title: 'Demo Realiz.', color: 'bg-purple-600' },
  { id: 8, title: 'Proposta', color: 'bg-amber-500' },
  { id: 9, title: 'Negociação', color: 'bg-orange-500' },
  { id: 10, title: 'Fechamento', color: 'bg-green-500' },
]

const INITIAL_LEADS = [
  {
    id: 1,
    name: 'João Silva',
    number: '+55 11 98765-4321',
    phaseId: 1,
    lastInteraction: 'Há 10 min',
    sentiment: 'Curioso',
    nextStep: 'Enviar material introdutório',
  },
  {
    id: 2,
    name: 'Maria Oliveira',
    number: '+55 21 91234-5678',
    phaseId: 4,
    lastInteraction: 'Há 2h',
    sentiment: 'Engajado',
    nextStep: 'Confirmar dores do negócio',
  },
  {
    id: 3,
    name: 'Carlos Santos',
    number: '+55 31 99876-5432',
    phaseId: 6,
    lastInteraction: 'Ontem',
    sentiment: 'Muito Interessado',
    nextStep: 'Preparar ambiente de demo',
  },
  {
    id: 4,
    name: 'Ana Costa',
    number: '+55 41 98888-7777',
    phaseId: 8,
    lastInteraction: 'Ontem',
    sentiment: 'Avaliando preços',
    nextStep: 'Follow-up sobre proposta comercial',
  },
  {
    id: 5,
    name: 'Pedro Mendes',
    number: '+55 51 97777-6666',
    phaseId: 2,
    lastInteraction: 'Há 1 dia',
    sentiment: 'Frio',
    nextStep: 'Tentar nova abordagem',
  },
]

export default function CRM() {
  const [leads, setLeads] = useState(INITIAL_LEADS)
  const { toast } = useToast()

  useEffect(() => {
    const timer = setInterval(() => {
      setLeads((currentLeads) => {
        const movableLeads = currentLeads.filter((l) => l.phaseId < 10)
        if (movableLeads.length === 0) return currentLeads

        const leadToMove = movableLeads[Math.floor(Math.random() * movableLeads.length)]
        const nextPhase = leadToMove.phaseId + 1
        const phaseName = PHASES.find((p) => p.id === nextPhase)?.title

        toast({
          title: 'Transição Automática (IA)',
          description: `A IA processou o lead ${leadToMove.name} e moveu para: ${phaseName}`,
        })

        return currentLeads.map((l) =>
          l.id === leadToMove.id ? { ...l, phaseId: nextPhase, lastInteraction: 'Agora mesmo' } : l,
        )
      })
    }, 15000)

    return () => clearInterval(timer)
  }, [toast])

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Pipeline de Vendas Inteligente
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          A inteligência artificial analisa as conversas da linha 55 48 992098050 e avança os leads
          automaticamente entre as 10 cadências.
        </p>
      </div>

      <ScrollArea className="flex-1 border rounded-xl bg-muted/10 shadow-inner">
        <div className="flex h-full p-4 gap-4 w-max min-w-full">
          {PHASES.map((phase) => {
            const phaseLeads = leads.filter((l) => l.phaseId === phase.id)

            return (
              <div
                key={phase.id}
                className="w-[300px] shrink-0 flex flex-col bg-card rounded-xl border shadow-sm h-full max-h-full overflow-hidden"
              >
                <div className="p-3 border-b bg-muted/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-3 w-3 rounded-full shadow-sm', phase.color)} />
                    <h3
                      className="font-semibold text-sm text-secondary truncate"
                      title={phase.title}
                    >
                      {phase.title}
                    </h3>
                  </div>
                  <Badge
                    variant="secondary"
                    className="px-1.5 min-w-[1.5rem] flex justify-center bg-background shadow-sm"
                  >
                    {phaseLeads.length}
                  </Badge>
                </div>

                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2">
                    {phaseLeads.map((lead) => (
                      <Card
                        key={lead.id}
                        className="shadow-subtle hover:shadow-md transition-all cursor-pointer border-muted group relative overflow-hidden animate-fade-in"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 border">
                                <AvatarImage
                                  src={`https://img.usecurling.com/ppl/thumbnail?seed=${lead.id}`}
                                />
                                <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium text-sm text-secondary leading-tight">
                                  {lead.name}
                                </h4>
                                <span className="text-[10px] text-muted-foreground">
                                  {lead.number}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 mt-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{lead.lastInteraction}</span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="bg-primary/5 text-primary border-primary/20 text-[10px] gap-1 cursor-help"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {lead.sentiment}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Sentimento detectado pela IA</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-500/5 text-amber-600 border-amber-500/20 text-[10px] gap-1 cursor-help truncate max-w-[140px]"
                                  >
                                    <Bot className="h-2.5 w-2.5" />
                                    {lead.nextStep}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Próxima ação sugerida: {lead.nextStep}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {phaseLeads.length === 0 && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed rounded-lg border-muted-foreground/20 text-muted-foreground/50 text-xs font-medium">
                        Nenhum lead
                      </div>
                    )}
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
