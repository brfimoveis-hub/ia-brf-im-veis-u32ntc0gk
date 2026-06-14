import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, Terminal, Info, CheckCircle, Clock } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { ErrorBoundary } from '@/components/ErrorBoundary'

/**
 * Safely renders JSON or Object payloads as stringified text.
 * Prevents "Objects are not valid as a React child" errors.
 */
function JsonViewer({ data }: { data: unknown }) {
  const formatted = useMemo(() => {
    if (data == null) return null
    let parsed = data
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data)
      } catch {
        // Not a JSON string, retain as plain string
      }
    }
    const result = typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed)
    return result === '{}' || result === '""' ? null : result
  }, [data])

  if (!formatted) return null

  return (
    <pre className="mt-3 p-3 bg-slate-950 text-slate-50 rounded-md text-xs overflow-x-auto max-w-full font-mono leading-relaxed shadow-inner">
      {formatted}
    </pre>
  )
}

function LogItem({ log }: { log: any }) {
  let Icon = Terminal
  let variant: 'default' | 'destructive' | 'secondary' | 'outline' = 'default'

  // Guard against non-string types to avoid React child crashes
  const typeStr = typeof log.type === 'string' ? log.type : String(log.type || 'unknown')
  const typeLower = typeStr.toLowerCase()

  if (typeLower.includes('error') || typeLower.includes('fail') || typeLower.includes('erro')) {
    Icon = AlertCircle
    variant = 'destructive'
  } else if (
    typeLower.includes('success') ||
    typeLower.includes('ok') ||
    typeLower.includes('sucesso')
  ) {
    Icon = CheckCircle
    variant = 'default'
  } else if (typeLower.includes('info') || typeLower.includes('webhook')) {
    Icon = Info
    variant = 'secondary'
  }

  const messageStr = typeof log.message === 'string' ? log.message : String(log.message || '')

  let dateStr = 'Data desconhecida'
  if (log.created) {
    try {
      dateStr = format(new Date(log.created), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
    } catch {
      dateStr = 'Data inválida'
    }
  }

  return (
    <div className="flex gap-4 p-5 hover:bg-muted/30 transition-colors">
      <div className="mt-0.5 flex-shrink-0">
        <Icon
          className={`h-5 w-5 ${variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <Badge
              variant={variant === 'destructive' ? 'destructive' : 'outline'}
              className="capitalize shrink-0 font-medium"
            >
              {typeStr}
            </Badge>
            <span className="font-semibold text-sm truncate" title={messageStr}>
              {messageStr}
            </span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap shrink-0 bg-muted/50 px-2 py-1 rounded-md">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            {dateStr}
          </div>
        </div>

        {/* Safely render potentially complex objects */}
        {log.details && <JsonViewer data={log.details} />}
        {log.payload && <JsonViewer data={log.payload} />}
      </div>
    </div>
  )
}

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchLogs = async () => {
    try {
      setLoading(true)
      // Fetch up to 500 logs for robust visibility without overloading the DOM un-virtualized
      const result = await pb.collection('system_logs').getList(1, 500, {
        sort: '-created',
      })
      setLogs(result.items)
    } catch (error: any) {
      console.error('Failed to fetch logs:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar logs',
        description: error.message || 'Não foi possível carregar os logs do sistema.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Optimistic & real-time updates handling
  useRealtime('system_logs', (e) => {
    if (e.action === 'create') {
      setLogs((prev) => {
        const newLogs = [e.record, ...prev]
        return newLogs.slice(0, 500) // Cap the list length to preserve memory
      })
    } else if (e.action === 'update') {
      setLogs((prev) => prev.map((log) => (log.id === e.record.id ? e.record : log)))
    } else if (e.action === 'delete') {
      setLogs((prev) => prev.filter((log) => log.id !== e.record.id))
    }
  })

  return (
    <div className="container max-w-6xl py-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs do Sistema</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitoramento de atividades, webhooks e integrações.
          </p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 pb-5">
          <CardTitle className="text-lg flex items-center gap-2">
            <ActivityIcon />
            Últimos Registros
          </CardTitle>
          <CardDescription>Exibindo os {logs.length} registros mais recentes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Main ErrorBoundary prevents entire app crash if a single structural render fails */}
          <ErrorBoundary>
            {loading ? (
              <div className="p-4 divide-y divide-border/50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-4 py-5 first:pt-3 last:pb-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="space-y-3 flex-1">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-[150px]" />
                        <Skeleton className="h-4 w-[120px]" />
                      </div>
                      <Skeleton className="h-4 w-full max-w-[400px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/20">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-5 shadow-sm border border-border/50">
                  <Terminal className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-semibold text-foreground text-lg">Nenhum log encontrado.</p>
                <p className="text-sm text-center max-w-sm mt-2 leading-relaxed">
                  Os eventos de sistema, falhas de integração e recebimento de webhooks aparecerão
                  aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {logs.map((log) => (
                  <ErrorBoundary
                    key={log.id}
                    fallback={
                      <div className="p-5 text-destructive text-sm flex items-center gap-3 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <div>
                          <strong>Erro de Renderização:</strong> Não foi possível exibir o log (
                          {log.id || 'ID desconhecido'}). O payload pode estar corrompido.
                        </div>
                      </div>
                    }
                  >
                    <LogItem log={log} />
                  </ErrorBoundary>
                ))}
              </div>
            )}
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  )
}

function ActivityIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
