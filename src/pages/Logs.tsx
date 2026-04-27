import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getSystemLogs, type SystemLog } from '@/services/system_logs'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Filter } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Logs() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await getSystemLogs(1, 50, filterType === 'all' ? undefined : filterType)
      setLogs(result.items)
    } catch (error) {
      console.error('Failed to load logs', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [filterType])

  useRealtime('system_logs', (e) => {
    if (filterType !== 'all' && e.record.type !== filterType) return

    if (e.action === 'create') {
      setLogs((prev) => [e.record as SystemLog, ...prev])
    } else if (e.action === 'update') {
      setLogs((prev) => prev.map((l) => (l.id === e.record.id ? (e.record as SystemLog) : l)))
    } else if (e.action === 'delete') {
      setLogs((prev) => prev.filter((l) => l.id !== e.record.id))
    }
  })

  const getBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'error':
      case 'meta_error':
        return 'destructive'
      case 'webhook':
        return 'secondary'
      case 'ai_response':
      case 'meta_sync':
        return 'default'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Logs do Sistema</h1>
          <p className="text-muted-foreground">
            Monitore os eventos, execuções de IA e atividades executadas em segundo plano.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Logs</SelectItem>
              <SelectItem value="remarketing">Remarketing (Testes)</SelectItem>
              <SelectItem value="meta_sync">Meta Sync (CAPI)</SelectItem>
              <SelectItem value="meta_error">Erros do Meta</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-subtle border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-3 text-muted-foreground">
              <p>Nenhum evento registrado ainda.</p>
            </div>
          ) : (
            <div className="rounded-md border-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                    <TableHead className="w-[150px]">Tipo</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(log.type)}>{log.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[300px] sm:max-w-none">
                        {log.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              Detalhes do Evento
              {selectedLog && (
                <Badge variant={getBadgeVariant(selectedLog.type)}>{selectedLog.type}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.created), 'dd/MM/yyyy HH:mm:ss')}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold tracking-tight">Mensagem</h4>
                <p className="text-sm text-secondary leading-relaxed">{selectedLog.message}</p>
              </div>

              {selectedLog.details && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold tracking-tight">Descrição Adicional</h4>
                  <div className="rounded-md bg-muted/50 border border-border p-3 text-sm text-secondary break-words leading-relaxed">
                    {selectedLog.details}
                  </div>
                </div>
              )}

              {selectedLog.payload && Object.keys(selectedLog.payload).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold tracking-tight">Carga de Dados (JSON)</h4>
                  <ScrollArea className="h-[240px] w-full rounded-md bg-zinc-950 p-4 border border-zinc-800">
                    <pre className="text-[13px] text-zinc-50 font-mono leading-relaxed">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
