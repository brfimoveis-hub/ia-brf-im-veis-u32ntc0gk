import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Activity,
  Power,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createSystemLog } from '@/services/system_logs'

const uazapiSchema = z.object({
  domain: z
    .string()
    .url('Deve ser uma URL válida (ex: https://dominio.com)')
    .min(1, 'O domínio é obrigatório'),
  instance_number: z.string().min(1, 'O número da instância é obrigatório'),
  token: z.string().min(1, 'O token é obrigatório'),
  admin_token: z.string().optional(),
})

export default function ConfiguracoesCore() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie suas integrações e preferências do sistema.</p>
      </div>

      <Tabs defaultValue="uazapi" className="space-y-6">
        <TabsList className="bg-slate-100/50 border">
          <TabsTrigger
            value="uazapi"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Uazapi WhatsApp
          </TabsTrigger>
          <TabsTrigger
            value="meta"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Meta CAPI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uazapi" className="m-0">
          <UazapiConfig />
        </TabsContent>

        <TabsContent value="meta" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Integração Meta CAPI</CardTitle>
              <CardDescription>Configurações da API de Conversões do Meta.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Configurações isoladas mantidas de forma segura.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UazapiConfig() {
  const { user } = useAuth()
  const [currentUser, setCurrentUser] = useState(user)

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      setCurrentUser(e.record)
    }
  })

  const isConfigured = !!currentUser?.uazapi_instance_number

  if (isConfigured) {
    return <UazapiStatusView user={currentUser} />
  }

  return <UazapiFormView user={currentUser} />
}

