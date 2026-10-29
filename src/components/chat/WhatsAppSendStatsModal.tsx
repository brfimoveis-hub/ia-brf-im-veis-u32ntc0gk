import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Send,
  CheckCircle2,
  CheckCheck,
  Eye,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { getWhatsAppSendStats, type WhatsAppSendStatsResponse } from '@/services/whatsapp_stats'

export function WhatsAppSendStatsModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<WhatsAppSendStatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getWhatsAppSendStats()
      setData(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Erro ao carregar raio-x de envios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadStats()
    }
  }, [open])

  const totals = data?.totals
  const rates = data?.rates_percent

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          title="Ver Raio-X de disparos e status dos últimos 7 dias"
        >
          <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Raio-X de Envios</span>
          <span className="sm:hidden">Envios</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 mr-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Raio-X de Envios & Retorno (Últimos 7 dias)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Auditoria de disparos da régua, callbacks da Meta (entregues/lidos/falhas) e
                  respostas dos clientes
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadStats}
              disabled={loading}
              className="h-8 w-8 p-0"
              title="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            <span>Consultando raio-x dos últimos 7 dias...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grid de Totais Principais */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Enviadas */}
              <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <Send className="h-3.5 w-3.5 text-blue-500" />
                    Enviadas (IA/Régua)
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {totals?.enviadas ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Confirmadas pela Meta com wamid
                </div>
              </div>

              {/* Entregues */}
              <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                    Entregues
                  </span>
                  {rates?.taxa_entrega !== undefined && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {rates.taxa_entrega}%
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {totals?.entregues ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Chegaram ao aparelho do cliente
                </div>
              </div>

              {/* Lidas */}
              <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-cyan-500" />
                    Lidas (Read)
                  </span>
                  {rates?.taxa_leitura !== undefined && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {rates.taxa_leitura}%
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {totals?.lidas ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Azuladas / abertas pelo lead
                </div>
              </div>

              {/* Falhas */}
              <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    Falhas de Entrega
                  </span>
                </div>
                <div
                  className={`text-2xl font-bold ${(totals?.falhas ?? 0) > 0 ? 'text-red-600' : 'text-slate-500'}`}
                >
                  {totals?.falhas ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">Erros reportados pela Meta</div>
              </div>

              {/* Recebidas de Clientes */}
              <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                    Respostas de Leads
                  </span>
                  {rates?.taxa_resposta !== undefined && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {rates.taxa_resposta}%
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {totals?.recebidas_de_clientes ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">Mensagens recebidas no CRM</div>
              </div>

              {/* Outros / Sent */}
              <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                    Outros Status
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {totals?.outros ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">Eventos 'sent' e transições</div>
              </div>
            </div>

            {/* Aviso informativo de ativação dos callbacks */}
            <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="h-4 w-4" />
                <span>Instrumentação de Status Ativa</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-700 dark:text-blue-300/90">
                Os envios da régua (ex.: lotes de 29/10) foram aceitos pela Meta com HTTP 200. A
                partir de agora, os novos callbacks de <strong>entregue</strong>,{' '}
                <strong>lido</strong> e eventuais <strong>falhas</strong> ficam gravados em tempo
                real assim que os aparelhos dos destinatários receberem o sinal.
              </p>
            </div>

            {/* Tabela dos últimos 7 dias */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2 border-b text-xs font-semibold text-slate-700 dark:text-slate-300">
                Histórico Diário (Últimos 7 dias)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-100/50 dark:bg-slate-800/50 text-muted-foreground">
                      <th className="py-2 px-3 text-left font-medium">Data</th>
                      <th className="py-2 px-3 text-right font-medium">Enviadas</th>
                      <th className="py-2 px-3 text-right font-medium">Entregues</th>
                      <th className="py-2 px-3 text-right font-medium">Lidas</th>
                      <th className="py-2 px-3 text-right font-medium">Falhas</th>
                      <th className="py-2 px-3 text-right font-medium">Respostas Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(data?.daily_history || []).map((day) => {
                      const [y, m, d] = day.date.split('-')
                      const formattedDate = `${d}/${m}/${y}`
                      return (
                        <tr
                          key={day.date}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                        >
                          <td className="py-2 px-3 font-medium">{formattedDate}</td>
                          <td className="py-2 px-3 text-right font-semibold text-blue-600">
                            {day.enviadas}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                            {day.entregues}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-cyan-600">
                            {day.lidas}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-red-600">
                            {day.falhas}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-amber-600">
                            {day.recebidas_de_clientes}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
