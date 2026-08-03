import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { runHealthCheck, type ConnectionHealthResult } from '@/services/connection-health'
import { useToast } from '@/hooks/use-toast'

export function ConnectionHealthDashboard() {
  const { toast } = useToast()
  const [results, setResults] = useState<ConnectionHealthResult[]>([])
  const [checking, setChecking] = useState(false)
  const [checkingKey, setCheckingKey] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState('')

  const runCheck = useCallback(
    async (connection?: string) => {
      if (connection) setCheckingKey(connection)
      else setChecking(true)
      try {
        const res = await runHealthCheck(connection)
        if (res.success && res.results) {
          setResults((prev) => {
            const map = new Map(prev.map((r) => [r.key, r]))
            for (const r of res.results) map.set(r.key, r)
            return Array.from(map.values())
          })
          setLastCheck(res.timestamp)
          toast({
            title: 'Verificação concluída',
            description: `${res.results.length} integração(ões) verificada(s) — somente leitura.`,
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro na verificação',
            description: res.error || 'Falha ao verificar conexões.',
          })
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro na verificação',
          description: err.message,
        })
      } finally {
        setChecking(false)
        setCheckingKey(null)
      }
    },
    [toast],
  )

  const getStatusIcon = (status: string) => {
    if (status === 'connected') return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (status === 'error') return <XCircle className="h-5 w-5 text-red-600" />
    return <AlertCircle className="h-5 w-5 text-yellow-500" />
  }

  const getStatusBadge = (status: string) => {
    if (status === 'connected')
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Conectado ✅</Badge>
      )
    if (status === 'error') return <Badge variant="destructive">Erro</Badge>
    if (status === 'not_configured') return <Badge variant="secondary">Não Configurado</Badge>
    return <Badge variant="secondary">Aguardando</Badge>
  }

  const isChecking = (key: string) => checking || checkingKey === key

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Painel de Saúde das Conexões</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Verificação não destrutiva (somente leitura — GET) de todas as integrações ativas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {lastCheck && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(lastCheck).toLocaleString('pt-BR')}
              </span>
            )}
            <Button onClick={() => runCheck()} disabled={checking}>
              {checking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Verificar Todas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {results.length === 0 ? (
          <div key="health-empty" className="text-center py-8">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Clique em &quot;Verificar Todas&quot; para executar uma verificação não destrutiva de
              todas as conexões. Nenhuma credencial será alterada — apenas leituras GET.
            </p>
          </div>
        ) : (
          <div key="health-results" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((r) => (
              <div
                key={r.key}
                className={cn(
                  'rounded-lg border p-4 space-y-3 transition-colors',
                  r.status === 'connected' && 'border-green-500/30 bg-green-500/5',
                  r.status === 'error' && 'border-red-500/30 bg-red-500/5',
                  r.status === 'not_configured' && 'border-yellow-500/30 bg-yellow-500/5',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(r.status)}
                    <span className="font-medium text-sm">{r.name}</span>
                  </div>
                  {getStatusBadge(r.status)}
                </div>
                <p className="text-xs text-muted-foreground break-words">{r.message}</p>
                {r.timestamp && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Última verificação: {new Date(r.timestamp).toLocaleString('pt-BR')}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => runCheck(r.key)}
                  disabled={isChecking(r.key)}
                >
                  {isChecking(r.key) ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Verificar Agora
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ConnectionHealthDashboard
