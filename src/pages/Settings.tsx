import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Megaphone,
  Copy,
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
  const [adminToken, setAdminToken] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ domain?: string; instance?: string }>(
    {},
  )

  // QR Code States
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

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
        setQrCode(null)
        if (pollingRef.current) clearInterval(pollingRef.current)
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
      setDomain(user.uazapi_domain || '')
      setToken(user.uazapi_token || '')
      setAdminToken(user.uazapi_admin_token || '')
      setInstanceNumber(user.uazapi_instance_number || '')

      if (user.uazapi_status === 'Conectado') {
        setStatus('connected')
      } else if (user.uazapi_status === 'Desconectado') {
        setStatus('disconnected')
        setErrorDetail(user.uazapi_error || '')
      } else if (user.uazapi_instance_number && user.uazapi_domain) {
        checkConnection(
          user.uazapi_instance_number,
          user.uazapi_domain,
          user.uazapi_token || '',
          user.uazapi_admin_token || '',
        )
      } else {
        setStatus('disconnected')
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

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
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

  const checkConnection = async (inst: string, dom: string, tok: string, adminTok?: string) => {
    if (!user) return
    setStatus('checking')
    setErrorDetail('')
    try {
      // First try calling the specific uazapi_status hook as required
      let data
      try {
        data = await pb.send(`/backend/v1/uazapi/status/${inst}`, { method: 'GET' })
      } catch (err: any) {
        // Fallback to test-connection if status hook fails or is structured differently
        data = await pb.send(`/backend/v1/uazapi/test-connection`, {
          method: 'POST',
          body: { instance: inst, domain: dom, token: tok, admin_token: adminTok },
        })
      }
      if (data?.error) throw new Error(data.error)

      try {
        await pb.send(`/backend/v1/uazapi/diagnostics/${inst}`, { method: 'GET' })
      } catch (_) {
        // Silently ignore diagnostics errors
      }

      if (
        data?.instance?.state === 'open' ||
        data?.success ||
        data?.instance?.state === 'connecting' ||
        data?.state === 'open'
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
        errMsg = 'Instância não encontrada no Uazapi. Verifique o número da instância.'
      else if (e.status === 504) errMsg = 'Timeout. Verifique o Endpoint URL.'
      else if (e.response?.message) errMsg = e.response.message

      setErrorDetail(errMsg)
      await pb
        .collection('users')
        .update(user.id, { uazapi_status: 'Desconectado', uazapi_error: errMsg })
    }
  }

  const startPolling = (inst: string, dom: string, tok: string, adminTok?: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const data = await pb.send(`/backend/v1/uazapi/test-connection`, {
          method: 'POST',
          body: { instance: inst, domain: dom, token: tok, admin_token: adminTok },
        })
        if (data?.instance?.state === 'open' || data?.success) {
          setStatus('connected')
          setQrCode(null)
          if (pollingRef.current) clearInterval(pollingRef.current)
          if (user) {
            await pb.collection('users').update(user.id, {
              uazapi_status: 'Conectado',
              uazapi_error: '',
              uazapi_instance_number: inst,
              uazapi_domain: dom,
              uazapi_token: tok,
              uazapi_admin_token: adminTok || '',
            })
          }
        }
      } catch (e) {
        // ignore polling errors
      }
    }, 5000)
  }

  const generateQrCode = async () => {
    if (!user) return
    if (!validateFields()) {
      toast({
        title: 'Dados inválidos',
        description: 'Preencha a instância e o domínio.',
        variant: 'destructive',
      })
      return
    }
    setIsGeneratingQr(true)
    setQrCode(null)
    try {
      const res = await pb.send(`/backend/v1/uazapi/qrcode/${instanceNumber}`, { method: 'GET' })
      if (res.base64) {
        setQrCode(
          res.base64.startsWith('data:') ? res.base64 : `data:image/png;base64,${res.base64}`,
        )
        startPolling(instanceNumber, domain, token, adminToken)
        toast({ title: 'QR Code gerado', description: 'Escaneie o QR Code com seu WhatsApp.' })
      } else if (res.instance?.state === 'open') {
        setStatus('connected')
        toast({ title: 'Já conectado', description: 'A instância já está conectada.' })
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível obter o QR Code.',
          variant: 'destructive',
        })
      }
    } catch (e: any) {
      let errMsg =
        'Erro ao gerar QR Code. Verifique se o Uazapi está online e as credenciais estão corretas.'
      if (e.status === 404)
        errMsg = 'Instância não encontrada no Uazapi. Verifique o número da instância.'
      else if (e.status === 504)
        errMsg = 'Tempo esgotado ao contatar o Uazapi. O serviço pode estar offline.'
      else if (e.response?.message) errMsg = e.response.message

      toast({
        title: 'Erro no Uazapi',
        description: errMsg,
        variant: 'destructive',
      })
      setErrorDetail(errMsg)
    } finally {
      setIsGeneratingQr(false)
    }
  }

  const disconnectInstance = async () => {
    if (!user) return
    setIsDisconnecting(true)
    try {
      await pb.send(`/backend/v1/uazapi/disconnect/${instanceNumber}`, { method: 'DELETE' })
      setStatus('disconnected')
      setQrCode(null)
      toast({ title: 'Desconectado', description: 'A instância foi desconectada.' })
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message || 'Erro ao desconectar.',
        variant: 'destructive',
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const restartInstance = async () => {
    if (!user) return
    setIsRestarting(true)
    try {
      await pb.send(`/backend/v1/uazapi/restart/${instanceNumber}`, { method: 'PUT' })
      toast({ title: 'Reiniciando', description: 'A instância está sendo reiniciada.' })
      setTimeout(() => {
        checkConnection(instanceNumber, domain, token, adminToken)
      }, 5000)
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message || 'Erro ao reiniciar.',
        variant: 'destructive',
      })
    } finally {
      setIsRestarting(false)
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
        uazapi_admin_token: adminToken,
        uazapi_instance_number: instanceNumber,
      }
      if (email !== user.email) payload.email = email

      await pb.collection('users').update(user.id, payload)
      toast({ title: 'Configurações salvas', description: 'Testando conexão...' })
      await checkConnection(instanceNumber, domain, token, adminToken)
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
        <TabsList className="grid w-full grid-cols-4 max-w-[900px] overflow-x-auto">
          <TabsTrigger value="meta">WhatsApp API Oficial (Meta)</TabsTrigger>
          <TabsTrigger value="uazapi">Uazapi (Legado)</TabsTrigger>
          <TabsTrigger value="ai">IA BIA</TabsTrigger>
          <TabsTrigger value="google-ads">Google Ads</TabsTrigger>
        </TabsList>

        <TabsContent value="google-ads">
          <Card className="border-border/50 shadow-sm mt-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <CardTitle>Google Ads Integration</CardTitle>
              </div>
              <CardDescription>
                Configure o Webhook para receber leads diretamente do Google Ads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>URL do Webhook</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`https://ia-uazapi-6d79e.shrd00.internal.goskip.dev/backend/v1/google-ads-webhook?uid=${user?.id || ''}`}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `https://ia-uazapi-6d79e.shrd00.internal.goskip.dev/backend/v1/google-ads-webhook?uid=${user?.id || ''}`,
                        )
                        toast({ title: 'URL Copiada!' })
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Google Ads Key (Chave de Segurança)</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={user?.google_ads_webhook_key || ''} />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(user?.google_ads_webhook_key || '')
                        toast({ title: 'Chave Copiada!' })
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cole esta URL e Chave nas configurações de exportação de Webhook do Formulário
                    de Lead no Google Ads.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                  <Label>Endpoint Uazapi (Domain)</Label>
                  <Input
                    type="url"
                    value={domain}
                    onChange={(e) => {
                      setDomain(e.target.value)
                      if (validationErrors.domain)
                        setValidationErrors({ ...validationErrors, domain: undefined })
                    }}
                    placeholder="https://sua-instancia.uazapi.com"
                    className={validationErrors.domain ? 'border-destructive' : ''}
                  />
                  {validationErrors.domain && (
                    <p className="text-xs text-destructive">{validationErrors.domain}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Instância WhatsApp (Número)</Label>
                  <Input
                    value={instanceNumber}
                    onChange={(e) => {
                      setInstanceNumber(e.target.value)
                      if (validationErrors.instance)
                        setValidationErrors({ ...validationErrors, instance: undefined })
                    }}
                    placeholder="5548999999999"
                    className={validationErrors.instance ? 'border-destructive' : ''}
                  />
                  {validationErrors.instance && (
                    <p className="text-xs text-destructive">{validationErrors.instance}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="uazapiToken">Instance Token</Label>
                  <Input
                    id="uazapiToken"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    type="password"
                    placeholder="Insira o Token da Instância"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uazapiAdminToken">Admin Token</Label>
                  <Input
                    id="uazapiAdminToken"
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    type="password"
                    placeholder="Insira o Admin Token"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => checkConnection(instanceNumber, domain, token, adminToken)}
                  disabled={status === 'checking' || isSaving || !instanceNumber}
                >
                  {status === 'checking' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verificar Conexão
                </Button>
              </div>

              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Conexão do Dispositivo</h3>

                {status === 'connected' ? (
                  <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-emerald-50/50">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                    <h4 className="text-xl font-semibold text-emerald-700">WhatsApp Conectado</h4>
                    <p className="text-sm text-muted-foreground mt-1 mb-6 text-center max-w-sm">
                      Sua instância <strong className="text-foreground">{instanceNumber}</strong>{' '}
                      está ativa e pronta para enviar e receber mensagens.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={restartInstance} disabled={isRestarting}>
                        {isRestarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Reiniciar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={disconnectInstance}
                        disabled={isDisconnecting}
                      >
                        {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Desconectar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/30">
                    {qrCode ? (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                          <img
                            src={qrCode}
                            alt="QR Code para conectar ao WhatsApp"
                            className="w-64 h-64"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          Abra o WhatsApp no seu celular, vá em{' '}
                          <strong>Aparelhos Conectados</strong> e escaneie o código acima.
                        </p>
                        <Button
                          variant="outline"
                          onClick={generateQrCode}
                          disabled={isGeneratingQr}
                        >
                          {isGeneratingQr ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Atualizar QR Code
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-4 text-center">
                        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-2">
                          <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h4 className="text-lg font-medium">Instância Desconectada</h4>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Gere um novo QR Code para conectar seu número de WhatsApp e ativar os
                          recursos de IA.
                        </p>
                        <Button
                          onClick={generateQrCode}
                          disabled={isGeneratingQr || !instanceNumber || !domain}
                        >
                          {isGeneratingQr ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Gerar QR Code
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="border-border/50 shadow-sm mt-4">
            <CardHeader>
              <CardTitle>Configurações da IA</CardTitle>
              <CardDescription>Gerencie as instruções e comportamentos da IA.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Em breve...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
