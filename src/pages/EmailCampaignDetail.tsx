import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getCampaign,
  getDeliveries,
  type EmailCampaign,
  type EmailDelivery,
} from '@/services/email_campaigns'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function EmailCampaignDetail() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null)
  const [deliveries, setDeliveries] = useState<EmailDelivery[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!campaignId) return
    try {
      const [c, d] = await Promise.all([getCampaign(campaignId), getDeliveries(campaignId)])
      setCampaign(c)
      setDeliveries(d)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [campaignId])
  useRealtime('email_deliveries', () => {
    if (campaignId) loadData()
  })
  useRealtime('email_campaigns', () => {
    if (campaignId) loadData()
  })

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!campaign) {
    return <div className="p-8 text-center text-muted-foreground">Campanha não encontrada.</div>
  }

  const pending = deliveries.filter((d) => d.status === 'pending').length
  const sent = deliveries.filter((d) => d.status === 'sent').length
  const failed = deliveries.filter((d) => d.status === 'failed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/email-marketing">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">{campaign.subject}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{campaign.total_recipients || deliveries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Enviados</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Falhas</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pending}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Relatório de Entregas</h2>
          </div>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Cliente</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Erro</th>
                  <th className="text-left p-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      Nenhuma entrega registrada.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((d) => {
                    const customer = d.expand?.customer_id
                    return (
                      <tr key={d.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">
                          {customer?.name || customer?.first_name || '—'}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {customer?.email || customer?.email_1_value || '—'}
                        </td>
                        <td className="p-3 text-center">
                          {d.status === 'sent' ? (
                            <CheckCircle className="h-5 w-5 text-green-500 inline" />
                          ) : d.status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-red-500 inline" />
                          ) : (
                            <Clock className="h-5 w-5 text-amber-500 inline" />
                          )}
                        </td>
                        <td className="p-3 text-red-600 text-xs">{d.error_message || '—'}</td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {format(new Date(d.created), 'dd/MM HH:mm', { locale: ptBR })}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
