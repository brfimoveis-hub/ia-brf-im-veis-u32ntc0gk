import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealtime } from '@/hooks/use-realtime'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getSystemLogs, deleteSystemLog, type SystemLog } from '@/services/system_logs'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Trash2,
  Search,
  ArrowUpDown,
  RefreshCw,
  Info,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { ErrorBoundary } from '@/components/ErrorBoundary'

const safeStringify = (obj: any): string => {
  if (obj === null || obj === undefined) return ''
  if (typeof obj === 'string') return obj
  try {
    return JSON.stringify(obj)
  } catch (e) {
    return String(obj)
  }
}

const getLogBadgeColor = (type: string) => {
  const t = safeStringify(type).toLowerCase()
  if (t.includes('error') || t.includes('fail'))
    return 'bg-destructive/10 text-destructive border-destructive/20'
  if (t.includes('warning') || t.includes('diagnostic'))
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  if (t.includes('success') || t.includes('valid') || t === 'webhook')
    return 'bg-green-500/10 text-green-600 border-green-500/20'
  return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
}

export default function Logs() {
  const { toast } = useToast()

  const [logs, setLogs] = useState<SystemLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof SystemLog; direction: 'asc' | 'desc' }>(
    {
      key: 'created',
      direction: 'desc',
    },
  )

  const [logToDelete, setLogToDelete] = useState<string | null>(null)
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<SystemLog | null>(null)

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const logsRes = await getSystemLogs(1, 500)
      setLogs(logsRes.items || [])
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro ao carregar logs',
        description: 'Não foi possível buscar os registros recentes do sistema.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useRealtime('system_logs', () => {
    fetchLogs()
  })

  const handleSort = (key: keyof SystemLog) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...logs]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((log) => {
        const msg = safeStringify(log.message).toLowerCase()
        const typ = safeStringify(log.type).toLowerCase()
        const det = safeStringify(log.details).toLowerCase()
        return msg.includes(q) || typ.includes(q) || det.includes(q)
      })
    }

    result.sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [logs, searchQuery, sortConfig])

  const confirmDeleteLog = async () => {
    if (!logToDelete) return
    try {
      await deleteSystemLog(logToDelete)
      toast({
        title: 'Log removido',
        description: 'O registro foi apagado com sucesso.',
      })
      setLogs((prev) => prev.filter((l) => l.id !== logToDelete))
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monitoramento de Logs</h1>
        <p className="text-muted-foreground mt-2">
          Visualize as atividades do sistema, status de conexões e erros em tempo real.
        </p>
      </div>

      <ErrorBoundary>
        <Card className="border-border shadow-elevation">
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Registros do Sistema</CardTitle>
                  <CardDescription>{filteredAndSortedLogs.length} logs encontrados</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar logs..."
                    className="pl-9 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchLogs}
                  disabled={isLoading}
                  className="h-9 w-9 shrink-0"
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[calc(100vh-16rem)]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead
                      className="w-[160px] cursor-pointer hover:bg-muted/80 transition-colors select-none"
                      onClick={() => handleSort('created')}
                    >
                      <div className="flex items-center gap-1">
                        Data/Hora <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[140px]">Fonte</TableHead>
                    <TableHead
                      className="w-[140px] cursor-pointer hover:bg-muted/80 transition-colors select-none"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-1">
                        Tipo <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[300px]">Mensagem / Status</TableHead>
                    <TableHead className="text-right w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                        <Activity className="h-6 w-6 animate-pulse mx-auto mb-2 opacity-50" />
                        Carregando logs...
                      </TableCell>
                    </TableRow>
                  ) : filteredAndSortedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                        Nenhum log encontrado para esta busca.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedLogs.map((log) => {
                      const typ = safeStringify(log.type)
                      const msg = safeStringify(log.message)

                      let source = 'Sistema'
                      if (
                        typ.toLowerCase().includes('webhook') ||
                        msg.toLowerCase().includes('webhook')
                      )
                        source = 'Webhook'
                      else if (
                        typ.toLowerCase().includes('ai') ||
                        typ.toLowerCase() === 'ai_response'
                      )
                        source = 'AI Engine'
                      else if (
                        typ.toLowerCase().includes('meta') ||
                        typ.toLowerCase().includes('remarketing')
                      )
                        source = 'Meta Ads'
                      else if (typ.toLowerCase().includes('uazapi')) source = 'Uazapi'

                      let statusType = 'Success'
                      if (
                        typ.toLowerCase().includes('error') ||
                        msg.toLowerCase().includes('falha')
                      )
                        statusType = 'Error'
                      else if (
                        typ.toLowerCase().includes('warning') ||
                        typ.toLowerCase().includes('diagnostic')
                      )
                        statusType = 'Info'

                      return (
                        <TableRow key={log.id} className="group hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap align-top pt-4">
                            {new Date(log.created).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-xs font-medium align-top pt-4">
                            {source}
                          </TableCell>
                          <TableCell className="align-top pt-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] h-6 px-2 whitespace-nowrap',
                                getLogBadgeColor(typ),
                              )}
                            >
                              {typ.toUpperCase() || 'INFO'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-secondary align-top pt-4 max-w-md">
                            <div className="flex items-start gap-2">
                              {statusType === 'Error' ? (
                                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                              ) : statusType === 'Info' ? (
                                <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              )}
                              <div className="space-y-1 overflow-hidden">
                                <div className="font-medium truncate break-words" title={msg}>
                                  {msg || (
                                    <span className="italic text-muted-foreground">
                                      Sem mensagem
                                    </span>
                                  )}
                                </div>
                                {log.details && (
                                  <div
                                    className="text-xs text-muted-foreground truncate opacity-80 font-mono"
                                    title={safeStringify(log.details)}
                                  >
                                    {safeStringify(log.details)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right align-top pt-3">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={() => setSelectedPayloadLog(log)}
                              >
                                <FileJson className="h-4 w-4" />
                                <span className="sr-only">Ver Payload</span>
                              </Button>
                              <Button
                                variant="ghost"
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
      </ErrorBoundary>

      <AlertDialog open={!!logToDelete} onOpenChange={(open) => !open && setLogToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja excluir este log?</AlertDialogTitle>
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
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!selectedPayloadLog}
        onOpenChange={(open) => !open && setSelectedPayloadLog(null)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              Detalhes do Log -{' '}
              {selectedPayloadLog ? safeStringify(selectedPayloadLog.type).toUpperCase() : ''}
            </DialogTitle>
            <DialogDescription>
              Inspecione os dados detalhados e o payload recebido.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 mt-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4 bg-muted/30 p-3 rounded-lg border">
                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  Mensagem
                </div>
                <div className="text-sm break-words">
                  {selectedPayloadLog ? safeStringify(selectedPayloadLog.message) : ''}
                </div>
              </div>
            </div>

            {selectedPayloadLog?.details && (
              <div className="flex flex-col">
                <div className="text-sm font-semibold mb-2">Details</div>
                <ScrollArea className="max-h-[20vh] rounded-md bg-slate-950 p-4 border shadow-inner">
                  <pre className="text-xs text-slate-50 font-mono whitespace-pre-wrap break-words">
                    {typeof selectedPayloadLog.details === 'object'
                      ? JSON.stringify(selectedPayloadLog.details, null, 2)
                      : String(selectedPayloadLog.details)}
                  </pre>
                </ScrollArea>
              </div>
            )}

            <div className="flex flex-col">
              <div className="text-sm font-semibold mb-2">Payload (Raw Data)</div>
              <ScrollArea className="max-h-[40vh] rounded-md bg-slate-950 p-4 border shadow-inner">
                <pre className="text-xs text-slate-50 font-mono whitespace-pre-wrap break-words">
                  {selectedPayloadLog?.payload
                    ? typeof selectedPayloadLog.payload === 'object'
                      ? JSON.stringify(selectedPayloadLog.payload, null, 2)
                      : String(selectedPayloadLog.payload)
                    : 'Nenhum payload disponível.'}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
