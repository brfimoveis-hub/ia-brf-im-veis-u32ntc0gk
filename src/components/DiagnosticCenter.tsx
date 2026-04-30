import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  Search,
  ArrowUpDown,
  TrendingUp,
  Target,
  FileJson,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  const { toast } = useToast()

  const [recentLogs, setRecentLogs] = useState<SystemLog[]>([])
  const [leadStats, setLeadStats] = useState({ success: 0, errors: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof SystemLog; direction: 'asc' | 'desc' }>(
    {
      key: 'created',
      direction: 'desc',
    },
  )

  const [isRunning, setIsRunning] = useState(false)
  const [logToDelete, setLogToDelete] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [results, setResults] = useState<
    { name: string; status: string; message: string; payload?: any }[]
  >([])
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<SystemLog | null>(null)

  const fetchLogsAndStats = async () => {
    try {
      const logsRes = await getSystemLogs(1, 200)
      setRecentLogs(logsRes.items)

      const customersRes = await pb.collection('customers').getList(1, 1)
      const errorsRes = await pb.collection('system_logs').getList(1, 1, {
        filter: 'type ~ "error" || type = "diagnostic_error" || type = "remarketing_error"',
      })

      setLeadStats({
        success: customersRes.totalItems,
        errors: errorsRes.totalItems,
      })
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchLogsAndStats()
  }, [])

  useRealtime('system_logs', () => {
    fetchLogsAndStats()
  })
  useRealtime('customers', () => {
    fetchLogsAndStats()
  })

  const handleSort = (key: keyof SystemLog) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...recentLogs]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(q) ||
          (log.details && log.details.toLowerCase().includes(q)) ||
          log.type.toLowerCase().includes(q),
      )
    }

    result.sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [recentLogs, searchQuery, sortConfig])

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
      description: 'Conteúdo copiado para a área de transferência!',
    })
  }

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
      } catch {
        /* intentionally ignored */
      }

      const isGtmFunctional = hasGtmScript || isGtmObjectPresent

      if (!isGtmFunctional) {
        newResults.push({
          name: 'Google Tag Manager',
          status: 'warning',
          message: 'Script do GTM não detectado. Pode estar sendo bloqueado por um Ad Blocker.',
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

      // 2. Webhook Check
      setProgress(25)
      await new Promise((r) => setTimeout(r, 1000))
      const hasPhone = !!user?.meta_campaign_phone
      newResults.push({
        name: 'Ingestão de Leads Webhook',
        status: hasPhone ? 'success' : 'error',
        message: hasPhone
          ? `Telefone de campanha (${user.meta_campaign_phone}) ativo.`
          : 'Telefone de campanha ausente. A ingestão automática pode falhar.',
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
        message: `${cadences.length} cadências ativas. ${validCadences.length} íntegras.`,
        payload: { total: cadences.length, valid: validCadences.length, cadences },
      })
      setResults([...newResults])

      // 4. Meta Validation
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
              body: JSON.stringify({ pixelId: user.meta_pixel_id || '1522162279584545' }),
              headers: { 'Content-Type': 'application/json' },
            })
            metaSuccesses++
          } catch (e: any) {
            const resData = e.response || {}
            let msg = resData.message || e.message || 'Erro desconhecido'
            if (resData.code && !msg.includes(`Código: ${resData.code}`)) {
              msg += ` (Meta Error Code: ${resData.code})`
            }
            lastErrorMsg = msg
          }
          setProgress(60 + ((i + 1) / testCount) * 30)
          if (i < testCount - 1) await new Promise((r) => setTimeout(r, 1500))
        }

        let finalMessage = `${metaSuccesses}/${testCount} testes do Pixel bem-sucedidos. Status: Ativo.`
        if (metaSuccesses < testCount) finalMessage = `Falha de conexão: ${lastErrorMsg}`

        newResults.push({
          name: 'Integração Meta (Pixel)',
          status: metaSuccesses === testCount ? 'success' : metaSuccesses > 0 ? 'warning' : 'error',
          message: finalMessage,
          payload: { successes: metaSuccesses, testCount, lastErrorMsg },
        })
      }
      setResults([...newResults])
      setProgress(100)

      await createSystemLog({
        type: 'diagnostic',
        message: 'Diagnóstico de integridade concluído',
        details: `Loop: ${loopEnabled ? 'Sim' : 'Não'}. Meta: ${metaSuccesses}/${testCount}. Uazapi: ${hasPhone ? 'Online' : 'Offline'}. Cadências: ${cadences.length}`,
        payload: newResults,
      })

      toast({
        title: 'Diagnóstico Concluído',
        description: 'O relatório de saúde do sistema foi gerado.',
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

  const successRatio =
    leadStats.success + leadStats.errors > 0
      ? Math.round((leadStats.success / (leadStats.success + leadStats.errors)) * 100)
      : 100

  const getLogBadgeColor = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('error') || t.includes('fail'))
      return 'bg-destructive/10 text-destructive border-destructive/20'
    if (t.includes('warning') || t.includes('diagnostic'))
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    if (t.includes('success') || t.includes('valid') || t === 'webhook')
      return 'bg-green-500/10 text-green-600 border-green-500/20'
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  }

  return (
    <div className="space-y-8">
      {/* Lead Capture Analytics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border shadow-elevation">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{leadStats.success}</h3>
            <p className="text-sm text-muted-foreground font-medium">Leads Capturados (Total)</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-elevation">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-3 bg-amber-500/10 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{leadStats.errors}</h3>
            <p className="text-sm text-muted-foreground font-medium">Falhas Registradas</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-elevation">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
            <div
              className={cn(
                'p-3 rounded-full',
                successRatio >= 90
                  ? 'bg-green-500/10'
                  : successRatio >= 70
                    ? 'bg-amber-500/10'
                    : 'bg-destructive/10',
              )}
            >
              <TrendingUp
                className={cn(
                  'h-6 w-6',
                  successRatio >= 90
                    ? 'text-green-600'
                    : successRatio >= 70
                      ? 'text-amber-600'
                      : 'text-destructive',
                )}
              />
            </div>
            <h3
              className={cn(
                'text-2xl font-bold tracking-tight',
                successRatio >= 90
                  ? 'text-green-600'
                  : successRatio >= 70
                    ? 'text-amber-600'
                    : 'text-destructive',
              )}
            >
              {successRatio}%
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Taxa de Sucesso (Capture Rate)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Diagnóstico */}
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
                {isRunning ? 'Verificando...' : 'Executar Diagnóstico'}
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

      {/* Logs Table */}
      <Card className="border-border shadow-elevation">
        <CardHeader className="bg-muted/10 pb-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar logs..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-md border max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead
                    className="w-[160px] cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    onClick={() => handleSort('created')}
                  >
                    <div className="flex items-center gap-1">
                      Timestamp <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[140px]">Source</TableHead>
                  <TableHead
                    className="w-[140px] cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-1">
                      Type <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[200px]">Status</TableHead>
                  <TableHead className="text-right w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      Nenhum log encontrado para esta busca.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedLogs.map((log) => {
                    let source = 'System'
                    if (
                      log.type.toLowerCase().includes('webhook') ||
                      log.message.toLowerCase().includes('webhook')
                    )
                      source = 'Webhook'
                    else if (
                      log.type.toLowerCase().includes('ai') ||
                      log.type.toLowerCase() === 'ai_response'
                    )
                      source = 'AI Engine'
                    else if (
                      log.type.toLowerCase().includes('meta') ||
                      log.type.toLowerCase().includes('remarketing')
                    )
                      source = 'Meta Ads'

                    let statusType = 'Success'
                    if (
                      log.type.toLowerCase().includes('error') ||
                      log.message.toLowerCase().includes('falha')
                    )
                      statusType = 'Error'
                    else if (
                      log.type.toLowerCase().includes('warning') ||
                      log.type.toLowerCase() === 'diagnostic'
                    )
                      statusType = 'Info'

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(log.created).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{source}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] h-6 px-2 whitespace-nowrap',
                              getLogBadgeColor(log.type),
                            )}
                          >
                            {log.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-secondary">
                          <div className="flex items-center gap-2">
                            {statusType === 'Error' ? (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : statusType === 'Info' ? (
                              <Activity className="h-4 w-4 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            <div className="line-clamp-2" title={log.message}>
                              {log.message}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => setSelectedPayloadLog(log)}
                            >
                              <FileJson className="h-3 w-3 mr-1" />
                              View Details
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
                    )
                  })
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

      <Dialog
        open={!!selectedPayloadLog}
        onOpenChange={(open) => !open && setSelectedPayloadLog(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payload Bruto - {selectedPayloadLog?.type.toUpperCase()}</DialogTitle>
            <DialogDescription>
              Inspecione os dados JSON originais recebidos pelo sistema para este evento.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] mt-4 rounded-md bg-slate-950 p-4 border">
            <pre className="text-xs text-slate-50 font-mono whitespace-pre-wrap break-words">
              {selectedPayloadLog?.payload
                ? JSON.stringify(selectedPayloadLog.payload, null, 2)
                : 'Nenhum payload disponível para este log.'}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
