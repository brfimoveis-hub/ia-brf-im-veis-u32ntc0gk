import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCampaigns, deleteCampaign, type EmailCampaign } from '@/services/email_campaigns'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateCampaignModal } from '@/components/email-marketing/CreateCampaignModal'
import { ImportCustomersModal } from '@/components/email-marketing/ImportCustomersModal'
import {
  Loader2,
  Plus,
  Upload,
  Trash2,
  Eye,
  XCircle,
  Mail,
  MailOpen,
  MousePointerClick,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

export default function EmailMarketing() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const loadData = async () => {
    try {
      setCampaigns(await getCampaigns())
    } catch {
      toast.error('Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('email_campaigns', () => {
    loadData()
  })

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id)
      toast.success('Campanha excluída')
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  const totalSent = campaigns.reduce((s, c) => s + (c.success_count || 0), 0)
  const totalFailed = campaigns.reduce((s, c) => s + (c.failure_count || 0), 0)
  const totalOpens = campaigns.reduce((s, c) => s + (c.unique_opens || 0), 0)
  const totalClicks = campaigns.reduce((s, c) => s + (c.unique_clicks || 0), 0)
  const openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0
  const clickRate = totalOpens > 0 ? Math.round((totalClicks / totalOpens) * 100) : 0
  const successRate =
    totalSent + totalFailed > 0 ? Math.round((totalSent / (totalSent + totalFailed)) * 100) : 0

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      sending: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    }
    const label: Record<string, string> = {
      draft: 'Rascunho',
      sending: 'Enviando',
      completed: 'Concluída',
      failed: 'Falhou',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || ''}`}>
        {label[status] || status}
      </span>
    )
  }

  const cOpenRate = (c: EmailCampaign) =>
    c.success_count > 0 ? Math.round(((c.unique_opens || 0) / c.success_count) * 100) : 0
  const cClickRate = (c: EmailCampaign) =>
    (c.unique_opens || 0) > 0
      ? Math.round(((c.unique_clicks || 0) / (c.unique_opens || 0)) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Marketing</h1>
          <p className="text-muted-foreground">Gerencie campanhas e monitore engajamento.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Clientes
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Enviados</p>
              <p className="text-2xl font-bold">{totalSent}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <MailOpen className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Abertos ({openRate}%)</p>
              <p className="text-2xl font-bold">{totalOpens}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <MousePointerClick className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clicados ({clickRate}%)</p>
              <p className="text-2xl font-bold">{totalClicks}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Falhas ({100 - successRate}%)</p>
              <p className="text-2xl font-bold">{totalFailed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Campanha</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Enviados</th>
                  <th className="text-center p-3 font-medium hidden md:table-cell">Abertos</th>
                  <th className="text-center p-3 font-medium hidden md:table-cell">Clicados</th>
                  <th className="text-center p-3 font-medium hidden lg:table-cell">Falhas</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Data</th>
                  <th className="text-right p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-muted-foreground">
                      Nenhuma campanha criada ainda.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.subject}</p>
                          </div>
                          {cOpenRate(c) >= 50 && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 hidden sm:inline-flex">
                              Alto Engajamento
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">{statusBadge(c.status)}</td>
                      <td className="p-3 text-center text-blue-600 font-medium">
                        {c.success_count || 0}
                      </td>
                      <td className="p-3 text-center text-green-600 font-medium hidden md:table-cell">
                        {c.unique_opens || 0}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({cOpenRate(c)}%)
                        </span>
                      </td>
                      <td className="p-3 text-center text-purple-600 font-medium hidden md:table-cell">
                        {c.unique_clicks || 0}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({cClickRate(c)}%)
                        </span>
                      </td>
                      <td className="p-3 text-center text-red-600 font-medium hidden lg:table-cell">
                        {c.failure_count || 0}
                      </td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">
                        {format(new Date(c.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <Link to={`/email-marketing/${c.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateCampaignModal open={showCreate} onOpenChange={setShowCreate} onSuccess={loadData} />
      <ImportCustomersModal open={showImport} onOpenChange={setShowImport} onSuccess={() => {}} />
    </div>
  )
}
