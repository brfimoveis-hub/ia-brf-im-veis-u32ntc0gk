import { useState, useCallback, useRef, DragEvent } from 'react'
import { CustomerDetailDrawer } from './CustomerDetailDrawer'
import { KanbanColumn, KanbanColumnHandle } from './KanbanColumn'
import { CUSTOMER_STAGES, buildBaseFilter, type CustomerFilterState } from '@/lib/customer-filters'

interface Props {
  filters: CustomerFilterState
  refreshKey: number
  onUpdateStatus: (id: string, status: string) => Promise<void>
}

export function UnifiedKanban({ filters, refreshKey, onUpdateStatus }: Props) {
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const draggingCustomerRef = useRef<any>(null)
  const handlesRef = useRef<Map<string, KanbanColumnHandle>>(new Map())

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
      <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-4 pt-2 custom-scrollbar">
        {CUSTOMER_STAGES.map((stage, index) => (
          <KanbanColumn
            key={stage}
            index={index}
            stage={stage}
            filter={filter}
            refreshKey={refreshKey}
            onCardDragStart={handleCardDragStart}
            onCardClick={setDrawerId}
            onDropToStage={handleDrop}
            registerHandle={registerHandle}
            unregisterHandle={unregisterHandle}
          />
        ))}
      </div>
      <CustomerDetailDrawer
        customerId={drawerId}
        open={!!drawerId}
        onOpenChange={handleCloseDrawer}
      />
    </>
  )
}
