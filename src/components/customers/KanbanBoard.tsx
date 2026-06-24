import { useEffect, useRef } from 'react'
import { Customer, STAGES } from './types'
import { KanbanCard } from './KanbanCard'

interface Props {
  customers: Customer[]
  cadences: any[]
  onStatusChange: (id: string, status: string) => void
}

export function KanbanBoard({ customers, cadences, onStatusChange }: Props) {
  const kanbanRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = kanbanRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && !e.shiftKey) {
        let target = e.target as HTMLElement
        let shouldScrollHorizontally = true
        while (target && target !== el) {
          if (target.scrollHeight > target.clientHeight + 2) {
            shouldScrollHorizontally = false
            break
          }
          target = target.parentElement!
        }
        if (shouldScrollHorizontally) {
          el.scrollLeft += e.deltaY
          e.preventDefault()
        }
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) onStatusChange(id, statusId)
  }

  const getStageDesc = (stageId: string, defaultDesc: string) => {
    const prefix = stageId.split(' - ')[0]
    const match = cadences.find((c) => c.title?.includes(prefix))
    return match?.description || defaultDesc
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-muted/20" ref={kanbanRef}>
      <div className="flex flex-col h-full w-max min-w-full">
        {/* Top Informational Panel */}
        <div className="flex p-4 gap-4 border-b bg-background w-max min-w-full flex-shrink-0">
          {STAGES.map((stage) => (
            <div
              key={`header-${stage.id}`}
              className="w-[300px] flex-shrink-0 p-3 rounded-md border bg-muted/30"
            >
              <h3 className={`font-semibold text-sm ${stage.text}`}>{stage.title}</h3>
              <p
                className="text-xs text-muted-foreground mt-1 line-clamp-2"
                title={getStageDesc(stage.id, stage.desc)}
              >
                {getStageDesc(stage.id, stage.desc)}
              </p>
            </div>
          ))}
        </div>

        {/* Kanban Columns */}
        <div className="flex flex-1 min-h-0 p-4 gap-4 items-start w-max min-w-full">
          {STAGES.map((stage) => {
            const columnCustomers = customers.filter((c) => c.status === stage.id)
            return (
              <div
                key={`col-${stage.id}`}
                className={`w-[300px] flex-shrink-0 flex flex-col rounded-md bg-muted/40 border-t-4 ${stage.color} h-full overflow-hidden`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="p-3 border-b bg-background/50 flex items-center justify-between font-semibold text-sm">
                  <span>{stage.title.split(' - ')[0]}</span>
                  <span className="text-muted-foreground font-normal bg-background px-2 py-0.5 rounded-full border text-xs">
                    {columnCustomers.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                  {columnCustomers.map((c) => (
                    <KanbanCard
                      key={c.id}
                      customer={c}
                      cardBorder={stage.cardBorder}
                      hoverClass={stage.hover}
                    />
                  ))}
                  {columnCustomers.length === 0 && (
                    <div className="text-center p-4 text-xs text-muted-foreground border-2 border-dashed rounded-md bg-background/50 m-2">
                      Arraste leads para cá
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
