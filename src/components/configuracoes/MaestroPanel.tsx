import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Crown, Play, RefreshCw, Loader2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import {
  type MaestroInsight,
  type MaestroLearning,
  getMaestroInsights,
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
      <CardContent className="pt-0 px-4 pb-4">
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
