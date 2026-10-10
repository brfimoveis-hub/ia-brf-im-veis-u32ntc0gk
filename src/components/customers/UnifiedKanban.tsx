import { useState, useCallback, useRef, DragEvent } from 'react'
import { CustomerDetailDrawer } from './CustomerDetailDrawer'
import { KanbanColumn, KanbanColumnHandle } from './KanbanColumn'
import { CUSTOMER_STAGES, buildBaseFilter, type CustomerFilterState } from '@/lib/customer-filters'
import {
  useBiaMovementInstructions,
  getStageInstruction,
} from '@/hooks/use-bia-movement-instructions'
import { Sparkles, Bot, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Props {
  filters: CustomerFilterState
  refreshKey: number
  onUpdateStatus: (id: string, status: string) => Promise<void>
}

export function UnifiedKanban({ filters, refreshKey, onUpdateStatus }: Props) {
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const draggingCustomerRef = useRef<any>(null)
  const handlesRef = useRef<Map<string, KanbanColumnHandle>>(new Map())
  const {
    stages: biaStages,
    loading: biaLoading,
    reload: reloadBiaInstructions,
  } = useBiaMovementInstructions()

  const filter = buildBaseFilter(filters)

  const registerHandle = useCallback((stage: string, handle: KanbanColumnHandle) => {
    handlesRef.current.set(stage, handle)
  }, [])
  const unregisterHandle = useCallback((stage: string) => {
    handlesRef.current.delete(stage)
  }, [])

  const handleCardDragStart = useCallback((customer: any) => {
    draggingCustomerRef.current = customer
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>, targetStage: string) => {
      e.preventDefault()
      const customer = draggingCustomerRef.current
      draggingCustomerRef.current = null
      if (!customer) return
      if (customer.status === targetStage) return
      try {
        await onUpdateStatus(customer.id, targetStage)
        const updated = { ...customer, status: targetStage }
        handlesRef.current.forEach((h) => h.removeItem(customer.id))
        handlesRef.current.get(targetStage)?.addItem(updated)
      } catch (err) {
        console.error('Drop failed', err)
      }
    },
    [onUpdateStatus],
  )

  const handleCloseDrawer = useCallback((open: boolean) => {
    if (!open) setDrawerId(null)
  }, [])

  return (
    <>
      {/* Banner discreto indicando sincronização viva com o Texto Único da Bia */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-xs text-muted-foreground border-b border-border/40 mb-1">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="h-5 px-1.5 gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-normal"
          >
            <Bot className="h-3 w-3" />
            <span>Cadências da Bia</span>
          </Badge>
          <span className="text-[11px] hidden sm:inline text-muted-foreground">
            Instruções sincronizadas com a <strong>Constituição v3.1</strong> (Texto Único).
            Mudanças no Caderno de Aprendizados refletem aqui automaticamente.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground hidden md:inline">
            Movimento duplo: <strong>Você</strong> (arraste) ou <strong>Bia</strong> (tags
            automáticas).
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => reloadBiaInstructions()}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            title="Recarregar instruções da Bia"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${biaLoading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-4 pt-1 custom-scrollbar">
        {CUSTOMER_STAGES.map((stage, index) => {
          const instruction = getStageInstruction(biaStages, index + 1)
          return (
            <KanbanColumn
              key={stage}
              index={index}
              stage={stage}
              filter={filter}
              refreshKey={refreshKey}
              biaInstruction={instruction}
              onCardDragStart={handleCardDragStart}
              onCardClick={setDrawerId}
              onDropToStage={handleDrop}
              registerHandle={registerHandle}
              unregisterHandle={unregisterHandle}
            />
          )
        })}
      </div>
      <CustomerDetailDrawer
        customerId={drawerId}
        open={!!drawerId}
        onOpenChange={handleCloseDrawer}
      />
    </>
  )
}
