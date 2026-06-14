import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Network,
  Copy,
  RefreshCw,
  Activity,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function UazapiConfig() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [domain, setDomain] = useState(user?.uazapi_domain || 'https://iabrfimveis.uazapi.com')
  const [token, setToken] = useState(user?.uazapi_token || 'd40df49e-bcbe-4729-9a71-291527eaa812')
  const [adminToken, setAdminToken] = useState(user?.uazapi_admin_token || '')
  const [instance, setInstance] = useState(user?.uazapi_instance_number || 'pog6Yx')
  const [status, setStatus] = useState(user?.uazapi_status || 'disconnected')

  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | 'warning' | null
    message: string
    rawLog?: any
  }>({ status: null, message: '' })

  const webhookUrl = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/uazapi/webhook`

  useEffect(() => {
    if (user) {
      if (!domain && user.uazapi_domain) setDomain(user.uazapi_domain)
      if (!token && user.uazapi_token) setToken(user.uazapi_token)
      if (!adminToken && user.uazapi_admin_token) setAdminToken(user.uazapi_admin_token)
      if (!instance && user.uazapi_instance_number) setInstance(user.uazapi_instance_number)
      setStatus(user.uazapi_status || 'disconnected')
    }
  }, [user])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setStatus(e.record.uazapi_status || 'disconnected')
    }
  })

  const sanitizeDomain = (raw: string) => {
    let clean = raw.trim()
    if (clean && !clean.startsWith('http')) {
      clean = 'https://' + clean
    }
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1)
    }
    return clean
  }

  const validateFields = () => {
    if (!domain.trim()) return 'Server URL (Base Domain) é obrigatório.'
    if (!instance.trim()) return 'Instance Number (ou Slug) é obrigatório.'
    if (!token.trim()) return 'Instance Token (API Key) é obrigatório.'
    return null
  }

  const handleSave = async () => {
    if (!user?.id) return
    const errorMsg = validateFields()
    if (errorMsg) {
      toast({ title: 'Erro de Validação', description: errorMsg, variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      const cleanDomain = sanitizeDomain(domain)

      await pb.collection('users').update(user.id, {
        uazapi_domain: cleanDomain,
        uazapi_token: token.trim(),
        uazapi_admin_token: adminToken.trim(),
        uazapi_instance_number: instance.trim(),
      })

      setDomain(cleanDomain)

      toast({
        title: 'Configurações salvas',
        description: 'As credenciais do Uazapi foram atualizadas.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Falha ao atualizar configurações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    const errorMsg = validateFields()
    if (errorMsg) {
      toast({ title: 'Erro de Validação', description: errorMsg, variant: 'destructive' })
      return
    }

    setIsTesting(true)
    setTestResult({ status: null, message: '' })

    try {
      const cleanDomain = sanitizeDomain(domain)

      const res = await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: cleanDomain,
          instance: instance.trim(),
          token: token.trim(),
        }),
      })

      setTestResult({
        status: 'success',
        message: 'Conexão estabelecida com sucesso. A IA Mãe pode se comunicar com a instância.',
        rawLog: res,
      })
      setStatus('connected')

      if (user?.id) {
        await pb.collection('users').update(user.id, {
          uazapi_domain: cleanDomain,
          uazapi_token: token.trim(),
          uazapi_instance_number: instance.trim(),
          uazapi_status: 'connected',
          uazapi_error: '',
        })
      }
    } catch (err: any) {
      const data = err.response || {}

      let message = data.error || data.message || err.message || 'Erro desconhecido ao conectar.'
      if (err.status === 404 || data.code === 404 || data.status === 404) {
        message =
          data.error ||
          "Instância não encontrada. Por favor, verifique se o 'Instance Number' deve ser o Slug da Instância (nome) em vez do número de telefone."
      }

      setTestResult({
        status: 'error',
        message,
        rawLog: data.details || data.rawLog || data,
      })
      setStatus('error')
    } finally {
      setIsTesting(false)
    }
  }

  const handleRestart = async () => {
    setIsRestarting(true)
    try {
      await pb.send('/backend/v1/uazapi/restart', {
        method: 'POST',
        body: JSON.stringify({
          domain: sanitizeDomain(domain),
          instance: instance.trim(),
          token: token.trim(),
        }),
      })
      toast({
        title: 'API Reiniciada',
        description: 'O comando de reinício foi enviado com sucesso.',
      })
    } catch (err: any) {
      let errorMsg = err.message || 'Falha ao reiniciar a API.'
      if (err.status === 405) {
        errorMsg = err.response?.message || 'Failed to restart API: Method Not Allowed'
      } else if (err.status === 401) {
        errorMsg = err.response?.message || 'Failed to restart API: Unauthorized'
      } else if (err.response?.message) {
        errorMsg = err.response.message
      }

      toast({
        title: 'Erro ao reiniciar',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsRestarting(false)
    }
  }

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true)
    try {
      const res = await pb.send('/backend/v1/uazapi/status', {
        method: 'POST',
        body: JSON.stringify({
          domain: sanitizeDomain(domain),
          instance: instance.trim(),
          token: token.trim(),
        }),
      })

      const currentState = res.state || res.status || 'unknown'
      toast({
        title: 'Status da Instância',
        description: `Estado atual da conexão: ${currentState}`,
      })

      if (user?.id && currentState === 'open') {
        setStatus('connected')
        await pb.collection('users').update(user.id, { uazapi_status: 'connected' })
      } else if (user?.id) {
        setStatus(currentState)
        await pb.collection('users').update(user.id, { uazapi_status: currentState })
      }
    } catch (err: any) {
      if (err.status === 404 || err.status === 405) {
        try {
          const resGet = await pb.send('/backend/v1/uazapi/status', {
            method: 'GET',
            query: {
              domain: sanitizeDomain(domain),
              instance: instance.trim(),
              token: token.trim(),
            },
          })
          const currentState = resGet.state || resGet.status || 'unknown'
          toast({ title: 'Status da Instância', description: `Estado atual: ${currentState}` })
          return
        } catch (fallbackErr: any) {
          toast({
            title: 'Erro ao checar status',
            description: fallbackErr.message || 'Falha ao checar o status.',
            variant: 'destructive',
          })
          return
        }
      }
      toast({
        title: 'Erro ao checar status',
        description: err.message || 'Falha ao checar o status.',
        variant: 'destructive',
      })
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast({ title: 'Copiado', description: 'Webhook URL copiada para a área de transferência.' })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Configuração Uazapi
              </CardTitle>
              <CardDescription>Credenciais de acesso à API do WhatsApp.</CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                status === 'connected' || status === 'open'
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : status === 'error'
                    ? 'bg-red-500/10 text-red-600 border-red-500/20'
                    : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
              }
            >
              <span>
                {status === 'connected' || status === 'open'
                  ? 'Conectado'
                  : status === 'error'
                    ? 'Falha na Conexão'
                    : status || 'Desconectado'}
              </span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Server URL (Base Domain)</Label>
            <Input
              id="domain"
              placeholder="https://iabrfimveis.uazapi.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Ex: https://iabrfimveis.uazapi.com
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance">Instance Number (ou Slug)</Label>
            <Input
              id="instance"
              placeholder="pog6Yx"
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Nome da instância (Instance Slug) para evitar erros 404, ou número de telefone com DDI
              e DDD se aplicável.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Instance Token (API Key)</Label>
            <Input
              id="token"
              type="password"
              placeholder="••••••••••••••••••••••••••••••••••••••••••••••••••"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminToken">Admin Token (Global/Master Key)</Label>
            <Input
              id="adminToken"
              type="password"
              placeholder="Opcional: Ex: v234d-1a..."
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="bg-muted font-mono text-xs" />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={handleCopyWebhook}
                  title="Copiar URL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[0.8rem] text-muted-foreground">
                Configure esta URL na sua instância Uazapi para receber eventos de mensagens e
                status.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRestart}
                disabled={isRestarting || !domain || !instance}
                className="gap-2"
              >
                {isRestarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>Reiniciar API</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckStatus}
                disabled={isCheckingStatus || !domain || !instance}
                className="gap-2"
              >
                {isCheckingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
                <span>Verificar Status</span>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t px-6 py-4 bg-muted/20">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !domain || !instance}
            className="gap-2"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
            <span>Testar Conexão</span>
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <span>Salvar Alterações</span>
          </Button>
        </CardFooter>
      </Card>

      <div className="min-h-[150px]">
        {testResult.status ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <Alert
              variant={testResult.status === 'error' ? 'destructive' : 'default'}
              className={
                testResult.status === 'success' ? 'border-green-500/50 bg-green-500/10' : ''
              }
            >
              {testResult.status === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <div className="ml-2">
                <AlertTitle>
                  {testResult.status === 'success'
                    ? 'Conexão Bem-sucedida'
                    : 'Falha no Teste de Conexão'}
                </AlertTitle>
                <AlertDescription className="mt-1 whitespace-pre-wrap">
                  {testResult.message}
                </AlertDescription>
              </div>
            </Alert>

            {testResult.status === 'error' && testResult.rawLog ? (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem
                  value="raw-log"
                  className="border-red-200 dark:border-red-900/50 rounded-md border overflow-hidden"
                >
                  <AccordionTrigger className="py-3 px-4 bg-red-50 dark:bg-red-900/10 text-sm font-medium text-red-800 dark:text-red-200 hover:no-underline hover:bg-red-100 dark:hover:bg-red-900/20 data-[state=open]:border-b data-[state=open]:border-red-100 dark:data-[state=open]:border-red-900/50">
                    <span>Detalhes Técnicos (Raw Log)</span>
                  </AccordionTrigger>
                  <AccordionContent className="p-0 border-t-0">
                    <pre className="p-4 text-xs font-mono bg-slate-950 text-slate-50 overflow-auto max-h-[300px]">
                      {typeof testResult.rawLog === 'string'
                        ? testResult.rawLog
                        : JSON.stringify(testResult.rawLog, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
