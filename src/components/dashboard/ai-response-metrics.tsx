import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getAIResponseMetrics,
  formatResponseTime,
  type AIResponseMetrics,
} from '@/services/analytics'
import { Clock, Zap, Gauge, TrendingUp, Loader2 } from 'lucide-react'

const DEFAULT_METRICS: AIResponseMetrics = {
  averageResponseTimeSeconds: 0,
  totalPairs: 0,
  fastestResponseSeconds: 0,
  slowestResponseSeconds: 0,
}

export function AIResponseMetricsCard() {
  const [metrics, setMetrics] = useState<AIResponseMetrics>(DEFAULT_METRICS)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const result = await getAIResponseMetrics()
      setMetrics(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('conversations', () => {
    loadData()
  })

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Performance da IA
        </CardTitle>
        <CardDescription>Velocidade de resposta do assistente virtual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tempo Médio de Resposta</p>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <p className="text-2xl font-bold text-primary">
                  {formatResponseTime(metrics.averageResponseTimeSeconds)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/30 text-center">
            <Zap className="h-4 w-4 text-green-500 mb-1" />
            <p className="text-xs text-muted-foreground">Mais rápida</p>
            <p className="text-sm font-semibold">
              {loading ? '...' : formatResponseTime(metrics.fastestResponseSeconds)}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/30 text-center">
            <TrendingUp className="h-4 w-4 text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground">Mais lenta</p>
            <p className="text-sm font-semibold">
              {loading ? '...' : formatResponseTime(metrics.slowestResponseSeconds)}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/30 text-center">
            <Gauge className="h-4 w-4 text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground">Respostas</p>
            <p className="text-sm font-semibold">{loading ? '...' : metrics.totalPairs}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
