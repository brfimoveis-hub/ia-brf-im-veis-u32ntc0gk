import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Activity } from 'lucide-react'

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    try {
      const records = await pb.collection('system_logs').getList(1, 100, {
        sort: '-created',
      })
      setLogs(records.items)
    } catch (error) {
      console.error('Failed to load logs', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  useRealtime('system_logs', (e) => {
    if (e.action === 'create') {
      setLogs((prev) => [e.record, ...prev].slice(0, 100))
    }
  })

  // Safe renderer for message
  const renderMessage = (msg: any) => {
    if (msg === null || msg === undefined) return ''
    if (typeof msg === 'string') return msg
    if (typeof msg === 'object') {
      if ('instance' in msg || 'status' in msg) {
        return `Instance: ${msg.instance || 'N/A'} | Status: ${msg.status || 'N/A'}`
      }
      try {
        return JSON.stringify(msg)
      } catch {
        return 'Invalid object'
      }
    }
    return String(msg)
  }

  // Safe renderer for JSON payloads
  const renderJson = (data: any) => {
    if (data === null || data === undefined) return null
    if (typeof data !== 'object') return <span className="text-sm">{String(data)}</span>

    // Check if it's Uazapi status-like payload just in case it's here
    if ('instance' in data && 'status' in data && Object.keys(data).length <= 3) {
      return (
        <span className="text-sm">
          Instance: {data.instance || 'N/A'} | Status: {data.status || 'N/A'}
        </span>
      )
    }

    return (
      <pre className="mt-2 rounded-md bg-slate-900 p-3 text-xs text-slate-50 overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logs do Sistema</h1>
        <p className="text-muted-foreground">
          Monitoramento de atividades e integrações do sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Últimas Atividades
          </CardTitle>
          <CardDescription>Mostrando os 100 eventos mais recentes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Nenhum log encontrado.
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-slate-50/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-2">
                        <Badge
                          variant={
                            log.type === 'error' ||
                            log.type === 'failure' ||
                            log.type === 'exception'
                              ? 'destructive'
                              : log.type === 'warning'
                                ? 'default'
                                : 'secondary'
                          }
                          className={
                            log.type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' : ''
                          }
                        >
                          {String(log.type || 'INFO').toUpperCase()}
                        </Badge>
                        <span className="font-medium break-all">{renderMessage(log.message)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {log.created &&
                          format(new Date(log.created), 'dd/MM/yyyy HH:mm:ss', {
                            locale: ptBR,
                          })}
                      </span>
                    </div>

                    {(log.details || log.payload) && (
                      <div className="grid gap-4 md:grid-cols-2 mt-2">
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Detalhes:
                            </span>
                            {renderJson(log.details)}
                          </div>
                        )}
                        {log.payload && Object.keys(log.payload).length > 0 && (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Payload:
                            </span>
                            {renderJson(log.payload)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
