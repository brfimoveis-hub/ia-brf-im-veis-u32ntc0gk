import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Network,
  Cpu,
  Database,
  Settings2,
} from 'lucide-react'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [errorDetail, setErrorDetail] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [instanceNumber, setInstanceNumber] = useState('')
  const [domain, setDomain] = useState('')
  const [token, setToken] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ domain?: string; instance?: string }>(
    {},
  )

  const initialized = useRef(false)

  useRealtime('users', (e) => {
    if (e.action === 'update' && user && e.record.id === user.id) {
      if (e.record.uazapi_status === 'Conectado') {
        setStatus('connected')
        setErrorDetail('')
      } else if (e.record.uazapi_status === 'Desconectado') {
        setStatus('disconnected')
        setErrorDetail(e.record.uazapi_error || 'Desconectado')
      }
    }
  })

  useEffect(() => {
    if (user && !initialized.current) {
      setName(user.name || 'BRF Imóveis')
      setEmail(user.email || 'brfimoveis@gmail.com')
      setDomain(user.uazapi_domain || 'https://iabrfimveis.uazapi.com')
      setToken(user.uazapi_token || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      setInstanceNumber(user.uazapi_instance_number || '554892098050')

      if (user.uazapi_status === 'Conectado') {
        setStatus('connected')
      } else if (user.uazapi_status === 'Desconectado') {
        setStatus('disconnected')
        setErrorDetail(user.uazapi_error || '')
      } else {
        checkConnection(
          user.uazapi_instance_number || '554892098050',
          user.uazapi_domain || 'https://iabrfimveis.uazapi.com',
          user.uazapi_token || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj',
        )
      }
      initialized.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const validateFields = () => {
    const errors: { domain?: string; instance?: string } = {}
    if (!instanceNumber || instanceNumber.trim() === '') {
      errors.instance = 'A Instância WhatsApp é obrigatória.'
    }

    if (!domain || domain.trim() === '') {
      errors.domain = 'O Endpoint Uazapi é obrigatório.'
    } else {
      try {
        let testUrl = domain
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
          testUrl = 'https://' + domain
        }
        new URL(testUrl)
      } catch (_) {
        errors.domain = 'Formato de URL inválido.'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const checkConnection = async (inst: string, dom: string, tok: string) => {
    if (!user) return
    setStatus('checking')
    setErrorDetail('')
    try {
      const data = await pb.send(`/backend/v1/uazapi/test-connection`, {
        method: 'POST',
        body: { instance: inst, domain: dom, token: tok },
      })

      if (data?.error) {
        throw new Error(data.error)
      }

      if (
        data?.instance?.state === 'open' ||
        data?.success ||
        data?.instance?.state === 'connecting'
      ) {
        setStatus('connected')
        await pb
          .collection('users')
          .update(user.id, { uazapi_status: 'Conectado', uazapi_error: '' })
      } else {
        setStatus('disconnected')
        setErrorDetail('Instância desconectada.')
        await pb.collection('users').update(user.id, {
          uazapi_status: 'Desconectado',
          uazapi_error: 'Instância desconectada.',
        })
      }
    } catch (e: any) {
      setStatus('disconnected')
      let errMsg = e.message || 'Erro de comunicação.'

      if (e.status === 400 && e.response?.error) {
        errMsg = e.response.error
      } else if (e.status === 504) {
        errMsg = 'Timeout. Verifique o Endpoint URL.'
      } else if (e.response?.message) {
        errMsg = e.response.message
      }

      setErrorDetail(errMsg)
      await pb
        .collection('users')
        .update(user.id, { uazapi_status: 'Desconectado', uazapi_error: errMsg })
    }
  }

  const handleSave = async () => {
    if (!user) return
    if (!validateFields()) {
      toast({
        title: 'Dados inválidos',
        description: 'Corrija os erros do formulário antes de salvar.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const payload: any = {
        name,
        uazapi_domain: domain,
        uazapi_token: token,
        uazapi_instance_number: instanceNumber,
      }

      if (email !== user.email) {
        payload.email = email
      }

      await pb.collection('users').update(user.id, payload)
      toast({ title: 'Configurações salvas', description: 'Testando conexão...' })

      await checkConnection(instanceNumber, domain, token)
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mother AI Ecosystem</h2>
        <p className="text-muted-foreground">
          Gerencie o hub neural e as integrações do sistema IA BIA.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uazapi Status</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mt-1">
              {status === 'checking' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Verificando...</span>
                </>
              )}
              {status === 'connected' && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">Conectado</span>
                </>
              )}
              {status === 'disconnected' && (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Desconectado</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CRM Sync</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">Ativo</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">HubSpot (Skip Sync)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slack Notificações</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">#leads-sc</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle>Uazapi Connection Manager</CardTitle>
          </div>
          <CardDescription>
            Configure e teste os parâmetros de conexão do WhatsApp via Uazapi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'disconnected' && errorDetail && (
            <div className="flex items-start p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
              <AlertTriangle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">Falha na conexão: {errorDetail}</p>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="BRF Imóveis"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="brfimoveis@gmail.com"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label>Instância WhatsApp (Número)</Label>
              <Input
                value={instanceNumber}
                onChange={(e) => {
                  setInstanceNumber(e.target.value)
                  if (validationErrors.instance)
                    setValidationErrors({ ...validationErrors, instance: undefined })
                }}
                placeholder="554892098050"
                className={validationErrors.instance ? 'border-destructive' : ''}
              />
              {validationErrors.instance && (
                <p className="text-xs text-destructive">{validationErrors.instance}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Endpoint Uazapi</Label>
              <Input
                type="url"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value)
                  if (validationErrors.domain)
                    setValidationErrors({ ...validationErrors, domain: undefined })
                }}
                placeholder="https://iabrfimveis.uazapi.com"
                className={validationErrors.domain ? 'border-destructive' : ''}
              />
              {validationErrors.domain && (
                <p className="text-xs text-destructive">{validationErrors.domain}</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label htmlFor="uazapiToken">Token de Acesso (API Key / Admin Token)</Label>
              <Input
                id="uazapiToken"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                placeholder="Insira o Token alfanumérico"
              />
              <p className="text-xs text-muted-foreground">
                Este token é usado como <code>AdminToken</code> para verificar o status e conectar a
                instância.
              </p>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar e Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
