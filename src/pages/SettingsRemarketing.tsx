import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ScrollText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

const formSchema = z.object({
  meta_pixel_id: z.string().min(1, 'Dataset / Pixel ID é obrigatório'),
  meta_capi_token: z.string().min(1, 'Token da API de Conversões é obrigatório'),
})

export default function SettingsRemarketing() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      meta_pixel_id: user?.meta_pixel_id || '',
      meta_capi_token: user?.meta_capi_token || '',
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        meta_pixel_id: user.meta_pixel_id || '',
        meta_capi_token: user.meta_capi_token || '',
      })
    }
  }, [user, form])

  const loadLogs = async () => {
    if (!user) return
    setIsLoadingLogs(true)
    try {
      const records = await pb.collection('system_logs').getList(1, 20, {
        filter: "type ~ 'meta_capi' || type ~ 'Remarketing'",
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
  }, [user])

  useRealtime('system_logs', (e) => {
    if (
      e.action === 'create' &&
      (e.record.type.includes('meta_capi') || e.record.type.includes('Remarketing'))
    ) {
      setLogs((prev) => [e.record, ...prev].slice(0, 20))
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, values)
      toast({
        title: 'Configurações salvas',
        description: 'Suas credenciais de Remarketing foram atualizadas com sucesso.',
      })
      loadLogs()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: getErrorMessage(err),
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function testConnection() {
    setIsTesting(true)
    try {
      const vals = form.getValues()
      await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: JSON.stringify({
          pixel_id: vals.meta_pixel_id,
          access_token: vals.meta_capi_token,
        }),
      })

      toast({
        title: 'Conexão bem-sucedida!',
        description: 'As credenciais são válidas e a API de Conversões está pronta.',
      })

      await pb.collection('users').authRefresh()
      loadLogs()
    } catch (err: any) {
      let errorMsg = getErrorMessage(err)
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = err.response as any
        if (resp?.error?.message) {
          errorMsg = resp.error.message
        } else if (resp?.message) {
          errorMsg = resp.message
        }
      }

      toast({
        variant: 'destructive',
        title: 'Falha na conexão',
        description: errorMsg,
      })
      await pb.collection('users').authRefresh()
      loadLogs()
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Remarketing (Meta CAPI)
        </h1>
        <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
          Configure a integração com a API de Conversões do Meta (Facebook/Instagram) para
          sincronizar seus leads.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Credenciais da API</CardTitle>
              <CardDescription>
                Insira o ID do seu Dataset (antigo Pixel ID) e o Token de Acesso permanente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="meta_pixel_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dataset ID / Pixel ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 123456789012345" {...field} />
                        </FormControl>
                        <FormDescription>
                          Atenção: Use o ID do Dataset (Pixel), NÃO use o ID do App ou Business ID.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="meta_capi_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token de Acesso (CAPI Token)</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="EAAB..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Token permanente gerado no Gerenciador de Eventos. Requer as permissões{' '}
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">
                            ads_management
                          </code>{' '}
                          e <code className="bg-muted px-1 py-0.5 rounded text-xs">ads_read</code>.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button type="submit" disabled={isSaving} className="w-full sm:w-1/2">
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Configurações
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={testConnection}
                      disabled={isTesting}
                      className="w-full sm:w-1/2"
                    >
                      {isTesting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Testar Conexão
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Status da Integração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${user?.meta_token_status === 'valid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                  >
                    {user?.meta_token_status === 'valid' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Status do Token</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.meta_token_status === 'valid'
                        ? 'Válido e Autenticado'
                        : 'Não validado ou Inválido'}
                    </p>
                  </div>
                </div>
                <Badge variant={user?.meta_token_status === 'valid' ? 'default' : 'secondary'}>
                  {user?.meta_token_status === 'valid' ? 'Ativo' : 'Pendente'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${user?.meta_capi_status === 'connected' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : user?.meta_capi_status === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                  >
                    {user?.meta_capi_status === 'connected' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : user?.meta_capi_status === 'error' ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Sincronização CAPI</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.meta_capi_status === 'connected'
                        ? 'Enviando eventos'
                        : user?.meta_capi_status === 'error'
                          ? 'Erro na sincronização'
                          : 'Aguardando configuração'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    user?.meta_capi_status === 'connected'
                      ? 'default'
                      : user?.meta_capi_status === 'error'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {user?.meta_capi_status === 'connected'
                    ? 'Conectado'
                    : user?.meta_capi_status === 'error'
                      ? 'Erro'
                      : 'Desconectado'}
                </Badge>
              </div>

              {user?.meta_capi_error && (
                <div className="p-4 bg-red-50/50 text-red-900 border border-red-200 rounded-lg text-sm dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300 animate-fade-in-up">
                  <p className="font-semibold mb-1 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Último erro registrado
                  </p>
                  <p>{user.meta_capi_error}</p>
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
