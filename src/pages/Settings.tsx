import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsAi } from './settings/SettingsAi'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  MessageSquare,
} from 'lucide-react'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Uazapi States
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

  // Meta States
  const [metaStatus, setMetaStatus] = useState<'checking' | 'connected' | 'disconnected' | 'idle'>(
    'idle',
  )
  const [metaErrorDetail, setMetaErrorDetail] = useState('')
  const [metaBusinessId, setMetaBusinessId] = useState('')
  const [metaPhoneId, setMetaPhoneId] = useState('')
  const [metaAccessToken, setMetaAccessToken] = useState('')
  const [metaVerifyToken, setMetaVerifyToken] = useState('')
  const [isSavingMeta, setIsSavingMeta] = useState(false)
  const [metaValidationErrors, setMetaValidationErrors] = useState<{
    businessId?: string
    phoneId?: string
    token?: string
  }>({})

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

      if (e.record.meta_whatsapp_status === 'Conectado') {
        setMetaStatus('connected')
        setMetaErrorDetail('')
      } else if (e.record.meta_whatsapp_status === 'Desconectado') {
        setMetaStatus('disconnected')
      }
    }
  })

  useEffect(() => {
    if (user && !initialized.current) {
      // Setup Uazapi
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

      // Setup Meta
      setMetaBusinessId(user.meta_whatsapp_business_id || '')
      setMetaPhoneId(user.meta_whatsapp_phone_number_id || '')
      setMetaAccessToken(user.meta_whatsapp_access_token || '')
      setMetaVerifyToken(user.meta_whatsapp_verify_token || '')

      if (user.meta_whatsapp_status === 'Conectado') {
        setMetaStatus('connected')
      } else if (user.meta_whatsapp_status === 'Desconectado') {
        setMetaStatus('disconnected')
      } else if (
        user.meta_whatsapp_business_id &&
        user.meta_whatsapp_phone_number_id &&
        user.meta_whatsapp_access_token
      ) {
        checkMetaConnection(
          user.meta_whatsapp_business_id,
          user.meta_whatsapp_phone_number_id,
          user.meta_whatsapp_access_token,
        )
      } else {
        setMetaStatus('idle')
      }

      initialized.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // --- Uazapi Handlers ---
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
      if (data?.error) throw new Error(data.error)

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
      if (e.status === 400 && e.response?.error) errMsg = e.response.error
      else if (e.status === 404)
        errMsg = 'Endpoint não encontrado (404). Verifique a rota da API ou conexão com a Uazapi.'
      else if (e.status === 504) errMsg = 'Timeout. Verifique o Endpoint URL.'
      else if (e.response?.message) errMsg = e.response.message

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
        description: 'Corrija os erros do formulário.',
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
      if (email !== user.email) payload.email = email

      await pb.collection('users').update(user.id, payload)
      toast({ title: 'Configurações salvas', description: 'Testando conexão...' })
      await checkConnection(instanceNumber, domain, token)
    } catch (e: any) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  // --- Meta Handlers ---
  const checkMetaConnection = async (busId: string, phoneId: string, accToken: string) => {
    if (!user) return
    setMetaStatus('checking')
    setMetaErrorDetail('')
    try {
      await pb.send(`/backend/v1/meta/test-connection`, {
        method: 'POST',
        body: { business_id: busId, phone_number_id: phoneId, access_token: accToken },
      })
      setMetaStatus('connected')
      await pb.collection('users').update(user.id, { meta_whatsapp_status: 'Conectado' })
    } catch (e: any) {
      setMetaStatus('disconnected')
      let errMsg = e.message || 'Erro de comunicação com a Meta.'
      setMetaErrorDetail(errMsg)
      await pb.collection('users').update(user.id, { meta_whatsapp_status: 'Desconectado' })
    }
  }

  const handleSaveMeta = async () => {
    if (!user) return
    const errors: any = {}
    if (!metaBusinessId) errors.businessId = 'Obrigatório.'
    if (!metaPhoneId) errors.phoneId = 'Obrigatório.'
    if (!metaAccessToken) errors.token = 'Obrigatório.'
    setMetaValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Dados inválidos',
        description: 'Preencha todos os campos obrigatórios da Meta.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingMeta(true)
    try {
      const payload: any = {
        meta_whatsapp_business_id: metaBusinessId,
        meta_whatsapp_phone_number_id: metaPhoneId,
        meta_whatsapp_access_token: metaAccessToken,
        meta_whatsapp_verify_token: metaVerifyToken,
      }
      await pb.collection('users').update(user.id, payload)
      toast({ title: 'Configurações Meta salvas', description: 'Testando conexão...' })
      await checkMetaConnection(metaBusinessId, metaPhoneId, metaAccessToken)
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações da Meta.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingMeta(false)
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
            <CardTitle className="text-sm font-medium">WhatsApp Status</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Meta API:</span>
                <div className="flex items-center gap-1">
                  {metaStatus === 'checking' && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                  {metaStatus === 'connected' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  )}
                  {metaStatus === 'disconnected' && (
                    <XCircle className="h-3 w-3 text-destructive" />
                  )}
                  {metaStatus === 'idle' && <Network className="h-3 w-3 text-muted-foreground" />}
                  <span
                    className={`text-xs font-medium ${metaStatus === 'connected' ? 'text-emerald-600' : metaStatus === 'disconnected' ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {metaStatus === 'checking'
                      ? 'Verificando...'
                      : metaStatus === 'connected'
                        ? 'Conectado'
                        : metaStatus === 'disconnected'
                          ? 'Desconectado'
                          : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Uazapi:</span>
                <div className="flex items-center gap-1">
                  {status === 'checking' && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                  {status === 'connected' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  {status === 'disconnected' && <XCircle className="h-3 w-3 text-destructive" />}
                  <span
                    className={`text-xs font-medium ${status === 'connected' ? 'text-emerald-600' : status === 'disconnected' ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {status === 'checking'
                      ? 'Verificando...'
                      : status === 'connected'
                        ? 'Conectado'
                        : 'Desconectado'}
                  </span>
                </div>
              </div>
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

      <Tabs defaultValue="meta" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[750px]">
          <TabsTrigger value="meta">WhatsApp API Oficial (Meta)</TabsTrigger>
          <TabsTrigger value="uazapi">Uazapi (Legado)</TabsTrigger>
          <TabsTrigger value="ai">IA BIA</TabsTrigger>
        </TabsList>

        <TabsContent value="meta">
          <Card className="border-border/50 shadow-sm mt-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle>Meta Cloud API Configuration</CardTitle>
              </div>
              <CardDescription>
                Configure as credenciais da API Oficial do WhatsApp (Meta).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {metaStatus === 'disconnected' && metaErrorDetail && (
                <div className="flex items-start p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
                  <AlertTriangle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Falha na conexão: {metaErrorDetail}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>ID da Conta Business</Label>
                  <Input
                    value={metaBusinessId}
                    onChange={(e) => {
                      setMetaBusinessId(e.target.value)
                      if (metaValidationErrors.businessId)
                        setMetaValidationErrors({ ...metaValidationErrors, businessId: undefined })
                    }}
                    placeholder="1029384756"
                    className={metaValidationErrors.businessId ? 'border-destructive' : ''}
                  />
                  {metaValidationErrors.businessId && (
                    <p className="text-xs text-destructive">{metaValidationErrors.businessId}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>ID do Número de Telefone</Label>
                  <Input
                    value={metaPhoneId}
                    onChange={(e) => {
                      setMetaPhoneId(e.target.value)
                      if (metaValidationErrors.phoneId)
                        setMetaValidationErrors({ ...metaValidationErrors, phoneId: undefined })
                    }}
                    placeholder="1098765432"
                    className={metaValidationErrors.phoneId ? 'border-destructive' : ''}
                  />
                  {metaValidationErrors.phoneId && (
                    <p className="text-xs text-destructive">{metaValidationErrors.phoneId}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <Label>Token de Acesso (Permanente)</Label>
                  <Input
                    value={metaAccessToken}
                    onChange={(e) => {
                      setMetaAccessToken(e.target.value)
                      if (metaValidationErrors.token)
                        setMetaValidationErrors({ ...metaValidationErrors, token: undefined })
                    }}
                    type="password"
                    placeholder="EAA..."
                    className={metaValidationErrors.token ? 'border-destructive' : ''}
                  />
                  {metaValidationErrors.token && (
                    <p className="text-xs text-destructive">{metaValidationErrors.token}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Token de Verificação (Webhook)</Label>
                  <Input
                    value={metaVerifyToken}
                    onChange={(e) => setMetaVerifyToken(e.target.value)}
                    placeholder="meu_token_secreto"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use ao configurar o Webhook no painel da Meta.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" onClick={handleSaveMeta} disabled={isSavingMeta}>
                  {isSavingMeta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar e Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uazapi">
          <Card className="border-border/50 shadow-sm mt-4">
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
                    placeholder="Insira o Token"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar e Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <div className="mt-4">
            <SettingsAi />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
