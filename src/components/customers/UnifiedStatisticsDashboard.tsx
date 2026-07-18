import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, Send, MessageSquare, Mail, TrendingUp } from 'lucide-react'
import { getPlatformStats, type PlatformStats } from '@/services/statistics'
import { useRealtime } from '@/hooks/use-realtime'

export function UnifiedStatisticsDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    const data = await getPlatformStats()
    setStats(data)
    setLoading(false)
  }

  useEffect(() => {
    loadStats()
  }, [])

  useRealtime('email_campaigns', () => loadStats())
  useRealtime('system_logs', () => loadStats())

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const platforms = [
    {
      name: 'Meta CAPI',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
      metrics: [
        { label: 'Eventos', value: stats.metaCapi.totalEvents },
        { label: 'Sucesso', value: stats.metaCapi.successCount },
        { label: 'Taxa', value: `${stats.metaCapi.successRate}%` },
      ],
      rate: stats.metaCapi.successRate,
    },
    {
      name: 'Meta Messaging',
      icon: MessageSquare,
      color: 'text-green-600',
      bg: 'bg-green-500/10',
      metrics: [
        { label: 'Enviadas', value: stats.metaMessaging.totalSent },
        { label: 'Recebidas', value: stats.metaMessaging.totalReceived },
        { label: 'Entrega', value: `${stats.metaMessaging.deliveryRate}%` },
      ],
      rate: stats.metaMessaging.deliveryRate,
    },
    {
      name: 'Email Campaigns',
      icon: Mail,
      color: 'text-orange-600',
      bg: 'bg-orange-500/10',
      metrics: [
        { label: 'Campanhas', value: stats.emailCampaigns.totalCampaigns },
        { label: 'Abertura', value: `${stats.emailCampaigns.openRate}%` },
        { label: 'Cliques', value: `${stats.emailCampaigns.clickRate}%` },
      ],
      rate: stats.emailCampaigns.openRate,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {platforms.map((p) => {
        const Icon = p.icon
        return (
          <Card key={p.name} className="border-border/50 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${p.bg}`}>
                  <Icon className={`h-4 w-4 ${p.color}`} />
                </div>
                <span className="text-sm font-semibold">{p.name}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {p.metrics.map((m) => (
                  <div key={m.label} className="text-center">
                    <div className="text-lg font-bold leading-none">{m.value}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
              <Progress value={p.rate} className="h-1 mt-2" />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
