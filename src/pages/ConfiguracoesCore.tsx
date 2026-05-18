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
  Info,
} from 'lucide-react'
import { SettingsAi } from './settings/SettingsAi'
import { SettingsSocial } from './settings/SettingsSocial'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const { toast } = useToast()

  const defaultDomain = 'https://iabrfimveis.uazapi.com'
  const defaultAdminToken = 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
  const defaultWebhookUrl = 'https://ia-uazapi-6d79e.goskip.app/backend/v1/meta-webhook'

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
      id: 'zRuJNw',
      number: '554891828050',
      status: 'connected',
      qrCode: null as string | null,
      error: '',
      serverUrl: 'https://iabrfimveis.uazapi.com',
      instanceToken: '04fca934-b2f9-4ba1-bdd2-4684aac2cdcd',
      isGenerating: false,
      isDisconnecting: false,
      isRestarting: false,
      isReconnecting: false,
    },
    {
      id: 'BRF 1',
      number: '',
      status: 'checking',
      qrCode: null as string | null,
      error: '',
      serverUrl: '',
      instanceToken: '',
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
  const [metaValidationErrors, setMetaValidationErrors] = useState<{
    businessId?: string
    phoneId?: string
    accessToken?: string
  }>({})

  // Meta CAPI States
  const [capiStatus, setCapiStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [capiErrorDetail, setCapiErrorDetail] = useState('')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [showCapiToken, setShowCapiToken] = useState(false)
  const [isSavingCapi, setIsSavingCapi] = useState(false)
  const [isTestingCapi, setIsTestingCapi] = useState(false)
  const [capiValidationErrors, setCapiValidationErrors] = useState<{
    businessId?: string
    pixelId?: string
    accessToken?: string
  }>({})

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

  const formatPhoneNumber = (number: string) => {
    if (!number) return '-'
    const cleaned = number.replace(/\D/g, '')
    if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`
    }
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
    }
    return number
  }

  useEffect(() => {
    localStorage.removeItem('vite-plugin-react-router-cache')
    localStorage.removeItem('meta_session_cache')
    sessionStorage.removeItem('meta_session_cache')

    localStorage.removeItem('dashboard_state')
    sessionStorage.removeItem('dashboard_state')
    localStorage.removeItem('active_instance_cache')
    sessionStorage.removeItem('active_instance_cache')

    if (user && !initialized.current) {
      const uDomain = user.uazapi_domain || defaultDomain
      const uToken = user.uazapi_token || ''
      const uAdminToken = user.uazapi_admin_token || defaultAdminToken

      setDomain(uDomain)
      setToken(uToken)
      setAdminToken(uAdminToken)

      instances.forEach((inst) => {
        if (inst.id === 'zRuJNw') {
          const isConnected = user?.uazapi_status?.toLowerCase() === 'connected'
          updateInstanceState('zRuJNw', {
            status: isConnected ? 'connected' : 'disconnected',
            number: user?.uazapi_instance_number || '554891828050',
            serverUrl: user?.uazapi_domain || 'https://iabrfimveis.uazapi.com',
            instanceToken: user?.uazapi_token || '04fca934-b2f9-4ba1-bdd2-4684aac2cdcd',
          })
        } else {
          checkConnection(inst.id, uDomain, uToken, uAdminToken)
        }
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

      const isCapiConnected =
        (user as any).meta_token_status === 'connected' ||
        (user as any).meta_token_status === 'valid'
      setCapiStatus(isCapiConnected ? 'connected' : 'disconnected')

      if (!isCapiConnected && ((user as any).meta_token_status || (user as any).uazapi_error)) {
        const tokenStatus = (user as any).meta_token_status
        const errorDetail =
          tokenStatus && tokenStatus !== 'error'
            ? tokenStatus
            : (user as any).uazapi_error || 'Erro de validação do token'
        setCapiErrorDetail(errorDetail)
      } else {
        setCapiErrorDetail('')
      }

      initialized.current = true
    }

    return () => {
      Object.values(pollingRefs.current).forEach(clearInterval)
    }
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
      const connectedInstance =
        instances.find((i) => i.id === 'zRuJNw') || instances.find((i) => i.status === 'connected')

      const updatedUser = await pb.collection('users').update(user.id, {
        uazapi_domain: domain.trim(),
        uazapi_token: token.trim(),
        uazapi_admin_token: adminToken.trim(),
        uazapi_status: connectedInstance ? 'Connected' : 'Disconnected',
        uazapi_instance_number: connectedInstance?.number || '554891828050',
      })
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({
        title: 'Configurações salvas com sucesso',
        description: 'Dados atualizados no sistema. Testando conexões...',
      })
      instances.forEach((inst) => {
        if (inst.id !== 'zRuJNw') {
          checkConnection(inst.id, domain.trim(), token.trim(), adminToken.trim())
        }
      })
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
      await pb.send(`/backend/v1/meta/test-connection`, {
        method: 'POST',
        body: {
          business_id: busId?.trim() || '',
          phone_number_id: phoneId?.trim() || '',
          access_token: accToken?.trim() || '',
        },
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
        msg = `Erro de Autenticação: ${msg}`
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

  const validateMetaInputs = () => {
    const errors: { businessId?: string; phoneId?: string; accessToken?: string } = {}
    if (!metaBusinessId?.trim()) {
      errors.businessId = 'O Meta Business ID é obrigatório.'
    } else if (!/^\d+$/.test(metaBusinessId)) {
      errors.businessId = 'O Meta Business ID deve conter apenas números.'
    }
    if (!metaPhoneId?.trim()) {
      errors.phoneId = 'O Phone Number ID é obrigatório.'
    } else if (!/^\d+$/.test(metaPhoneId)) {
      errors.phoneId = 'O Phone Number ID deve conter apenas números.'
    }
    if (!metaAccessToken?.trim()) {
      errors.accessToken = 'O Access Token é obrigatório.'
    }
    setMetaValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveMeta = async () => {
    if (!user) return
    if (!validateMetaInputs()) {
      toast({
        title: 'Erro de Validação',
        description: 'Verifique os campos de ID do Meta antes de salvar.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingMeta(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_whatsapp_business_id: metaBusinessId?.trim() || '',
        meta_whatsapp_phone_number_id: metaPhoneId?.trim() || '',
        meta_whatsapp_access_token: metaAccessToken?.trim() || '',
        meta_whatsapp_verify_token: metaVerifyToken?.trim() || '',
      })

      localStorage.removeItem('meta_session_cache')
      sessionStorage.removeItem('meta_session_cache')

      toast({ title: 'Sucesso', description: 'Configurações atualizadas com sucesso!' })
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

  const validateCapiInputs = () => {
    const errors: { businessId?: string; pixelId?: string; accessToken?: string } = {}
    if (!metaBusinessId?.trim()) {
      errors.businessId = 'O Meta Business ID é obrigatório.'
    } else if (!/^\d+$/.test(metaBusinessId)) {
      errors.businessId = 'O Meta Business ID deve conter apenas números.'
    }
    if (!metaPixelId?.trim()) {
      errors.pixelId = 'O Dataset/Pixel ID é obrigatório.'
    } else if (!/^\d+$/.test(metaPixelId)) {
      errors.pixelId = 'O Dataset/Pixel ID deve conter apenas números.'
    }
    if (!metaCapiToken?.trim()) {
      errors.accessToken = 'O Access Token é obrigatório.'
    }
    setCapiValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Erro de Validação',
        description: 'Verifique os valores informados antes de prosseguir.',
        variant: 'destructive',
      })
      return false
    }
    return true
  }

  const handleSaveMetaCapi = async () => {
    if (!user) return
    if (!validateCapiInputs()) return

    setIsSavingCapi(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_whatsapp_business_id: metaBusinessId?.trim() || '',
        meta_pixel_id: metaPixelId?.trim() || '',
        meta_capi_token: metaCapiToken?.trim() || '',
      })
      toast({ title: 'Sucesso', description: 'Configurações atualizadas com sucesso!' })
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao salvar Meta CAPI.', variant: 'destructive' })
    } finally {
      setIsSavingCapi(false)
    }
  }

  const testMetaCapiConnection = async () => {
    if (!user) return
    if (!validateCapiInputs()) return

    setIsTestingCapi(true)
    setCapiErrorDetail('')
    try {
      await pb.collection('users').update(user.id, {
        meta_whatsapp_business_id: metaBusinessId?.trim() || '',
        meta_pixel_id: metaPixelId?.trim() || '',
        meta_capi_token: metaCapiToken?.trim() || '',
      })

      const payload = {
        business_id: metaBusinessId?.trim() || '',
        pixel_id: metaPixelId?.trim() || '',
        access_token: metaCapiToken?.trim() || '',
      }

      await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: payload,
      })
      setCapiStatus('connected')
      toast({
        title: 'Conexão Estabelecida com Sucesso',
        description:
          'Teste de conexão bem-sucedido. A API de Conversões está configurada corretamente.',
      })
    } catch (e: any) {
      setCapiStatus('disconnected')
      let errorMsg = e.response?.message || e.message || 'Falha de Handshake'

      if (
        (errorMsg.includes('190') ||
          errorMsg.includes('invalidated') ||
          errorMsg.includes('OAuthException')) &&
        !errorMsg.includes('Unsupported post request')
      ) {
        errorMsg = `Erro de Autenticação: ${errorMsg}`
      }

      if (
        errorMsg.includes('Unsupported post request') ||
        errorMsg.includes('Object with ID') ||
        errorMsg.includes('Object ID does not exist') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('Invalid parameter')
      ) {
        errorMsg = `Erro da API Meta: ${errorMsg}`
      }

      pb.collection('users')
        .update(user.id, {
          uazapi_error: errorMsg,
          meta_token_status: errorMsg,
        })
        .catch(() => {})

      setCapiErrorDetail(errorMsg)

      toast({ title: 'Erro na validação', description: errorMsg, variant: 'destructive' })
    } finally {
      setIsTestingCapi(false)
    }
  }

  useEffect(() => {
    let watchdog: NodeJS.Timeout
    if (user && capiStatus === 'connected' && metaPixelId && metaCapiToken) {
      watchdog = setInterval(async () => {
        try {
          await pb.send('/backend/v1/meta_capi_test_connection', {
            method: 'POST',
            body: {
              business_id: metaBusinessId,
              pixel_id: metaPixelId,
              access_token: metaCapiToken,
            },
          })
        } catch (e) {
          setCapiStatus('disconnected')
        }
      }, 120000)
    }
    return () => clearInterval(watchdog)
  }, [user, capiStatus, metaPixelId, metaCapiToken, metaBusinessId])

  const overallUazapiStatus =
    user?.uazapi_status?.toLowerCase() === 'connected' ||
    instances.some((i) => i.status === 'connected')
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
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-2">
                {capiStatus === 'connected' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      {capiErrorDetail ? 'Connection Error' : 'Disconnected'}
                    </span>
                  </>
                )}
              </div>
              {capiStatus === 'disconnected' && capiErrorDetail && (
                <p
                  className="text-xs text-destructive mt-1 max-w-[200px] truncate"
                  title={capiErrorDetail}
                >
                  {capiErrorDetail}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Conversions API</p>
            </div>
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
                  <Label>Server URL (Webhook)</Label>
                  <Input
                    value={defaultWebhookUrl}
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Uazapi API Domain</Label>
                  <Input
                    value={domain}
                    placeholder="https://iabrfimveis.uazapi.com"
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
                      <th className="px-4 py-3 font-medium">Detalhes</th>
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
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {inst.serverUrl && (
                            <div className="truncate max-w-[200px]" title={inst.serverUrl}>
                              URL: {inst.serverUrl}
                            </div>
                          )}
                          {inst.instanceToken && (
                            <div className="truncate max-w-[200px]" title={inst.instanceToken}>
                              Token: {inst.instanceToken}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatPhoneNumber(inst.number)}
                        </td>
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
                  <Label className="flex items-center gap-2">Meta Business ID</Label>
                  <Input
                    value={metaBusinessId}
                    onChange={(e) => setMetaBusinessId(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 27018364624521397"
                    className={metaValidationErrors.businessId ? 'border-destructive' : ''}
                  />
                  {metaValidationErrors.businessId && (
                    <p className="text-xs text-destructive mt-1">
                      {metaValidationErrors.businessId}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1 mt-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    Encontrado no Business Manager da Meta ou no App Dashboard em WhatsApp &gt;
                    Configurações da API.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">Phone Number ID</Label>
                  <Input
                    value={metaPhoneId}
                    onChange={(e) => setMetaPhoneId(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 27018364624521397"
                    className={metaValidationErrors.phoneId ? 'border-destructive' : ''}
                  />
                  {metaValidationErrors.phoneId && (
                    <p className="text-xs text-destructive mt-1">{metaValidationErrors.phoneId}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1 mt-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    Encontrado em WhatsApp &gt; Configurações da API &gt; Identificador do número de
                    telefone.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">Access Token</Label>
                  <div className="relative">
                    <Input
                      type={showMetaToken ? 'text' : 'password'}
                      value={metaAccessToken}
                      onChange={(e) => setMetaAccessToken(e.target.value)}
                      className={
                        'pr-10 ' + (metaValidationErrors.accessToken ? 'border-destructive' : '')
                      }
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
                  {metaValidationErrors.accessToken && (
                    <p className="text-xs text-destructive mt-1">
                      {metaValidationErrors.accessToken}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1 mt-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    Token gerado no Meta for Developers com permissões whatsapp_business_messaging e
                    whatsapp_business_management.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">Verify Token</Label>
                  <Input
                    value={metaVerifyToken}
                    onChange={(e) => setMetaVerifyToken(e.target.value)}
                    placeholder="Ex: meu_token_secreto"
                  />
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1 mt-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />O token de verificação usado na
                    configuração do Webhook.
                  </p>
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <Button onClick={handleSaveMeta} disabled={isSavingMeta}>
                  {isSavingMeta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => checkMetaConnection(metaBusinessId, metaPhoneId, metaAccessToken)}
                  disabled={
                    metaStatus === 'checking' || !metaBusinessId || !metaPhoneId || !metaAccessToken
                  }
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
              <div className="bg-muted/50 p-4 rounded-lg border text-sm text-muted-foreground space-y-2">
                <h4 className="font-semibold text-foreground mb-3">Guia de Configuração</h4>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>
                    <strong>Locating Pixel ID:</strong> Go to Meta Events Manager &gt; Data Sources
                    &gt; Select your Pixel &gt; Settings tab &gt; Copy the 'Pixel ID'.
                  </li>
                  <li>
                    <strong>Generating Access Token:</strong> In the same Settings tab, scroll down
                    to 'Conversions API' &gt; Click 'Generate access token' under the 'Set up
                    manually' section.
                  </li>
                  <li>
                    <strong>Data Entry:</strong> Paste the Pixel ID and the generated Token into the
                    fields below and click 'Save' or 'Test CAPI Connection'.
                  </li>
                </ol>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">Meta Business ID</Label>
                  <Input
                    value={metaBusinessId}
                    onChange={(e) => setMetaBusinessId(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 27018364624521397"
                    className={capiValidationErrors.businessId ? 'border-destructive' : ''}
                  />
                  {capiValidationErrors.businessId && (
                    <p className="text-xs text-destructive mt-1">
                      {capiValidationErrors.businessId}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1 mt-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />O ID numérico da sua conta Business
                    Manager da Meta.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">Dataset/Pixel ID</Label>
                  <Input
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 1522162279584545"
                    className={capiValidationErrors.pixelId ? 'border-destructive' : ''}
                  />
                  {capiValidationErrors.pixelId && (
                    <p className="text-xs text-destructive mt-1">{capiValidationErrors.pixelId}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1 mt-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />O ID numérico do seu Dataset (Pixel)
                    de eventos. Encontrado em Meta Events Manager &gt; Data Sources.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">Access Token</Label>
                  <div className="relative">
                    <Input
                      type={showCapiToken ? 'text' : 'password'}
                      value={metaCapiToken}
                      onChange={(e) => setMetaCapiToken(e.target.value)}
                      placeholder="EAAL..."
                      className={
                        'pr-10 ' + (capiValidationErrors.accessToken ? 'border-destructive' : '')
                      }
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
                  {capiValidationErrors.accessToken && (
                    <p className="text-xs text-destructive mt-1">
                      {capiValidationErrors.accessToken}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1 mt-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    Token permanente gerado no Gerenciador de Eventos da Meta para a Conversions
                    API.
                  </p>
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
                  {isTestingCapi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Test CAPI
                  Connection
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
