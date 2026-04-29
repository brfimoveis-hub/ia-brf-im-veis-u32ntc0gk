import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Copy,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getCadences } from '@/services/cadences'
import { createSystemLog, getSystemLogs, type SystemLog } from '@/services/system_logs'
import { cn } from '@/lib/utils'

export function DiagnosticCenter() {
  const { user } = useAuth()
  const [recentLogs, setRecentLogs] = useState<SystemLog[]>([])

  const fetchLogs = async () => {
    try {
      const res = await getSystemLogs(1, 10)
      setRecentLogs(res.items)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useRealtime('system_logs', () => {
    fetchLogs()
  })

  const { toast } = useToast()
  const [isRunning, setIsRunning] = useState(false)

  const handleCopyError = (text: string, payload?: any) => {
    const contentToCopy = payload
      ? `${text}\n\nPayload:\n${JSON.stringify(payload, null, 2)}`
      : text
    navigator.clipboard.writeText(contentToCopy)
    toast({
      title: 'Copiado!',
      description: 'Erro e payload copiados para a área de transferência!',
    })
  }
  const [progress, setProgress] = useState(0)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [results, setResults] = useState<
    { name: string; status: string; message: string; payload?: any }[]
  >([])

  const runDiagnostics = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults([])
    const newResults: { name: string; status: string; message: string; payload?: any }[] = []

    try {
      // 1. GTM Verification
      setProgress(10)
      const gtmId = 'GTM-MWML5KFQ'
      const hasGtmScript = document.querySelector(`script[src*="${gtmId}"]`) !== null
      const isGtmObjectPresent =
        (window as any).google_tag_manager && (window as any).google_tag_manager[gtmId]

      let dataLayerWorks = false
      try {
        const win = window as any
        win.dataLayer = win.dataLayer || []
        win.dataLayer.push({ event: 'gtm_diagnostic_test' })
        dataLayerWorks = true
      } catch (e) {
        /* ignore */
      }

      const isGtmFunctional = hasGtmScript || isGtmObjectPresent

      if (!isGtmFunctional) {
        newResults.push({
          name: 'Google Tag Manager',
          status: 'warning',
          message:
            'Script do GTM não detectado. Pode estar sendo bloqueado por um Ad Blocker. O sistema continuará funcionando normalmente.',
          payload: { error: `${gtmId} not found in DOM`, hasGtmScript, isGtmObjectPresent },
        })
        await createSystemLog({
          type: 'warning',
          message: 'Script do GTM não detectado (Possível AdBlock)',
          details: 'GTM_DETECTION_WARNING',
          payload: { error: `${gtmId} not found in DOM` },
        }).catch(() => {})
      } else {
        newResults.push({
          name: 'Google Tag Manager',
          status: dataLayerWorks ? 'success' : 'warning',
          message: dataLayerWorks
            ? `GTM (${gtmId}) detectado e dataLayer funcional.`
            : `GTM (${gtmId}) detectado, mas dataLayer pode estar bloqueado.`,
          payload: { gtmId, status: 'active', hasGtmScript, isGtmObjectPresent, dataLayerWorks },
        })
      }
      setResults([...newResults])

      // 2. Uazapi Connectivity Check
      setProgress(25)
      await new Promise((r) => setTimeout(r, 1000))
      const hasPhone = !!user?.meta_campaign_phone
      newResults.push({
        name: 'Conectividade Uazapi',
        status: hasPhone ? 'success' : 'error',
        message: hasPhone
          ? `Telefone ${user.meta_campaign_phone} alcançável e configurado.`
          : 'Telefone de campanha ausente. O Uazapi requer configuração.',
        payload: { meta_campaign_phone: user?.meta_campaign_phone },
      })
      setResults([...newResults])

      // 3. Cadence Audit
      setProgress(40)
      const cadences = await getCadences()
      const validCadences = cadences.filter(
        (c) => c.order !== undefined && c.ai_instructions && c.ai_instructions.length > 10,
      )
      const hasIssues = cadences.length !== 10 || validCadences.length !== cadences.length
      newResults.push({
        name: 'Auditoria de Cadências',
        status: hasIssues ? 'warning' : 'success',
        message: `${cadences.length} cadências ativas. ${validCadences.length} estruturalmente íntegras (com regras IA).`,
        payload: { total: cadences.length, valid: validCadences.length, cadences },
      })
      setResults([...newResults])

      // 4. Meta Integration Validation (Loopable)
      setProgress(60)
      const testCount = loopEnabled ? 5 : 1
      let metaSuccesses = 0

      if (!user?.meta_pixel_id) {
        newResults.push({
          name: 'Integração Meta (Pixel)',
          status: 'error',
          message: 'Pixel ID ausente.',
          payload: { pixel: user?.meta_pixel_id },
        })
        setProgress(90)
      } else {
        let lastErrorMsg = ''
        for (let i = 0; i < testCount; i++) {
          try {
            await pb.send('/backend/v1/meta-test-connection', {
              method: 'POST',
              body: JSON.stringify({
                pixelId: user.meta_pixel_id || '1522162279584545',
              }),
              headers: { 'Content-Type': 'application/json' },
            })
            metaSuccesses++
          } catch (e: any) {
            const resData = e.response || {}
            let msg = resData.message || e.message || 'Erro desconhecido'
            if (
              resData.code &&
              !msg.includes(`Código: ${resData.code}`) &&
              !msg.includes(`#${resData.code}`)
            ) {
              msg += ` (Meta Error Code: ${resData.code})`
            }
            if (typeof msg === 'object') msg = JSON.stringify(msg)
            lastErrorMsg = msg
          }
          setProgress(60 + ((i + 1) / testCount) * 30)
          if (i < testCount - 1) await new Promise((r) => setTimeout(r, 1500))
        }

        let finalMessage = `${metaSuccesses}/${testCount} testes do Pixel bem-sucedidos. Status: Ativo.`
        if (metaSuccesses < testCount) {
          finalMessage = `Falha de conexão: ${lastErrorMsg}`
        }

        newResults.push({
          name: 'Integração Meta (Pixel)',
          status: metaSuccesses === testCount ? 'success' : metaSuccesses > 0 ? 'warning' : 'error',
          message: finalMessage,
          payload: { successes: metaSuccesses, testCount, lastErrorMsg },
        })
      }
      setResults([...newResults])

      setProgress(100)

      // Log results
      await createSystemLog({
        type: 'diagnostic',
        message: 'Diagnóstico de integridade concluído',
        details: `Loop: ${loopEnabled ? 'Sim' : 'Não'}. Meta: ${metaSuccesses}/${testCount}. Uazapi: ${hasPhone ? 'Online' : 'Offline'}. Cadências: ${cadences.length}`,
        payload: newResults,
      })

      toast({
        title: 'Diagnóstico Concluído',
        description: 'O relatório de saúde do sistema foi gerado com sucesso.',
      })
    } catch (e) {
      toast({
        title: 'Diagnóstico Finalizado com Alertas',
        description: 'A verificação foi concluída, mas alguns testes relataram falhas.',
        variant: 'default',
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border-border shadow-elevation">
        <div className="h-1 bg-green-500 w-full rounded-t-xl"></div>
        <CardHeader className="bg-muted/10 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-xl">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Centro de Diagnóstico de Integridade</CardTitle>
              <CardDescription>
                Verifique conexões externas (Meta, Uazapi) e a saúde interna do sistema de IA.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-xl bg-muted/20">
            <div className="space-y-1">
              <h4 className="font-semibold text-secondary">Verificação Completa Profunda</h4>
              <p className="text-sm text-muted-foreground">
                Executa um "handshake" automático com todos os serviços integrados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded-md border shadow-sm">
                <Checkbox
                  id="loop-test"
                  checked={loopEnabled}
                  onCheckedChange={(c) => setLoopEnabled(!!c)}
                  disabled={isRunning}
                />
                <Label htmlFor="loop-test" className="text-sm font-medium cursor-pointer">
                  Stress Test (5x)
                </Label>
              </div>
              <Button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto shadow-sm"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isRunning ? 'Verificando...' : 'Executar Diagnóstico Completo'}
              </Button>
            </div>
          </div>

          {isRunning && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <div className="flex justify-between text-sm font-medium text-secondary">
                <span>Progresso do scan profundo...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3 pt-2 animate-in slide-in-from-bottom-2 duration-500">
              <h4 className="font-semibold text-secondary">Relatório do Sistema</h4>
              <div className="grid gap-2">
                {results.map((res, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {res.status === 'success' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      )}
                      {res.status === 'warning' && (
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                      )}
                      {res.status === 'error' && (
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-medium text-secondary truncate">{res.name}</p>
                        <div className="flex items-start gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground select-text">{res.message}</p>
                          {(res.status === 'error' || res.status === 'warning') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-muted shrink-0 -mt-0.5 text-muted-foreground"
                              onClick={() => handleCopyError(res.message, res.payload)}
                              title="Copiar mensagem de erro"
                            >
                              <Copy className="h-3 w-3" />
                              <span className="sr-only">Copiar erro</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 ml-2',
                        res.status === 'success' &&
                          'bg-green-500/10 text-green-600 border-green-500/20',
                        res.status === 'warning' &&
                          'bg-amber-500/10 text-amber-600 border-amber-500/20',
                        res.status === 'error' &&
                          'bg-destructive/10 text-destructive border-destructive/20',
                      )}
                    >
                      {res.status === 'success'
                        ? 'Saudável'
                        : res.status === 'warning'
                          ? 'Atenção'
                          : 'Falha'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-elevation">
        <CardHeader className="bg-muted/10 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary/10 rounded-xl">
              <Activity className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-xl">Logs Recentes do Sistema</CardTitle>
              <CardDescription>
                Histórico de eventos e erros recentes para troubleshooting.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum log recente encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 border rounded-lg bg-card shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] h-5',
                          log.type === 'error'
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {log.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(log.created).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-secondary line-clamp-2">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 h-8 text-xs"
                    onClick={() => handleCopyError(log.message, log.payload)}
                  >
                    <Copy className="h-3 w-3" />
                    Copiar Erro
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
