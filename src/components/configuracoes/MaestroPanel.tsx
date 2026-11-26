import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import {
  Crown,
  Play,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Flame,
  Thermometer,
  Snowflake,
  UserCog,
} from 'lucide-react'
import {
  type MaestroInsight,
  type MaestroLearning,
  type MaestroCrmNeed,
  type MaestroCrmTotais,
  getMaestroInsights,
  getMaestroCrmNeeds,
  runMaestroCycle,
  TIPO_LABELS,
} from '@/services/bia_maestro'

function formatCiclo(ciclo: string): string {
  const [y, m, d] = ciclo.split('-')
  if (!y || !m || !d) return ciclo
  return `${d}/${m}/${y}`
}

const TIPO_COLORS: Record<string, string> = {
  demanda_nao_resolvida: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  pergunta_repetida: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  erro_repetido: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  oportunidade: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  objecao: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
}

function InsightCard({ insight }: { insight: MaestroInsight }) {
  const isError = insight.status !== 'ok'
  return (
    <Card className="border-muted">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isError ? (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <CardTitle className="text-sm font-semibold truncate">
              Ciclo {formatCiclo(insight.ciclo)}
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={
              isError
                ? 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
            }
          >
            {isError ? 'Erro (não afetou o atendimento)' : 'OK'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Gravado em{' '}
          {insight.created
            ? new Date(insight.created.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')
            : '—'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {insight.resumo && <p className="text-sm leading-relaxed">{insight.resumo}</p>}
        {isError && insight.error && (
          <p className="text-xs text-rose-600 bg-rose-500/5 rounded-md p-2 break-words">
            {insight.error}
          </p>
        )}
        {Array.isArray(insight.learnings) && insight.learnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Aprendizados ({insight.learnings.length})
            </p>
            <ul className="space-y-1.5">
              {insight.learnings.map((l: MaestroLearning, i: number) => (
                <li key={i} className="flex flex-col gap-1 text-sm">
                  <div className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] px-1.5 py-0 ${TIPO_COLORS[l.tipo] || 'bg-slate-500/10 text-slate-600 border-slate-500/20'}`}
                    >
                      {TIPO_LABELS[l.tipo] || l.tipo || 'Aprendizado'}
                    </Badge>
                    <span className="text-sm leading-snug">{l.texto}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {insight.metrics && (
          <p className="text-[11px] text-muted-foreground">
            {typeof insight.metrics.mensagens_clientes === 'number' &&
              `${insight.metrics.mensagens_clientes} msgs de clientes · `}
            {typeof insight.metrics.respostas_bia === 'number' &&
              `${insight.metrics.respostas_bia} respostas da Bia · `}
            {typeof insight.metrics.sem_resposta === 'number' &&
              `${insight.metrics.sem_resposta} sem resposta há +2h`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function MaestroPanel() {
  const { user } = useAuth()
  const [insights, setInsights] = useState<MaestroInsight[]>([])
  const [crmNeeds, setCrmNeeds] = useState<MaestroCrmNeed[]>([])
  const [crmTotaisRota, setCrmTotaisRota] = useState<MaestroCrmTotais | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(false)

  const loadInsights = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(false)
    try {
      const list = await getMaestroInsights()
      setInsights(list)
      try {
        const crm = await getMaestroCrmNeeds()
        setCrmNeeds(crm.clientes)
        setCrmTotaisRota(crm.totais)
      } catch (crmErr) {
        console.warn('Erro ao carregar CRM do Maestro:', crmErr)
        setCrmNeeds([])
        setCrmTotaisRota(undefined)
      }
    } catch (err) {
      console.warn('Erro ao carregar insights do Maestro:', err)
      setError(true)
      try {
        // Fallback: leitura direta pela coleção (mesma fonte do hook)
        const records = await pb
          .collection('bia_maestro_insights')
          .getFullList<MaestroInsight>({ sort: '-created' })
        setInsights(records)
        setError(false)
      } catch (err2) {
        console.warn('Erro no fallback de insights do Maestro:', err2)
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  // Totais quente/morno/frio: do último ciclo gravado; se o último ciclo não
  // trouxer contagens, conta direto nos clientes já classificados no CRM.
  const crmTotais = useMemo(() => {
    // Fonte principal: totais REAIS da base (rota maestro_crm_needs, contagem SQL
    // na coleção customers — inclui tudo já classificado, não só o último ciclo).
    if (crmTotaisRota) {
      return {
        quentes: crmTotaisRota.quente || 0,
        mornos: crmTotaisRota.morno || 0,
        frios: crmTotaisRota.frio || 0,
        classificados: crmTotaisRota.classificados || 0,
        fonte: 'rota' as const,
      }
    }
    // Fallback: totais do último ciclo gravado.
    const last = insights.find((i) => i.status === 'ok' && i.metrics) || insights[0]
    const m = last?.metrics as Record<string, number | undefined> | undefined
    if (m && typeof m.crm_quentes === 'number') {
      return {
        quentes: m.crm_quentes || 0,
        mornos: m.crm_mornos || 0,
        frios: m.crm_frios || 0,
        classificados: 0,
        fonte: 'ciclo' as const,
      }
    }
    const counts = { quentes: 0, mornos: 0, frios: 0 }
    for (const n of crmNeeds) {
      if (n.temperature === 'quente') counts.quentes++
      else if (n.temperature === 'morno') counts.mornos++
      else counts.frios++
    }
    return { ...counts, classificados: 0, fonte: 'crm' as const }
  }, [insights, crmNeeds, crmTotaisRota])

  const handleRunCycle = async () => {
    setRunning(true)
    try {
      const res = await runMaestroCycle()
      const st = res?.outcome?.status
      if (st === 'already_ran_today') {
        toast.info('O ciclo de hoje já rodou. O Maestro roda 1x por dia (e o cron roda às 03:00).')
      } else if (st === 'error_logged') {
        toast.warning('Ciclo rodou, mas com erro registrado — veja o card do ciclo no painel.')
      } else if (st === 'ok') {
        toast.success('Ciclo rodado com sucesso: aprendizados gravados.')
      } else if (st === 'already_ran_today_crm') {
        toast.info('Ciclo de hoje já tinha rodado — a fase CRM do Maestro foi atualizada.')
      } else {
        toast.info('Ciclo concluído.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error('Falha ao rodar o ciclo do Maestro: ' + message)
    } finally {
      await loadInsights()
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Crown className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">Maestro — Ciclo de Valor</CardTitle>
              <CardDescription className="text-xs">
                Mentor da Bia: analisa o trabalho real do dia e gera aprendizados. Roda 1x/dia às
                03:00 (não afeta o atendimento).
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadInsights}
              disabled={loading}
              aria-label="Recarregar insights do Maestro"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button type="button" size="sm" onClick={handleRunCycle} disabled={running || loading}>
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rodando ciclo...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Rodar ciclo agora
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4 space-y-4">
        {/* ---- Seção CRM: temperatura dos leads + quem precisa de ação humana ---- */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="text-sm font-semibold">CRM — temperatura dos leads (último ciclo)</p>
          </div>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border bg-rose-500/5 p-2 text-center">
                  <p className="text-lg font-bold text-rose-600 flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4" /> {crmTotais.quentes}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Quentes</p>
                </div>
                <div className="rounded-md border bg-amber-500/5 p-2 text-center">
                  <p className="text-lg font-bold text-amber-600 flex items-center justify-center gap-1">
                    <Thermometer className="w-4 h-4" /> {crmTotais.mornos}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Mornos</p>
                </div>
                <div className="rounded-md border bg-sky-500/5 p-2 text-center">
                  <p className="text-lg font-bold text-sky-600 flex items-center justify-center gap-1">
                    <Snowflake className="w-4 h-4" /> {crmTotais.frios}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Frios</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {crmTotais.fonte === 'rota'
                  ? `Fonte: contagem real da base de clientes (${crmTotais.classificados} classificados). Clientes em campanha ativa (régua/convite) não são reclassificados.`
                  : crmTotais.fonte === 'ciclo'
                    ? 'Fonte: último ciclo gravado (bia_maestro_insights). Clientes em campanha ativa (régua/convite) não são reclassificados.'
                    : 'Fonte: contagem direta de clientes classificados no CRM. Clientes em campanha ativa (régua/convite) não são reclassificados.'}
              </p>

              {/* Clientes que precisam de ação humana */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-rose-500 shrink-0" />
                  <p className="text-sm font-semibold">
                    Precisam de ação humana ({crmNeeds.length})
                  </p>
                </div>
                {crmNeeds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum cliente precisa de ação humana agora.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {crmNeeds.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-md border bg-background p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{n.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {n.motivo || 'sinalizado pelo último ciclo'}
                            {n.interest && n.interest !== 'não detectado'
                              ? ' · interesse: ' + n.interest
                              : ''}
                          </p>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-xs h-7"
                        >
                          <a
                            href={`/atendimentos/clientes?cliente=${n.id}`}
                            aria-label={'Abrir atendimento de ' + n.name}
                          >
                            Abrir
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error && insights.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Não foi possível carregar os insights do Maestro.
          </p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum ciclo registrado ainda. Use "Rodar ciclo agora" para gerar o primeiro.
          </p>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {insights.map((ins) => (
              <InsightCard key={ins.id} insight={ins} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MaestroPanel
