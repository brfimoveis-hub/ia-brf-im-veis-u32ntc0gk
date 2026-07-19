import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
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
import { RemarketingStatusBanner } from '@/components/remarketing/RemarketingStatusBanner'
import { StatusMappingCard } from '@/components/remarketing/StatusMappingCard'
import { RemarketingListTab } from '@/components/remarketing/RemarketingListTab'
import { RemarketingEventsTab } from '@/components/remarketing/RemarketingEventsTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getRemarketingPreferences,
  saveRemarketingPreferences,
  DEFAULT_PREFERENCES,
  type RemarketingPreferences,
} from '@/services/remarketing'

export default function SettingsRemarketing() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [logs, setLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(user)
  const [preferences, setPreferences] = useState<RemarketingPreferences>(DEFAULT_PREFERENCES)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [loadingPrefs, setLoadingPrefs] = useState(true)

  const loadLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const records = await pb.collection('system_logs').getList(1, 20, {
        filter:
          "type ~ 'remarketing' || type ~ 'meta_capi' || type ~ 'meta_sync' || type ~ 'connection'",
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
      getRemarketingPreferences(user.id)
        .then(setPreferences)
        .catch(console.error)
        .finally(() => setLoadingPrefs(false))
    }
  }, [user])

  useRealtime('system_logs', (e) => {
    if (e.action !== 'create') return
    const type = (e.record.type || '').toLowerCase()
    if (
      type.includes('remarketing') ||
      type.includes('meta_capi') ||
      type.includes('meta_sync') ||
      type.includes('connection')
    ) {
      setLogs((prev) => [e.record, ...prev].slice(0, 20))
    }
  })

  useRealtime('users', (e) => {
    if (user?.id && e.record.id === user.id) setCurrentUser(e.record)
  })

  const handleSavePrefs = async () => {
    if (!user?.id) return
    setSavingPrefs(true)
    try {
      await saveRemarketingPreferences(user.id, preferences)
      toast({
        title: 'Preferências salvas',
        description: 'Configurações de remarketing atualizadas.',
      })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    } finally {
      setSavingPrefs(false)
    }
  }

  const hasAccessToken = !!currentUser?.meta_whatsapp_access_token?.trim()
  const tokenStatus = currentUser?.meta_token_status || ''
  const appId = currentUser?.meta_app_id || ''

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Remarketing (Meta)</h1>
        <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
          Gerencie a sincronização de audiências com Meta Remarketing e monitore o status da
          conexão.
        </p>
      </div>

      <RemarketingStatusBanner
        hasAccessToken={hasAccessToken}
        tokenStatus={tokenStatus}
        capiStatus={currentUser?.meta_capi_status || ''}
        appId={appId}
      />

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Por Lista</TabsTrigger>
          <TabsTrigger value="events">Por Eventos</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <RemarketingListTab />
        </TabsContent>
        <TabsContent value="events">
          <RemarketingEventsTab />
        </TabsContent>
      </Tabs>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-foreground">Central de Configurações</p>
              <p className="text-sm text-muted-foreground">
                Credenciais Meta gerenciadas na página de Conexões.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/settings/connections">
              Gerenciar <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {!loadingPrefs && (
            <StatusMappingCard
              preferences={preferences}
              onChange={setPreferences}
              onSave={handleSavePrefs}
              saving={savingPrefs}
            />
          )}

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Status da Integração</CardTitle>
              <CardDescription>Status em tempo real das credenciais Meta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${tokenStatus === 'valid' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                  >
                    {tokenStatus === 'valid' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">WhatsApp Access Token</p>
                    <p className="text-xs text-muted-foreground">
                      {hasAccessToken ? 'Token configurado' : 'Não configurado'}
                    </p>
                  </div>
                </div>
                <Badge variant={tokenStatus === 'valid' ? 'default' : 'secondary'}>
                  {tokenStatus === 'valid' ? 'Válido' : 'Pendente'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
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
                    <p className="font-medium text-sm">CAPI (Somente Leitura)</p>
                    <p className="text-xs text-muted-foreground">
                      {currentUser?.meta_capi_status === 'connected'
                        ? 'Enviando eventos'
                        : 'Aguardando'}
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
                <div className="p-3 bg-red-50/50 text-red-900 border border-red-200 rounded-lg text-sm dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300">
                  <p className="font-semibold mb-1 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Último erro CAPI
                  </p>
                  <p>{currentUser.meta_capi_error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-full flex flex-col shadow-sm min-h-[600px] max-h-[800px]">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-primary" /> Logs de Remarketing
                </CardTitle>
                <CardDescription>Monitoramento em tempo real.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={loadLogs} disabled={isLoadingLogs}>
                <RefreshCw className={`h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 bg-card">
            <div className="p-4 space-y-3">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <ScrollText className="h-10 w-10 mb-2 opacity-20" />
                  <p>Nenhum log encontrado.</p>
                </div>
              ) : (
                logs.map((log) => {
                  const isError =
                    (log.message || '').toLowerCase().includes('error') ||
                    (log.type || '').toLowerCase().includes('error') ||
                    (log.message || '').toLowerCase().includes('falha')
                  const isSuccess =
                    (log.message || '').toLowerCase().includes('success') ||
                    (log.type || '').toLowerCase().includes('success') ||
                    (log.message || '').toLowerCase().includes('sucesso')
                  return (
                    <div
                      key={log.id}
                      className="text-sm space-y-1 p-3 border rounded-lg bg-background/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <Badge
                          variant={isSuccess ? 'default' : isError ? 'destructive' : 'secondary'}
                          className="capitalize"
                        >
                          {(log.type || '').replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(log.created).toLocaleString()}
                        </span>
                      </div>
                      <p
                        className={`font-medium ${isError ? 'text-red-600 dark:text-red-400' : 'text-foreground/90'}`}
                      >
                        {log.message}
                      </p>
                      {log.details &&
                        typeof log.details === 'object' &&
                        Object.keys(log.details).length > 0 && (
                          <div className="mt-1 bg-muted/80 p-2 rounded-md text-xs font-mono overflow-x-auto text-muted-foreground border border-border/50">
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
  )
}
