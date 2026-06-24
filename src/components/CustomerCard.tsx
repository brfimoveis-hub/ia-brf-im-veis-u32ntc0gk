import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, MapPin, DollarSign, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  phone: string
  status: string
  urgency: number
  neighborhood: string
  price_range: string
  updated: string
}

interface CustomerCardProps {
  customer: Customer
  onDragStart: (e: React.DragEvent) => void
}

export function CustomerCard({ customer, onDragStart }: CustomerCardProps) {
  return (
    <Card
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow duration-200 border-slate-200 bg-white"
      draggable
      onDragStart={onDragStart}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <GripVertical className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <h4
              className="font-medium text-sm text-slate-900 truncate"
              title={customer.name || 'Sem Nome'}
            >
              {customer.name || 'Sem Nome'}
            </h4>
            <div className="flex items-center text-xs text-slate-500 mt-1">
              <Phone className="h-3 w-3 mr-1" />
              {customer.phone || 'Sem Telefone'}
            </div>
          </div>
          {customer.urgency !== undefined && customer.urgency !== null && (
            <Badge
              variant="outline"
              className={cn(
                'shrink-0',
                customer.urgency >= 8
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : customer.urgency >= 5
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-green-50 text-green-700 border-green-200',
              )}
            >
              Urg. {customer.urgency}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
          {customer.neighborhood && (
            <div
              className="flex items-center text-xs text-slate-600 truncate"
              title={customer.neighborhood}
            >
              <MapPin className="h-3 w-3 mr-1 text-slate-400" />
              <span className="truncate">{customer.neighborhood}</span>
            </div>
          )}
          {customer.price_range && (
            <div
              className="flex items-center text-xs text-slate-600 truncate"
              title={customer.price_range}
            >
              <DollarSign className="h-3 w-3 mr-1 text-slate-400" />
              <span className="truncate">{customer.price_range}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
