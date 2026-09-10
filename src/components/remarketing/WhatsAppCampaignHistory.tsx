import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  History,
  Phone,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import {
  RemarketingCampaign,
  RemarketingRecipient,
  getRemarketingCampaigns,
  getRemarketingRecipients,
} from '@/services/whatsapp_campaigns'
import { formatPhone } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function WhatsAppCampaignHistory() {
  const [campaigns, setCampaigns] = useState<RemarketingCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [recipientsMap, setRecipientsMap] = useState<Record<string, RemarketingRecipient[]>>({})
  const [loadingRecipients, setLoadingRecipients] = useState<Record<string, boolean>>({})

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getRemarketingCampaigns()
      setCampaigns(data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const toggleCampaign = async (campaignId: string) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null)
      return
    }

    setExpandedCampaignId(campaignId)

    if (!recipientsMap[campaignId]) {
      setLoadingRecipients((prev) => ({ ...prev, [campaignId]: true }))
      try {
        const recipients = await getRemarketingRecipients(campaignId)
        setRecipientsMap((prev) => ({ ...prev, [campaignId]: recipients }))
      } catch {
        /* ignore */
      } finally {
        setLoadingRecipients((prev) => ({ ...prev, [campaignId]: false }))
      }
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 text-xs flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3" /> Enviado
          </Badge>
        )
      case 'requires_template':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 text-xs flex items-center gap-1"
          >
            <AlertTriangle className="h-3 w-3" /> Requer Template
          </Badge>
        )
      case 'failed':
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 text-xs flex items-center gap-1"
          >
            <XCircle className="h-3 w-3" /> Falhou
          </Badge>
        )
      case 'queued':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200 text-xs flex items-center gap-1"
          >
            <Clock className="h-3 w-3" /> Na Fila
          </Badge>
        )
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Campanhas de Remarketing WhatsApp
          </CardTitle>
          <CardDescription>
            Acompanhe o status de entrega e feedback detalhado por contato de cada disparo.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCampaigns}
          disabled={loading}
          className="h-8 gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-foreground">
              Nenhuma campanha de WhatsApp registrada
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione contatos na tabela acima, escreva a mensagem e faça o primeiro disparo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((camp) => {
              const isExpanded = expandedCampaignId === camp.id
              const recipients = recipientsMap[camp.id] || []
              const isLoadingRec = loadingRecipients[camp.id]

              return (
                <Collapsible
                  key={camp.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCampaign(camp.id)}
                  className="border rounded-lg overflow-hidden bg-card transition-colors"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-muted/40 gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="text-muted-foreground mt-0.5 sm:mt-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {camp.name}
                            </span>
                            {camp.segment && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {camp.segment}
                              </Badge>
                            )}
                            {camp.sync_meta_capi && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200"
                              >
                                + Meta CAPI
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            "{camp.message_text}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {camp.sent_count || 0}
                          </span>
                          <span
                            className="text-amber-600 font-semibold flex items-center gap-1"
                            title="Fora da janela de 24h"
                          >
                            <AlertTriangle className="h-3 w-3" />{' '}
                            {camp.requires_template_count || 0}
                          </span>
                          <span className="text-red-600 font-semibold flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> {camp.failed_count || 0}
                          </span>
                          <span className="text-muted-foreground">
                            / {camp.total_recipients || 0} total
                          </span>
                        </div>

                        <span className="text-muted-foreground">
                          {camp.created
                            ? format(new Date(camp.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/20 p-4 space-y-4">
                      {/* Metadados da Campanha */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-background p-3 rounded-md border">
                        <div>
                          <span className="text-muted-foreground">Template Meta: </span>
                          <span className="font-medium text-foreground">
                            {camp.template_name || '(Nenhum — Mensagem Livre)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sincronização CAPI: </span>
                          <span className="font-medium text-foreground">
                            {camp.sync_meta_capi
                              ? `Sim (${camp.capi_synced_count || 0} leads hash SHA-256)`
                              : 'Não'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status da Campanha: </span>
                          <Badge variant="outline" className="text-[10px] ml-1">
                            {camp.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Lista de Destinatários */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                            Status individual dos destinatários ({recipients.length})
                          </h5>
                          {isLoadingRec && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <RefreshCw className="h-3 w-3 animate-spin" /> Carregando...
                            </span>
                          )}
                        </div>

                        {isLoadingRec ? (
                          <div className="space-y-2 py-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                        ) : recipients.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">
                            Nenhum destinatário detalhado encontrado para esta campanha.
                          </p>
                        ) : (
                          <div className="border rounded-md bg-background overflow-hidden max-h-80 overflow-y-auto">
                            <Table>
                              <TableHeader className="bg-muted/50 sticky top-0">
                                <TableRow className="h-8 text-[11px]">
                                  <TableHead className="py-1">Contato</TableHead>
                                  <TableHead className="py-1">Telefone</TableHead>
                                  <TableHead className="py-1">Janela 24h</TableHead>
                                  <TableHead className="py-1">Status</TableHead>
                                  <TableHead className="py-1">Motivo / Retorno da Meta</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {recipients.map((rec) => (
                                  <TableRow key={rec.id} className="h-9 text-xs">
                                    <TableCell className="font-medium py-1">
                                      {rec.customer_name ||
                                        rec.expand?.customer_id?.name ||
                                        'Cliente'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground py-1">
                                      {formatPhone(rec.phone)}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {rec.in_24h_window ? (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] bg-green-50 text-green-700 border-green-200"
                                        >
                                          Dentro (24h)
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] bg-gray-50 text-gray-600 border-gray-200"
                                        >
                                          Fora (exige template)
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {renderStatusBadge(rec.status)}
                                    </TableCell>
                                    <TableCell
                                      className="text-[11px] text-muted-foreground max-w-xs truncate py-1"
                                      title={rec.error_message || rec.whatsapp_message_id}
                                    >
                                      {rec.error_message ? (
                                        <span className="text-red-600 dark:text-red-400">
                                          {rec.error_message}
                                        </span>
                                      ) : rec.whatsapp_message_id ? (
                                        <span className="text-green-600 font-mono text-[10px]">
                                          ID: {rec.whatsapp_message_id.slice(0, 16)}...
                                        </span>
                                      ) : (
                                        '—'
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
