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
import { Loader2, CheckCircle2, AlertTriangle, Settings, Network } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useRealtime } from '@/hooks/use-realtime'

export function UazapiConfig() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [domain, setDomain] = useState(user?.uazapi_domain || 'https://iabrfimveis.uazapi.com')
  const [token, setToken] = useState(user?.uazapi_token || '')
  const [instance, setInstance] = useState(user?.uazapi_instance_number || '')
  const [status, setStatus] = useState(user?.uazapi_status || 'disconnected')

  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | 'warning' | null
    message: string
    rawLog?: any
  }>({ status: null, message: '' })

  useEffect(() => {
    if (user) {
      if (!domain && user.uazapi_domain) setDomain(user.uazapi_domain)
      if (!token && user.uazapi_token) setToken(user.uazapi_token)
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
        })
      }
    } catch (err: any) {
      const data = err.response || {}

      setTestResult({
        status: 'error',
        message: data.error || data.message || err.message || 'Erro desconhecido ao conectar.',
        rawLog: data.rawLog || data,
      })
      setStatus('error')
    } finally {
      setIsTesting(false)
    }
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
                status === 'connected'
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : status === 'error'
                    ? 'bg-red-500/10 text-red-600 border-red-500/20'
                    : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
              }
            >
              {status === 'connected' ? 'Conectado' : status === 'error' ? 'Falha' : 'Desconectado'}
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
              placeholder="Ex: 554892098050"
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Número de telefone com DDI e DDD ou nome da instância.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Instance Token (API Key)</Label>
            <Input
              id="token"
              type="password"
              placeholder="Ex: 6df3aaaa-9198-40aa-9d0c-da3abd9c1934"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
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
            Testar Conexão
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </CardFooter>
      </Card>

      {testResult.status && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <Alert
            variant={testResult.status === 'error' ? 'destructive' : 'default'}
            className={testResult.status === 'success' ? 'border-green-500/50 bg-green-500/10' : ''}
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
              <AlertDescription className="mt-1">{testResult.message}</AlertDescription>
            </div>
          </Alert>

          {testResult.status === 'error' && testResult.rawLog && (
            <Card className="border-red-200 dark:border-red-900/50 overflow-hidden">
              <CardHeader className="py-3 px-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/50">
                <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">
                  Technical Details (Raw Log)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="p-4 text-xs font-mono bg-slate-950 text-slate-50 overflow-auto max-h-[300px]">
                  {JSON.stringify(testResult.rawLog, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
