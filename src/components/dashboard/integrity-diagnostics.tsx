import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShieldCheck, Loader2, CheckCircle2, XCircle, RefreshCw, FileText } from 'lucide-react'
import { runAllDiagnostics, type DiagnosticResult } from '@/services/diagnostics'
import { getMetaLogs, type SystemLog } from '@/services/system_logs'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

export function IntegrityDiagnostics() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<SystemLog[]>([])

  const handleRun = useCallback(async () => {
    setIsRunning(true)
    try {
      const res = await runAllDiagnostics()
      setResults(res)
      setHasRun(true)
    } finally {
      setIsRunning(false)
    }
  }, [])

  const handleShowLogs = useCallback(async () => {
    try {
      const res = await getMetaLogs()
      setLogs(res.items)
    } catch {
      setLogs([])
    }
    setShowLogs(true)
  }, [])

  useRealtime('system_logs', () => {
    if (showLogs) {
      getMetaLogs()
        .then((res) => setLogs(res.items))
        .catch(() => {})
    }
  })

  const passedCount = results.filter((r) => r.success).length

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-xl">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Diagnóstico de Integridade</CardTitle>
              <CardDescription>Verificação read-only das integrações Meta</CardDescription>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowLogs}
              className="flex-1 sm:flex-none"
            >
              <FileText className="h-4 w-4 mr-2" /> Ver Logs de Integração
            </Button>
            <Button
              onClick={handleRun}
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Verificando...' : 'Diagnóstico de Integridade'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasRun && !isRunning && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Badge
                variant="outline"
                className={cn(
                  passedCount === results.length
                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                )}
              >
                {passedCount}/{results.length} integrações saudáveis
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleRun}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Testar Novamente
              </Button>
            </div>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    r.success
                      ? 'border-green-200 dark:border-green-900/50 bg-green-500/5'
                      : 'border-red-200 dark:border-red-900/50 bg-red-500/5',
                  )}
                >
                  {r.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{r.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs shrink-0',
                          r.success
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : 'bg-red-500/10 text-red-600 border-red-500/20',
                        )}
                      >
                        {r.success ? '✅ OK' : '❌ Falha'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 break-words">{r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {!hasRun && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              Clique em "Diagnóstico de Integridade" para verificar todas as integrações Meta.
            </p>
            <p className="text-xs mt-1">Teste read-only — nenhuma configuração será alterada.</p>
          </div>
        )}
        {isRunning && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-green-600" />
            <p className="text-sm text-muted-foreground mt-2">
              Executando testes de integridade...
            </p>
          </div>
        )}
      </CardContent>

      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Logs de Integração</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum log encontrado. Execute um teste para gerar logs.
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {log.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm break-words">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
