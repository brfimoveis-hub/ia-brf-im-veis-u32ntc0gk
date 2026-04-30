import { Customer } from '@/services/customers'
import { PHASES } from './constants'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatPhone, cn } from '@/lib/utils'
import { Clock } from 'lucide-react'
import { CustomerDetailDrawer } from './CustomerDetailDrawer'
import { useState, useEffect } from 'react'
import { useRealtime } from '@/hooks/use-realtime'

export function CustomerKanban({
  leads,
  onUpdateStatus,
  onEdit,
}: {
  leads: Customer[]
  onUpdateStatus: (id: string, newStatus: string) => void
  onEdit: (lead: Customer) => void
}) {
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null)
  const [localLeads, setLocalLeads] = useState<Customer[]>(leads)

  useEffect(() => {
    setLocalLeads(leads)
  }, [leads])

  useRealtime('customers', (e) => {
    if (e.action === 'update') {
      setLocalLeads((prev) =>
        prev.map((l) =>
          l.id === e.record.id ? { ...l, ...(e.record as unknown as Customer) } : l,
        ),
      )
    } else if (e.action === 'create') {
      setLocalLeads((prev) => {
        if (prev.some((l) => l.id === e.record.id)) return prev
        return [e.record as unknown as Customer, ...prev]
      })
    } else if (e.action === 'delete') {
      setLocalLeads((prev) => prev.filter((l) => l.id !== e.record.id))
    }
  })

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('customerId', id)
    e.currentTarget.classList.add('opacity-50')
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50')
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-primary/5')
    const id = e.dataTransfer.getData('customerId')
    if (id) {
      setLocalLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
      onUpdateStatus(id, status)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-primary/5')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-primary/5')
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start">
      {PHASES.map((phase) => {
        const columnLeads = localLeads.filter(
          (l) => l.status === phase.title || (l.status === '' && phase.title === 'Lead Novo'),
        )
        return (
          <div
            key={phase.id}
            className="flex flex-col min-w-[320px] max-w-[320px] bg-muted/40 rounded-xl p-3 shrink-0 h-full border"
            onDrop={(e) => handleDrop(e, phase.title)}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            <div className="flex items-center justify-between mb-4 px-1 shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <div className={cn('w-2 h-2 rounded-full', phase.color)} />
                {phase.title}
              </h3>
              <span className="text-xs text-muted-foreground font-medium bg-background border px-2 py-0.5 rounded-full shadow-sm">
                {columnLeads.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-[150px] scroll-smooth px-1 pb-2">
              {columnLeads.map((lead) => (
                <Card
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setDrawerLeadId(lead.id)}
                  className="p-3.5 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all hover:shadow-md bg-background group"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0 border shadow-sm">
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?seed=${lead.id}`}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {lead.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden min-w-0">
                      <span className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                        {lead.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        {lead.phone ? formatPhone(lead.phone) : lead.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1" title="Criado em">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(lead.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap justify-end">
                        {lead.tags.slice(0, 2).map((t, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded-sm"
                          >
                            {t}
                          </span>
                        ))}
                        {lead.tags.length > 2 && (
                          <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm">
                            +{lead.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              {columnLeads.length === 0 && (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg p-6">
                  <span className="text-sm text-muted-foreground text-center">
                    Arraste clientes para cá
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      <CustomerDetailDrawer
        customerId={drawerLeadId}
        open={!!drawerLeadId}
        onOpenChange={(open) => {
          if (!open) setDrawerLeadId(null)
        }}
      />
    </div>
  )
}
