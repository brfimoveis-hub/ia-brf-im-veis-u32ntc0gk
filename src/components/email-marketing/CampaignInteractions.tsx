import { type EmailDelivery } from '@/services/email_campaigns'
import { Badge } from '@/components/ui/badge'
import { MailOpen, MousePointerClick, Star } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  deliveries: EmailDelivery[]
  engagedCustomerIds: Set<string>
}

export function CampaignInteractions({ deliveries, engagedCustomerIds }: Props) {
  const interacted = deliveries.filter((d) => d.opened_at || d.clicked_at)
  const sorted = [...interacted].sort((a, b) => {
    const aTime = new Date(a.clicked_at || a.opened_at || 0).getTime()
    const bTime = new Date(b.clicked_at || b.opened_at || 0).getTime()
    return bTime - aTime
  })

  if (sorted.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Nenhuma interação registrada ainda.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b sticky top-0">
          <tr>
            <th className="text-left p-3 font-medium">Cliente</th>
            <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
            <th className="text-center p-3 font-medium">Abriu</th>
            <th className="text-center p-3 font-medium">Clicou</th>
            <th className="text-center p-3 font-medium hidden lg:table-cell">Vezes Aberto</th>
            <th className="text-center p-3 font-medium hidden lg:table-cell">Vezes Clicado</th>
            <th className="text-left p-3 font-medium">Última Interação</th>
            <th className="text-center p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => {
            const customer = d.expand?.customer_id
            const isEngaged = engagedCustomerIds.has(d.customer_id)
            const lastInteraction = d.clicked_at || d.opened_at
            return (
              <tr key={d.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{customer?.name || customer?.first_name || '—'}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">
                  {customer?.email || customer?.email_1_value || '—'}
                </td>
                <td className="p-3 text-center">
                  {d.opened_at ? <MailOpen className="h-4 w-4 text-green-500 inline" /> : '—'}
                </td>
                <td className="p-3 text-center">
                  {d.clicked_at ? (
                    <MousePointerClick className="h-4 w-4 text-blue-500 inline" />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3 text-center hidden lg:table-cell">{d.open_count || 0}</td>
                <td className="p-3 text-center hidden lg:table-cell">{d.click_count || 0}</td>
                <td className="p-3 text-muted-foreground text-xs">
                  {lastInteraction
                    ? format(new Date(lastInteraction), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                    : '—'}
                </td>
                <td className="p-3 text-center">
                  {isEngaged ? (
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                      <Star className="h-3 w-3 mr-1" /> Engajado
                    </Badge>
                  ) : d.opened_at && d.clicked_at ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      Interagiu
                    </Badge>
                  ) : d.clicked_at ? (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Clicou</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Abriu</Badge>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