function UazapiStatusView({ user }: { user: any }) {
  const { toast } = useToast()
  const [isResetting, setIsResetting] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const status = user?.uazapi_status || 'Desconhecido'
  const isHealthy = status === 'Saudável' || status === 'online' || status === 'connected'

  const handleReset = async () => {
    try {
      setIsResetting(true)
      await pb.collection('users').update(user.id, {
        uazapi_domain: '',
        uazapi_token: '',
        uazapi_admin_token: '',
        uazapi_instance_number: '',
        uazapi_status: '',
        uazapi_error: '',
      })
      toast({
        title: 'Configuração resetada',
        description: 'Os dados do Uazapi foram limpos. O Meta Pixel e Leads não foram afetados.',
      })
    } catch (err: any) {
      toast({ title: 'Erro ao resetar', description: err.message, variant: 'destructive' })
    } finally {
      setIsResetting(false)
    }
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      await pb.send('/backend/v1/uazapi/connect', { method: 'POST' })

      await pb.collection('users').update(user.id, {
        uazapi_status: 'Saudável',
        uazapi_error: '',
      })

      toast({
        title: 'Comando enviado',
        description: 'A escuta da instância foi ativada com sucesso.',
      })
    } catch (err: any) {
      await createSystemLog({
        type: 'uazapi_error',
        message: 'Failed to enable listening',
        details: { error: err.message, status: err.status || 500, raw: err },
        payload: { instance: user?.uazapi_instance_number, domain: user?.uazapi_domain },
      })
      toast({ title: 'Erro ao conectar', description: err.message, variant: 'destructive' })
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          Integração Uazapi <Activity className="h-5 w-5 text-slate-500" />
        </CardTitle>
        <CardDescription>Sua conexão atual do WhatsApp via Uazapi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 bg-slate-50 p-4 rounded-lg border">
          <div>
            <p className="text-sm font-medium text-slate-500">Domínio</p>
            <p className="text-sm font-semibold truncate">{user?.uazapi_domain}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Instância</p>
            <p className="text-sm font-semibold">{user?.uazapi_instance_number}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={isHealthy ? 'default' : 'destructive'}
                className={isHealthy ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
              >
                {status}
              </Badge>
            </div>
          </div>
          {user?.uazapi_error && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-red-500">Último Erro Registrado</p>
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                {user?.uazapi_error}
              </p>
            </div>
          )}
        </div>

        {!isHealthy && (
          <Alert className="bg-blue-50 text-blue-900 border-blue-200">
            <Power className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Ativar Escuta (Enable Listening)</AlertTitle>
            <AlertDescription className="text-blue-700 mt-2">
              <p className="mb-3">
                A configuração foi salva com sucesso! Clique no botão abaixo para forçar a conexão e
                ativar o webhook da instância.
              </p>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                {isConnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Power className="mr-2 h-4 w-4" />
                )}
                Enable Listening
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Alert className="bg-amber-50 text-amber-900 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Problemas de Conexão?</AlertTitle>
          <AlertDescription className="text-amber-700">
            Se você está enfrentando erros "Not Found" persistentes, você pode resetar a
            configuração e conectar novamente. Suas outras integrações e dados de clientes
            permanecerão intactos.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="bg-slate-50 border-t flex justify-end p-4">
        <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
          {isResetting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Limpar Configurações Uazapi
        </Button>
      </CardFooter>
    </Card>
  )
}

function UazapiFormView({ user }: { user: any }) {
  const { toast } = useToast()
  const [isTesting, setIsTesting] = useState(false)

  const form = useForm<z.infer<typeof uazapiSchema>>({
    resolver: zodResolver(uazapiSchema),
    defaultValues: {
      domain: '',
      instance_number: '',
      token: '',
      admin_token: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof uazapiSchema>) => {
    try {
      setIsTesting(true)

      await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: {
          domain: values.domain,
          instance: values.instance_number,
          token: values.token,
          admin_token: values.admin_token || '',
        },
      })

      // Se passou, salva tudo e define status Pendente para forçar o "Enable Listening" na próxima view
      await pb.collection('users').update(user.id, {
        uazapi_domain: values.domain,
        uazapi_token: values.token,
        uazapi_admin_token: values.admin_token || '',
        uazapi_instance_number: values.instance_number,
        uazapi_status: 'Pendente',
        uazapi_error: '',
      })

      toast({
        title: 'Sucesso!',
        description: 'Credenciais validadas. Configure a escuta na próxima etapa.',
      })
    } catch (err: any) {
      let errorMsg =
        err.response?.error ||
        err.response?.message ||
        err.message ||
        'Erro desconhecido ao conectar'

      if (
        err.status === 404 ||
        errorMsg.includes('404') ||
        errorMsg.toLowerCase().includes('not found')
      ) {
        errorMsg =
          'Erro de Conexão: Instância não encontrada. Verifique se o ID da Instância (uazapi_instance_number) e o Token estão corretos.'
      }

      // Salva apenas o erro e status no banco para visualização e cumprimento dos critérios.
      // O uazapi_instance_number continua vazio para manter o usuário no FormView permitindo correção.
      await pb.collection('users').update(user.id, {
        uazapi_error: errorMsg,
        uazapi_status: 'Falha',
      })

      await createSystemLog({
        type: 'uazapi_error',
        message: 'Failed to connect during clean setup',
        details: { error: errorMsg, status: err.status || 500, raw: err },
        payload: { instance: values.instance_number, domain: values.domain },
      })

      toast({ title: 'Falha na conexão', description: errorMsg, variant: 'destructive' })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Configurar Nova Conexão Uazapi</CardTitle>
        <CardDescription>
          Insira suas novas credenciais do Uazapi para conectar o WhatsApp de forma limpa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {user?.uazapi_error && user?.uazapi_status === 'Falha' && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro de Conexão</AlertTitle>
            <AlertDescription>{user.uazapi_error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domínio Uazapi</FormLabel>
                    <FormControl>
                      <Input placeholder="https://iabrfimveis.uazapi.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instance_number"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Número da Instância</FormLabel>
                      <Tooltip>
                        <TooltipTrigger type="button">
                          <HelpCircle className="h-4 w-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>O número de WhatsApp conectado. Exemplo: 554892098050</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <Input placeholder="Ex: 554892098050" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Bearer Token (API Key)</FormLabel>
                      <Tooltip>
                        <TooltipTrigger type="button">
                          <HelpCircle className="h-4 w-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Encontrado no Dashboard do Uazapi acessando "Configurações" &gt;
                            "API/Segurança".
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="Seu token de acesso" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admin_token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Token (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Token de administrador" {...field} />
                    </FormControl>
                    <FormDescription>Deixe em branco se não aplicável.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isTesting}>
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Testar Conexão e Salvar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
