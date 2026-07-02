import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ScrollText,
  ArrowRight,
  Settings,
} from 'lucide-react'

export default function SettingsRemarketing() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(user)

  const loadLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const records = await pb.collection('system_logs').getList(1, 20, {
        filter: "type ~ 'meta_capi' || type ~ 'Remarketing' || type ~ 'meta'",
        sort: '-created',
      })
      setLogs(records.items)
    } catch (err) {
      console.error('Failed to load logs', err)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  useEffect(() => {
    loadLogs()
    if (user?.id) {
      pb.collection('users').getOne(user.id).then(setCurrentUser).catch(console.error)
    }
  }, [user])

  useRealtime('system_logs', (e) => {
    if (
      e.action === 'create' &&
      (e.record.type?.includes('meta_capi') ||
        e.record.type?.includes('Remarketing') ||
        e.record.type?.includes('meta'))
    ) {
      setLogs((prev) => [e.record, ...prev].slice(0, 20))
    }
  })

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    setCurrentUser(e.record)
  })

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Remarketing (Meta CAPI)
        </h1>
        <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
          Monitoramento de eventos e status da sincronização com a API de Conversões do Meta.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-foreground">Central de Configurações</p>
              <p className="text-sm text-muted-foreground">
                As credenciais do Meta CAPI são gerenciadas na página de Conexões.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/settings/connections">
              Gerenciar Conexões <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Status da Integração</CardTitle>
              <CardDescription>
                Status em tempo real das credenciais do Meta CAPI (somente leitura).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${currentUser?.meta_token_status === 'valid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                  >
                    {currentUser?.meta_token_status === 'valid' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Status do Token</p>
                    <p className="text-sm text-muted-foreground">
                      {currentUser?.meta_token_status === 'valid'
                        ? 'Válido e Autenticado'
                        : 'Não validado ou Inválido'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={currentUser?.meta_token_status === 'valid' ? 'default' : 'secondary'}
                >
                  {currentUser?.meta_token_status === 'valid' ? 'Ativo' : 'Pendente'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${currentUser?.meta_capi_status === 'connected' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : currentUser?.meta_capi_status === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                  >
                    {currentUser?.meta_capi_status === 'connected' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : currentUser?.meta_capi_status === 'error' ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Sincronização CAPI</p>
                    <p className="text-sm text-muted-foreground">
                      {currentUser?.meta_capi_status === 'connected'
                        ? 'Enviando eventos'
                        : currentUser?.meta_capi_status === 'error'
                          ? 'Erro na sincronização'
                          : 'Aguardando configuração'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    currentUser?.meta_capi_status === 'connected'
                      ? 'default'
                      : currentUser?.meta_capi_status === 'error'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {currentUser?.meta_capi_status === 'connected'
                    ? 'Conectado'
                    : currentUser?.meta_capi_status === 'error'
                      ? 'Erro'
                      : 'Desconectado'}
                </Badge>
              </div>

              {currentUser?.meta_capi_error && (
                <div className="p-4 bg-red-50/50 text-red-900 border border-red-200 rounded-lg text-sm dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300 animate-fade-in-up">
                  <p className="font-semibold mb-1 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Último erro registrado
                  </p>
                  <p>{currentUser.meta_capi_error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="h-full">
          <Card className="h-full flex flex-col shadow-sm min-h-[600px] max-h-[800px]">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-primary" /> Logs de Integração
                  </CardTitle>
                  <CardDescription>Monitoramento em tempo real dos eventos CAPI.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={loadLogs} disabled={isLoadingLogs}>
                  <RefreshCw className={`h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 bg-card">
              <div className="p-4 space-y-4">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <ScrollText className="h-10 w-10 mb-2 opacity-20" />
                    <p>Nenhum log de integração encontrado.</p>
                  </div>
                ) : (
                  logs.map((log) => {
                    const isError =
                      log.message?.toLowerCase().includes('error') ||
                      log.type.toLowerCase().includes('error') ||
                      log.message?.toLowerCase().includes('falha')
                    const isSuccess =
                      log.message?.toLowerCase().includes('success') ||
                      log.type.toLowerCase().includes('success') ||
                      log.message?.toLowerCase().includes('sucesso')

                    return (
                      <div
                        key={log.id}
                        className="text-sm space-y-2 p-4 border rounded-lg bg-background/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <Badge
                            variant={isSuccess ? 'default' : isError ? 'destructive' : 'secondary'}
                            className="capitalize"
                          >
                            {log.type.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {new Date(log.created).toLocaleString()}
                          </span>
                        </div>
                        <p
                          className={`font-medium ${isError ? 'text-red-600 dark:text-red-400' : 'text-foreground/90'}`}
                        >
                          {log.message}
                        </p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-2 bg-muted/80 p-3 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap text-muted-foreground border border-border/50">
                            {JSON.stringify(log.details, null, 2)}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  )
}
