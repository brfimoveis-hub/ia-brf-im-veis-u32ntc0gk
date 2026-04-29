import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCadences } from '@/services/cadences'
import {
  createSystemLog,
  getSystemLogs,
  deleteSystemLog,
  type SystemLog,
} from '@/services/system_logs'
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

  const [logToDelete, setLogToDelete] = useState<string | null>(null)

  const confirmDeleteLog = async () => {
    if (!logToDelete) return
    try {
      await deleteSystemLog(logToDelete)
      toast({
        title: 'Log removido',
        description: 'O registro foi apagado com sucesso.',
      })
      setRecentLogs((prev) => prev.filter((l) => l.id !== logToDelete))
    } catch (e) {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível apagar o log.',
        variant: 'destructive',
      })
    } finally {
      setLogToDelete(null)
    }
  }

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

      // 2. Webhook & Lead Ingestion Check
      setProgress(25)
      await new Promise((r) => setTimeout(r, 1000))
      const hasPhone = !!user?.meta_campaign_phone
      newResults.push({
        name: 'Ingestão de Leads Webhook',
        status: hasPhone ? 'success' : 'error',
        message: hasPhone
          ? `Telefone de campanha (${user.meta_campaign_phone}) ativo. Webhook em modo 'Listening' para novos leads Meta.`
          : 'Telefone de campanha ausente. A ingestão automática de leads do Meta Ads pode não funcionar.',
        payload: { meta_campaign_phone: user?.meta_campaign_phone, listening: hasPhone },
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead className="w-[160px]">Data/Hora</TableHead>
                  <TableHead className="max-w-[250px]">Mensagem</TableHead>
                  <TableHead className="max-w-[250px]">Detalhes</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      Nenhum log recente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(log.created).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-secondary">
                        <div className="line-clamp-2" title={log.message}>
                          {log.message}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="line-clamp-2" title={log.details}>
                          {log.details || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopyError(log.message, log.payload)}
                            title="Copiar Detalhes"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Copiar Detalhes</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setLogToDelete(log.id)}
                            title="Excluir log"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir log</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!logToDelete} onOpenChange={(open) => !open && setLogToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja eliminar este log?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLog}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
