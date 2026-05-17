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
  Settings2,
  MessageSquare,
  Eye,
  EyeOff,
  Target,
  RefreshCw,
  Power,
} from 'lucide-react'
import { SettingsAi } from './settings/SettingsAi'
import { SettingsSocial } from './settings/SettingsSocial'
import {
  testMetaCapiConnectionService,
  updateMetaCapiStatus,
  saveMetaCapiSettings,
  executeCapiVerification,
} from '@/services/meta_capi'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const { toast } = useToast()

  const defaultDomain = 'https://iabrfimveis.uazapi.com'
  const defaultAdminToken = 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

  const [domain, setDomain] = useState(defaultDomain)
  const [token, setToken] = useState('')
  const [adminToken, setAdminToken] = useState(defaultAdminToken)
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    domain?: string
    adminToken?: string
  }>({})

  const [instances, setInstances] = useState([
    {
      id: 'BRF 1',
      number: '',
      status: 'checking',
      qrCode: null as string | null,
      error: '',
      isGenerating: false,
      isDisconnecting: false,
      isRestarting: false,
      isReconnecting: false,
    },
    {
      id: 'zRuJNw',
      number: '',
      status: 'checking',
      qrCode: null as string | null,
      error: '',
      isGenerating: false,
      isDisconnecting: false,
      isRestarting: false,
      isReconnecting: false,
    },
  ])

  const pollingRefs = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const initialized = useRef(false)

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
  const [showMetaToken, setShowMetaToken] = useState(false)

  // Meta CAPI States
  const [capiStatus, setCapiStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [showCapiToken, setShowCapiToken] = useState(false)
  const [isSavingCapi, setIsSavingCapi] = useState(false)
  const [isTestingCapi, setIsTestingCapi] = useState(false)

  useRealtime('users', (e) => {
    if (e.action === 'update' && user && e.record.id === user.id) {
      if (e.record.meta_whatsapp_status === 'Conectado') {
        setMetaStatus('connected')
        setMetaErrorDetail('')
      } else if (e.record.meta_whatsapp_status === 'Desconectado') {
        setMetaStatus('disconnected')
      }
      if (e.record.meta_token_status === 'connected' || e.record.meta_token_status === 'valid') {
        setCapiStatus('connected')
      } else {
        setCapiStatus('disconnected')
      }
    }
  })

  useEffect(() => {
    // Deep State Reset to ensure UI reflects current connection state without stale routing cache
    localStorage.removeItem('vite-plugin-react-router-cache')
    localStorage.removeItem('meta_session_cache')
    sessionStorage.removeItem('meta_session_cache')

    if (user && !initialized.current) {
      const uDomain = user.uazapi_domain || defaultDomain
      const uToken = user.uazapi_token || ''
      const uAdminToken = user.uazapi_admin_token || defaultAdminToken

      setDomain(uDomain)
      setToken(uToken)
      setAdminToken(uAdminToken)

      instances.forEach((inst) => {
        checkConnection(inst.id, uDomain, uToken, uAdminToken)
      })

      setMetaBusinessId(user.meta_whatsapp_business_id || '')
      setMetaPhoneId(user.meta_whatsapp_phone_number_id || '')
      setMetaAccessToken(user.meta_whatsapp_access_token || '')
      setMetaVerifyToken(user.meta_whatsapp_verify_token || '')

      if (user.meta_whatsapp_status === 'Conectado') {
        setMetaStatus('connected')
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

      setMetaPixelId(user.meta_pixel_id || '')
      setMetaCapiToken(user.meta_capi_token || '')
      setCapiStatus(
        (user as any).meta_token_status === 'connected' ||
          (user as any).meta_token_status === 'valid'
          ? 'connected'
          : 'disconnected',
      )

      initialized.current = true
    }

    return () => {
      Object.values(pollingRefs.current).forEach(clearInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const validateFields = () => {
    const errors: { domain?: string; adminToken?: string } = {}
    if (!domain) errors.domain = 'O Domínio é obrigatório.'
    if (!adminToken) errors.adminToken = 'O Admin Token é obrigatório.'
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const updateInstanceState = (id: string, updates: any) => {
    setInstances((prev) => prev.map((inst) => (inst.id === id ? { ...inst, ...updates } : inst)))
  }

  const checkConnection = async (instId: string, dom: string, tok: string, adminTok: string) => {
    updateInstanceState(instId, { status: 'checking', error: '' })
    try {
      const data = await pb.send(`/backend/v1/uazapi/test-connection`, {
        method: 'POST',
        body: { instance_name: instId, domain: dom, admin_token: adminTok },
      })
      if (data?.status === 'connected') {
        updateInstanceState(instId, {
          status: 'connected',
          error: '',
          number: data.data?.owner || '',
        })
        if (pollingRefs.current[instId]) clearInterval(pollingRefs.current[instId])
      } else {
        const base64 = data?.data?.qrcode?.base64 || data?.data?.base64 || data?.data?.code
        const qr = base64
          ? base64.startsWith('data:')
            ? base64
            : `data:image/png;base64,${base64}`
          : null
        updateInstanceState(instId, { status: 'disconnected', qrCode: qr, error: 'Desconectado' })
        if (qr) startPolling(instId, dom, tok, adminTok)
      }
    } catch (e: any) {
      let errMsg = e.message || 'Erro de comunicação.'
      if (e.status === 404) errMsg = 'Instância não encontrada.'
      else if (e.status === 401) errMsg = 'Não autorizado.'
      updateInstanceState(instId, { status: 'disconnected', error: errMsg })
    }
  }

  const startPolling = (instId: string, dom: string, tok: string, adminTok: string) => {
    if (pollingRefs.current[instId]) clearInterval(pollingRefs.current[instId])
    pollingRefs.current[instId] = setInterval(async () => {
      try {
        const data = await pb.send(`/backend/v1/uazapi/test-connection`, {
          method: 'POST',
          body: { instance_name: instId, domain: dom, admin_token: adminTok },
        })
        if (data?.status === 'connected') {
          updateInstanceState(instId, {
            status: 'connected',
            qrCode: null,
            error: '',
            number: data.data?.owner || '',
          })
          clearInterval(pollingRefs.current[instId])
          if (user) {
            pb.collection('users')
              .update(user.id, {
                uazapi_status: 'Connected',
                uazapi_instance_number: data.data?.owner || '',
              })
              .catch(() => {})
          }
        }
      } catch (e) {
        // ignore
      }
    }, 5000)
  }

  const generateQrCode = async (instId: string) => {
    if (!validateFields()) return
    updateInstanceState(instId, { isGenerating: true, qrCode: null })
    try {
      const res = await pb.send(`/backend/v1/uazapi/qrcode`, {
        method: 'POST',
        body: { instance_name: instId, domain: domain.trim(), admin_token: adminToken.trim() },
      })
      const base64 = res.data?.qrcode?.base64 || res.data?.base64 || res.data?.code
      if (base64) {
        const qr = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
        updateInstanceState(instId, { qrCode: qr, status: 'disconnected' })
        startPolling(instId, domain.trim(), token.trim(), adminToken.trim())
        toast({ title: 'QR Code gerado', description: 'Escaneie o QR Code com seu WhatsApp.' })
      } else if (res.status === 'connected') {
        updateInstanceState(instId, { status: 'connected' })
        toast({ title: 'Já conectado', description: `A instância ${instId} já está conectada.` })
      }
    } catch (e: any) {
      let errMsg = 'Erro ao gerar QR Code.'
      if (e.status === 404) errMsg = 'Instância não encontrada.'
      updateInstanceState(instId, { error: errMsg })
      toast({ title: 'Erro', description: errMsg, variant: 'destructive' })
    } finally {
      updateInstanceState(instId, { isGenerating: false })
    }
  }

  const connectInstance = async (instId: string) => {
    if (!validateFields()) return
    updateInstanceState(instId, { isReconnecting: true })
    try {
      await pb.send('/backend/v1/uazapi/connect', {
        method: 'POST',
        body: { instance_name: instId, domain: domain.trim(), admin_token: adminToken.trim() },
      })
      toast({ title: 'Conexão iniciada', description: `A instância ${instId} está conectando.` })
      checkConnection(instId, domain.trim(), token.trim(), adminToken.trim())
    } catch (e: any) {
      updateInstanceState(instId, { error: 'Erro ao conectar.', status: 'disconnected' })
      toast({ title: 'Erro', description: 'Não foi possível conectar.', variant: 'destructive' })
    } finally {
      updateInstanceState(instId, { isReconnecting: false })
    }
  }

  const disconnectInstance = async (instId: string) => {
    if (!validateFields()) return
    updateInstanceState(instId, { isDisconnecting: true })
    try {
      await pb
        .send(`/backend/v1/uazapi/disconnect`, {
          method: 'POST',
          body: { instance_name: instId, domain: domain.trim(), admin_token: adminToken.trim() },
        })
        .catch(() =>
          pb.send(`/backend/v1/uazapi/disconnect/${instId}`, {
            method: 'DELETE',
            body: { domain: domain.trim(), admin_token: adminToken.trim() },
          }),
        )
      updateInstanceState(instId, { status: 'disconnected', qrCode: null })
      toast({ title: 'Desconectado', description: `A instância ${instId} foi desconectada.` })
    } catch (e: any) {
      toast({ title: 'Erro', description: 'Erro ao desconectar.', variant: 'destructive' })
    } finally {
      updateInstanceState(instId, { isDisconnecting: false })
    }
  }

  const restartInstance = async (instId: string) => {
    if (!validateFields()) return
    updateInstanceState(instId, { isRestarting: true })
    try {
      await pb
        .send(`/backend/v1/uazapi/restart`, {
          method: 'POST',
          body: { instance_name: instId, domain: domain.trim(), admin_token: adminToken.trim() },
        })
        .catch(() =>
          pb.send(`/backend/v1/uazapi/restart/${instId}`, {
            method: 'PUT',
            body: { domain: domain.trim(), admin_token: adminToken.trim() },
          }),
        )
      toast({ title: 'Reiniciando', description: `A instância ${instId} está sendo reiniciada.` })
      setTimeout(
        () => checkConnection(instId, domain.trim(), token.trim(), adminToken.trim()),
        5000,
      )
    } catch (e: any) {
      toast({ title: 'Erro', description: 'Erro ao reiniciar.', variant: 'destructive' })
    } finally {
      updateInstanceState(instId, { isRestarting: false })
    }
  }

  const handleSaveUazapi = async () => {
    if (!user || !validateFields()) return
    setIsSaving(true)
    try {
      const updatedUser = await pb.collection('users').update(user.id, {
        uazapi_domain: domain.trim(),
        uazapi_token: token.trim(),
        uazapi_admin_token: adminToken.trim(),
      })
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({ title: 'Configurações salvas', description: 'Testando conexões...' })
      instances.forEach((inst) =>
        checkConnection(inst.id, domain.trim(), token.trim(), adminToken.trim()),
      )
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const checkMetaConnection = async (busId: string, phoneId: string, accToken: string) => {
    if (!user) return
    setMetaStatus('checking')
    setMetaErrorDetail('')
    try {
      await pb.send(`/backend/v1/meta_test_connection`, {
        method: 'POST',
        body: { business_id: busId, phone_number_id: phoneId, access_token: accToken },
      })
      setMetaStatus('connected')
      await pb.collection('users').update(user.id, { meta_whatsapp_status: 'Conectado' })
      toast({
        title: 'Conexão Bem-sucedida',
        description: 'As credenciais da Meta são válidas e a conexão foi estabelecida.',
      })
    } catch (e: any) {
      setMetaStatus('disconnected')
      let msg = e.response?.message || e.message || 'Erro ao conectar com a Meta'

      const errString = typeof e === 'object' ? JSON.stringify(e) : String(e)
      if (
        msg.includes('190') ||
        msg.includes('OAuthException') ||
        msg.includes('invalidated') ||
        errString.includes('190') ||
        errString.includes('OAuthException') ||
        errString.includes('invalidated') ||
        msg.toLowerCase().includes('the session has been invalidated')
      ) {
        msg = 'Token de Acesso da Meta é inválido ou a sessão expirou. Atualize suas credenciais.'
      }

      setMetaErrorDetail(msg)
      await pb
        .collection('users')
        .update(user.id, { meta_whatsapp_status: 'Desconectado' })
        .catch(() => {})
      toast({
        title: 'Erro na conexão',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  const handleSaveMeta = async () => {
    if (!user) return
    setIsSavingMeta(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_whatsapp_business_id: metaBusinessId,
        meta_whatsapp_phone_number_id: metaPhoneId,
        meta_whatsapp_access_token: metaAccessToken,
        meta_whatsapp_verify_token: metaVerifyToken,
      })

      // Clear session cache related to Meta to prevent invalid session errors
      localStorage.removeItem('meta_session_cache')
      sessionStorage.removeItem('meta_session_cache')

      toast({ title: 'Meta configurada', description: 'Suas credenciais foram atualizadas.' })
      checkMetaConnection(metaBusinessId, metaPhoneId, metaAccessToken)
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar configurações Meta.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingMeta(false)
    }
  }

  const handleSaveMetaCapi = async () => {
    if (!user) return
    setIsSavingCapi(true)
    try {
      await saveMetaCapiSettings(user.id, metaPixelId, metaCapiToken, metaBusinessId)
      toast({
        title: 'Meta CAPI Salvo',
        description: 'Configurações de Pixel e CAPI foram salvas.',
      })
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao salvar Meta CAPI.', variant: 'destructive' })
    } finally {
      setIsSavingCapi(false)
    }
  }

  const testMetaCapiConnection = async () => {
    if (!user) return
    setIsTestingCapi(true)
    try {
      await executeCapiVerification(user.id, metaBusinessId, metaPixelId, metaCapiToken)
      setCapiStatus('connected')
      toast({
        title: 'Conexão Estabelecida com Sucesso',
        description: 'Teste de conexão bem-sucedido.',
      })
    } catch (e: any) {
      setCapiStatus('disconnected')
      let errorMsg = e.response?.message || e.message || 'Falha de Handshake'
      if (
        errorMsg.includes('190') ||
        errorMsg.includes('invalidated') ||
        errorMsg.includes('OAuthException')
      ) {
        errorMsg = 'Token Inválido. Atualize suas credenciais.'
      }

      toast({ title: 'Erro na validação', description: errorMsg, variant: 'destructive' })
    } finally {
      setIsTestingCapi(false)
    }
  }

  // Meta CAPI Watchdog: monitora a saúde da conexão em segundo plano de forma passiva
  useEffect(() => {
    let watchdog: NodeJS.Timeout
    if (user && capiStatus === 'connected' && metaPixelId && metaCapiToken) {
      watchdog = setInterval(async () => {
        try {
          await executeCapiVerification(user.id, metaBusinessId, metaPixelId, metaCapiToken)
        } catch (e) {
          setCapiStatus('disconnected')
        }
      }, 120000) // Verifica a cada 2 minutos
    }
    return () => clearInterval(watchdog)
  }, [user, capiStatus, metaPixelId, metaCapiToken, metaBusinessId])

  const overallUazapiStatus = instances.some((i) => i.status === 'connected')
    ? 'connected'
    : 'disconnected'

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Painel de Configurações (Core)</h2>
        <p className="text-muted-foreground">
          Gerencie o hub neural e integrações do sistema IA BIA.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
                  {overallUazapiStatus === 'connected' ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={`text-xs font-medium ${overallUazapiStatus === 'connected' ? 'text-emerald-600' : 'text-destructive'}`}
                  >
                    {overallUazapiStatus === 'connected' ? 'Operante' : 'Falha'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta CAPI</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mt-1">
              {capiStatus === 'connected' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Desconectado</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Conversions API</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="uazapi" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-[1000px] overflow-x-auto">
          <TabsTrigger value="uazapi">Uazapi (Legado)</TabsTrigger>
          <TabsTrigger value="meta">WhatsApp (Meta)</TabsTrigger>
          <TabsTrigger value="meta-capi">Meta CAPI</TabsTrigger>
          <TabsTrigger value="ai">IA BIA</TabsTrigger>
          <TabsTrigger value="social">Web & Marketing</TabsTrigger>
        </TabsList>

        <TabsContent value="uazapi">
          <Card className="border-border/50 shadow-sm mt-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <CardTitle>Configuração Global Uazapi</CardTitle>
              </div>
              <CardDescription>Defina a URL do Servidor e Token de Administração.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Server URL</Label>
                  <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className={validationErrors.domain ? 'border-destructive' : ''}
                  />
                  {validationErrors.domain && (
                    <p className="text-xs text-destructive">{validationErrors.domain}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Admin Token</Label>
                  <Input
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    type="password"
                    className={validationErrors.adminToken ? 'border-destructive' : ''}
                  />
                  {validationErrors.adminToken && (
                    <p className="text-xs text-destructive">{validationErrors.adminToken}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Token da API (Opcional)</Label>
                  <Input value={token} onChange={(e) => setToken(e.target.value)} type="password" />
                </div>
              </div>
              <Button onClick={handleSaveUazapi} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Configuração
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm mt-6">
            <CardHeader>
              <CardTitle>Instâncias Uazapi</CardTitle>
              <CardDescription>Conexões com aparelhos WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nome (ID)</th>
                      <th className="px-4 py-3 font-medium">Número</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Erro</th>
                      <th className="px-4 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {instances.map((inst) => (
                      <tr key={inst.id} className="bg-background">
                        <td className="px-4 py-3 font-medium">{inst.id}</td>
                        <td className="px-4 py-3 text-muted-foreground">{inst.number || '-'}</td>
                        <td className="px-4 py-3">
                          {inst.status === 'checking' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : inst.status === 'connected' ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                              Connected
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold bg-destructive/10 text-destructive rounded-full">
                              Disconnected
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-destructive max-w-[200px] truncate">
                          {inst.error}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => connectInstance(inst.id)}
                            disabled={inst.isReconnecting || inst.status === 'connected'}
                            className="mr-2"
                          >
                            {inst.isReconnecting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateQrCode(inst.id)}
                            disabled={inst.isGenerating || inst.status === 'connected'}
                          >
                            QR Code
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restartInstance(inst.id)}
                            disabled={inst.isRestarting}
                            className="ml-2"
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => disconnectInstance(inst.id)}
                            disabled={inst.isDisconnecting || inst.status === 'disconnected'}
                            className="text-destructive ml-2"
                          >
                            Desconectar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 mt-6 flex-wrap">
                {instances.map(
                  (inst) =>
                    inst.qrCode && (
                      <div
                        key={`qr-${inst.id}`}
                        className="flex flex-col items-center p-4 border rounded-lg bg-muted/30 w-fit"
                      >
                        <p className="text-sm mb-2 font-medium">
                          QR Code: <strong>{inst.id}</strong>
                        </p>
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                          <img src={inst.qrCode} alt={`QR Code ${inst.id}`} className="w-48 h-48" />
                        </div>
                      </div>
                    ),
                )}
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
                  <p className="font-semibold text-sm">Falha: {metaErrorDetail}</p>
                </div>
              )}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meta WhatsApp Business ID</Label>
                  <Input
                    value={metaBusinessId}
                    onChange={(e) => setMetaBusinessId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta User ID (Phone Number ID)</Label>
                  <Input
                    value={metaPhoneId}
                    onChange={(e) => setMetaPhoneId(e.target.value)}
                    placeholder="Ex: 27018364624521397"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Token de Acesso (Permanente)</Label>
                  <div className="relative">
                    <Input
                      type={showMetaToken ? 'text' : 'password'}
                      value={metaAccessToken}
                      onChange={(e) => setMetaAccessToken(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowMetaToken(!showMetaToken)}
                    >
                      {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Verify Token</Label>
                  <Input
                    value={metaVerifyToken}
                    onChange={(e) => setMetaVerifyToken(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <Button onClick={handleSaveMeta} disabled={isSavingMeta}>
                  {isSavingMeta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => checkMetaConnection(metaBusinessId, metaPhoneId, metaAccessToken)}
                  disabled={metaStatus === 'checking'}
                >
                  {metaStatus === 'checking' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verificar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta-capi">
          <Card className="border-border/50 shadow-sm mt-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Meta CAPI Configuration</CardTitle>
              </div>
              <CardDescription>
                Configure o Pixel ID e o Token da Conversions API (CAPI).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meta User ID (Business ID)</Label>
                  <Input
                    value={metaBusinessId}
                    onChange={(e) => setMetaBusinessId(e.target.value)}
                    placeholder="Ex: 27018364624521397"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Pixel ID</Label>
                  <Input
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    placeholder="Ex: 1029384756"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Meta CAPI Token</Label>
                  <div className="relative">
                    <Input
                      type={showCapiToken ? 'text' : 'password'}
                      value={metaCapiToken}
                      onChange={(e) => setMetaCapiToken(e.target.value)}
                      placeholder="EAAL..."
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCapiToken(!showCapiToken)}
                    >
                      {showCapiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <Button onClick={handleSaveMetaCapi} disabled={isSavingCapi}>
                  {isSavingCapi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                </Button>
                <Button
                  variant="secondary"
                  onClick={testMetaCapiConnection}
                  disabled={isTestingCapi || !metaPixelId || !metaCapiToken}
                >
                  {isTestingCapi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verificar
                  Conexão
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
        <TabsContent value="social">
          <div className="mt-4">
            <SettingsSocial />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
