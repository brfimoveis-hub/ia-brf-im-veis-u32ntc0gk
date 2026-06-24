import { Phone, MapPin, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Customer } from './types'

interface Props {
  customer: Customer
  cardBorder: string
  hoverClass: string
}

export function KanbanCard({ customer, cardBorder, hoverClass }: Props) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', customer.id)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`bg-background p-3 rounded-lg border border-l-4 shadow-sm cursor-grab active:cursor-grabbing transition-colors ${cardBorder} ${hoverClass}`}
    >
      <div className="font-semibold text-sm mb-1 truncate" title={customer.name}>
        {customer.name || 'Sem Nome'}
      </div>
      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Phone className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{customer.phone || 'Sem Telefone'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div className="flex items-center gap-1" title="Bairro">
          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{customer.neighborhood || '-'}</span>
        </div>
        <div className="flex items-center gap-1" title="Faixa de Preço">
          <DollarSign className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{customer.price_range || '-'}</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t mt-1">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Urgência
        </span>
        <Badge
          variant={
            (customer.urgency || 0) > 7
              ? 'destructive'
              : (customer.urgency || 0) > 4
                ? 'default'
                : 'secondary'
          }
          className="text-[10px] px-1.5 py-0 h-4"
        >
          {customer.urgency || 0}
        </Badge>
      </div>
    </div>
  )
}
