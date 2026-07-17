import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getCampaign,
  getDeliveries,
  getEngagedCustomerIds,
  type EmailCampaign,
  type EmailDelivery,
} from '@/services/email_campaigns'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CampaignInteractions } from '@/components/email-marketing/CampaignInteractions'
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MailOpen,
  MousePointerClick,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function EmailCampaignDetail() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null)
  const [deliveries, setDeliveries] = useState<EmailDelivery[]>([])
  const [engagedIds, setEngagedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!campaignId) return
    try {
      const [c, d, engaged] = await Promise.all([
        getCampaign(campaignId),
        getDeliveries(campaignId),
        getEngagedCustomerIds(),
      ])
      setCampaign(c)
      setDeliveries(d)
      setEngagedIds(engaged)
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
  const opened = deliveries.filter((d) => d.opened_at).length
  const clicked = deliveries.filter((d) => d.clicked_at).length
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0
  const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Enviados</span>
            </div>
            <p className="text-2xl font-bold">{sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MailOpen className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Abertos ({openRate}%)</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{opened}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Clicados ({clickRate}%)</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{clicked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Sucessos</span>
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

      <Tabs defaultValue="deliveries">
        <TabsList>
          <TabsTrigger value="deliveries">Entregas</TabsTrigger>
          <TabsTrigger value="interactions">Interações ({opened + clicked})</TabsTrigger>
        </TabsList>
        <TabsContent value="deliveries">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
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
                            <td className="p-3 text-muted-foreground hidden md:table-cell">
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
        </TabsContent>
        <TabsContent value="interactions">
          <Card>
            <CardContent className="p-0">
              <CampaignInteractions deliveries={deliveries} engagedCustomerIds={engagedIds} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
