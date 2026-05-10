import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const [status, setStatus] = useState<'idle' | 'loading' | 'connected' | 'disconnected' | 'error'>(
    'idle',
  )
  const [logs, setLogs] = useState<
    { time: string; msg: string; type: 'info' | 'error' | 'success' | 'warning'; raw?: any }[]
  >([])

  const addLog = useCallback(
    (msg: string, type: 'info' | 'error' | 'success' | 'warning', raw?: any) => {
      setLogs((prev) => [{ time: new Date().toLocaleTimeString(), msg, type, raw }, ...prev])
    },
    [],
  )

  const testConnection = useCallback(async () => {
    if (!user) return
    setStatus('loading')
    addLog('Iniciando handshake com Uazapi...', 'info')

    const instanceNumber = user.uazapi_instance_number || '5548992098050'
    const domain = user.uazapi_domain || 'https://iabrfimveis.uazapi.com'
    const token = user.uazapi_token
    const adminToken = user.uazapi_admin_token

    addLog(`Parâmetros: Instância=${instanceNumber}, Endpoint=${domain}`, 'info')

    try {
      const response = await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain,
          instance: instanceNumber,
          token,
          adminToken,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      addLog(`Resposta recebida do Uazapi`, 'success', response)

      const state = response?.instance?.state || response?.state || response?.status
      if (
        state === 'open' ||
        state === 'Connected' ||
        state === 'connected' ||
        state === 'connecting'
      ) {
        setStatus('connected')
        addLog('Conexão estabelecida com sucesso.', 'success')
      } else {
        setStatus('disconnected')
        addLog(
          `Instância encontrada, mas não conectada. Estado: ${state || 'Desconhecido'}`,
          'warning',
        )
      }
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      const statusCode = err.status
      if (
        statusCode === 404 ||
        err.message?.includes('not found') ||
        err.message?.includes('not_found')
      ) {
        addLog(
          `Instância não encontrada. Verifique se o número ${instanceNumber} e o endpoint são válidos.`,
          'error',
          err,
        )
      } else {
        addLog(`Falha na conexão: ${err.message || 'Erro desconhecido'}`, 'error', err)
      }
    }
  }, [user, addLog])

  useEffect(() => {
    // Route Validation requirement: Log the exact path and component mapping
    console.log('currentRoute: { path: "/configuracoes", component: "ConfiguracoesCore" }')

    // State Guardrails: only fire connection handshake if user is authenticated
    if (user) {
      testConnection()
    }
  }, [user, testConnection])

  if (!user) return null

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações da IA</h1>
        <p className="text-muted-foreground">
          Gerencie a conexão e comportamento da inteligência artificial.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status da Conexão Uazapi</span>
            {status === 'connected' && (
              <Badge className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Conectado
              </Badge>
            )}
            {status === 'disconnected' && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent">
                <AlertTriangle className="w-4 h-4 mr-1" /> Aviso
              </Badge>
            )}
            {status === 'error' && (
              <Badge variant="destructive">
                <XCircle className="w-4 h-4 mr-1" /> Desconectado
              </Badge>
            )}
            {status === 'loading' && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Verificando
              </Badge>
            )}
            {status === 'idle' && <Badge variant="outline">Aguardando</Badge>}
          </CardTitle>
          <CardDescription>
            Instância: <strong>{user.uazapi_instance_number || '5548992098050'}</strong> | Domínio:{' '}
            <strong>{user.uazapi_domain || 'https://iabrfimveis.uazapi.com'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testConnection}
            disabled={status === 'loading'}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`} />
            Testar Conexão Novamente
          </Button>

          <div className="mt-8 border rounded-md overflow-hidden bg-muted/30">
            <div className="bg-muted px-4 py-2 font-mono text-sm font-semibold flex items-center justify-between border-b">
              Logs de Conexão
              <span className="text-xs font-normal text-muted-foreground">
                {logs.length} eventos
              </span>
            </div>
            <ScrollArea className="h-[300px] w-full">
              <div className="p-4 space-y-3 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    Nenhum log registrado ainda.
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className="space-y-1 pb-3 border-b border-border/50 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground shrink-0 w-20">{log.time}</span>
                        <span
                          className={`
                          ${log.type === 'error' ? 'text-red-500 font-medium' : ''}
                          ${log.type === 'success' ? 'text-green-500 font-medium' : ''}
                          ${log.type === 'warning' ? 'text-amber-500 font-medium' : ''}
                          ${log.type === 'info' ? 'text-blue-500' : ''}
                        `}
                        >
                          [{log.type.toUpperCase()}] {log.msg}
                        </span>
                      </div>
                      {log.raw && (
                        <div className="pl-[5.5rem]">
                          <pre className="bg-background/80 p-2 rounded border border-border/50 overflow-x-auto text-[10px] text-muted-foreground mt-1 max-h-32">
                            {JSON.stringify(log.raw, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
