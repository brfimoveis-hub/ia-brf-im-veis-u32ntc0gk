import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getMetaLogs, type SystemLog } from '@/services/system_logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, ScrollText, Eye } from 'lucide-react'

export function IntegrationLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SystemLog | null>(null)

  const loadLogs = useCallback(async () => {
    try {
      const res = await getMetaLogs()
      setLogs(res.items)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useRealtime('system_logs', () => {
    loadLogs()
  })

  const formatDate = (d: string) => new Date(d).toLocaleString('pt-BR')

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Logs de Integração</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum log encontrado. Teste uma conexão para gerar logs de integração.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Data/Hora</TableHead>
                <TableHead className="w-40">Tipo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="text-right w-20">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(log.created)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {log.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{log.message}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Tipo: </span>
                  <Badge variant="secondary" className="text-xs">
                    {selected.type}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Data: </span>
                  {formatDate(selected.created)}
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium">Mensagem: </span>
                {selected.message}
              </div>
              {selected.details && (
                <div>
                  <span className="text-sm font-medium">Details:</span>
                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(selected.details, null, 2)}
                  </pre>
                </div>
              )}
              {selected.payload && (
                <div>
                  <span className="text-sm font-medium">Payload:</span>
                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default IntegrationLogs
