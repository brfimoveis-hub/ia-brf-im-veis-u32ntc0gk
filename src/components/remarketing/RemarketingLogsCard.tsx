import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RefreshCw, ScrollText } from 'lucide-react'

export function RemarketingLogsCard() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const records = await pb.collection('system_logs').getList(1, 15, {
        filter: "type ~ 'remarketing' || type ~ 'meta_capi' || type ~ 'meta_sync'",
        sort: '-created',
      })
      setLogs(records.items)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useRealtime('system_logs', (e) => {
    if (e.action !== 'create') return
    const type = (e.record.type || '').toLowerCase()
    if (type.includes('remarketing') || type.includes('meta_capi') || type.includes('meta_sync')) {
      setLogs((prev) => [e.record, ...prev].slice(0, 15))
    }
  })

  return (
    <Card className="shadow-sm flex flex-col max-h-[500px]">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4 text-primary" /> Logs de Remarketing
            </CardTitle>
            <CardDescription className="text-xs">Monitoramento em tempo real</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <ScrollArea className="flex-1 bg-card">
        <div className="p-3 space-y-2">
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum log encontrado.</p>
          ) : (
            logs.map((log) => {
              const isErr =
                (log.type || '').toLowerCase().includes('error') ||
                (log.message || '').toLowerCase().includes('falha')
              const isOk =
                (log.type || '').toLowerCase().includes('success') ||
                (log.message || '').toLowerCase().includes('sucesso')
              return (
                <div
                  key={log.id}
                  className="text-sm space-y-1 p-2 border rounded-md bg-background/50"
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={isOk ? 'default' : isErr ? 'destructive' : 'secondary'}
                      className="text-xs capitalize"
                    >
                      {(log.type || '').replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created).toLocaleString()}
                    </span>
                  </div>
                  <p className={isErr ? 'text-red-600 dark:text-red-400' : 'text-foreground/90'}>
                    {log.message}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
