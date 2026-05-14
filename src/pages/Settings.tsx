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
  Eye,
  EyeOff,
  Target,
  RefreshCw,
  Power,
  Globe2,
  Wallet,
} from 'lucide-react'
import { SettingsAi } from './settings/SettingsAi'
import { SettingsSocial } from './settings/SettingsSocial'

export default function Settings() {
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
  const [adminToken, setAdminToken] = useState('SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    domain?: string
    instance?: string
    adminToken?: string
  }>({})

  // QR Code States
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
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
  const [showMetaToken, setShowMetaToken] = useState(false)
  const [metaValidationErrors, setMetaValidationErrors] = useState<{
    businessId?: string
    phoneId?: string
    token?: string
  }>({})

  // Meta CAPI States
  const [capiStatus, setCapiStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [showCapiToken, setShowCapiToken] = useState(false)
  const [isSavingCapi, setIsSavingCapi] = useState(false)
  const [isTestingCapi, setIsTestingCapi] = useState(false)

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
        if (e.record.uazapi_error) {
          setMetaErrorDetail(e.record.uazapi_error)
        }
      }

      if (e.record.meta_token_status === 'valid') {
        setCapiStatus('connected')
      } else {
        setCapiStatus('disconnected')
      }
    }
  })

  useEffect(() => {
    if (user && !initialized.current) {
      // Setup Uazapi
      setName(user.name || '')
      setEmail(user.email || '')
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
        if (user.uazapi_error) {
          setMetaErrorDetail(user.uazapi_error)
        }
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

      // Setup Meta CAPI
      setMetaPixelId(user.meta_pixel_id || '')
      setMetaCapiToken(user.meta_capi_token || '')
      setCapiStatus((user as any).meta_token_status === 'valid' ? 'connected' : 'disconnected')

      initialized.current = true
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // --- Uazapi Handlers ---
  const validateFields = () => {
    const errors: { domain?: string; instance?: string; adminToken?: string } = {}

    if (!domain) {
      errors.domain = 'O Domínio é obrigatório.'
    }

    if (!adminToken) {
      errors.adminToken = 'O Admin Token é obrigatório.'
    }

    if (!instanceNumber) {
      errors.instance = 'O ID da Instância é obrigatório.'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const checkConnection = async (inst: string, dom: string, tok: string, adminTok?: string) => {
    if (!user) return
    setStatus('checking')
    setErrorDetail('')
    try {
      const data = await pb.send(`/backend/v1/uazapi/test-connection`, {
        method: 'POST',
        body: { instance_name: inst, domain: dom, admin_token: adminTok },
      })

      if (data?.status === 'connected') {
        setStatus('connected')
        const updatedUser = await pb
          .collection('users')
          .update(user.id, { uazapi_status: 'Conectado', uazapi_error: '' })
        pb.authStore.save(pb.authStore.token, updatedUser)
      } else {
        setStatus('disconnected')
        const base64 = data?.data?.qrcode?.base64 || data?.data?.base64 || data?.data?.code
        if (base64) {
          setQrCode(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`)
          startPolling(inst, dom, tok, adminTok)
        }
        const updatedUser = await pb.collection('users').update(user.id, {
          uazapi_status: 'Desconectado',
          uazapi_error: 'Instância desconectada. Leia o QR Code.',
        })
        pb.authStore.save(pb.authStore.token, updatedUser)
      }
    } catch (e: any) {
      setStatus('disconnected')
      let errMsg = e.message || 'Erro de comunicação.'
      const errStr = String(e.response?.error || e.response?.message || e.message)

      if (e.status === 400 && e.response?.message) errMsg = e.response.message
      else if (e.status === 504) errMsg = 'Timeout. Verifique o Endpoint URL.'
      else if (e.status === 401 || errStr.includes('Unauthorized')) {
        errMsg = 'Unauthorized: Verifique seu Admin Token e o Domain fornecido.'
      }

      setErrorDetail(errMsg)
      const updatedUser = await pb
        .collection('users')
        .update(user.id, { uazapi_status: 'Desconectado', uazapi_error: errMsg })
      pb.authStore.save(pb.authStore.token, updatedUser)
    }
  }

  const startPolling = (inst: string, dom: string, tok: string, adminTok?: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const data = await pb.send(`/backend/v1/uazapi/test-connection`, {
          method: 'POST',
          body: { instance_name: inst, domain: dom, admin_token: adminTok },
        })
        if (data?.status === 'connected') {
          setStatus('connected')
          setQrCode(null)
          if (pollingRef.current) clearInterval(pollingRef.current)
          if (user) {
            const updatedUser = await pb.collection('users').update(user.id, {
              uazapi_status: 'Conectado',
              uazapi_error: '',
              uazapi_instance_number: inst,
              uazapi_domain: dom,
              uazapi_token: tok,
              uazapi_admin_token: adminTok || '',
            })
            pb.authStore.save(pb.authStore.token, updatedUser)
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
        description: 'Verifique as configurações globais antes de gerar o QR Code.',
        variant: 'destructive',
      })
      return
    }
    setIsGeneratingQr(true)
    setQrCode(null)
    try {
      const fullDomain = domain.trim()
      const res = await pb.send(`/backend/v1/uazapi/qrcode`, {
        method: 'POST',
        body: {
          instance_name: instanceNumber.trim(),
          domain: fullDomain,
          admin_token: adminToken.trim(),
        },
      })

      const base64 = res.data?.qrcode?.base64 || res.data?.base64 || res.data?.code
      const pairing = res.data?.pairingCode || res.data?.pairing_code

      if (base64) {
        setQrCode(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`)
        startPolling(instanceNumber.trim(), fullDomain, token.trim(), adminToken.trim())
        toast({
          title: 'QR Code gerado',
          description: pairing
            ? `Código de pareamento: ${pairing}`
            : 'Escaneie o QR Code com seu WhatsApp.',
        })
      } else if (res.status === 'connected') {
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
      const errStr = String(e.response?.error || e.response?.message || e.message)

      if (e.status === 404)
        errMsg = `Instância não encontrada no Uazapi. Verifique se o nome ${instanceNumber} está correto.`
      else if (e.status === 504)
        errMsg = 'Tempo esgotado ao contatar o Uazapi. O serviço pode estar offline.'
      else if (e.status === 401 || errStr.includes('Unauthorized')) {
        errMsg = 'Unauthorized: Verifique seu Admin Token e o Domain fornecido.'
      } else if (e.response?.message) errMsg = e.response.message
      else if (e.message) errMsg = e.message

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

  const connectInstance = async () => {
    if (!user) return
    if (!validateFields()) {
      toast({
        title: 'Dados inválidos',
        description: 'Verifique as configurações antes de conectar.',
        variant: 'destructive',
      })
      return
    }
    setIsReconnecting(true)
    try {
      const payload = {
        instance_name: instanceNumber.trim(),
        domain: domain.trim(),
        admin_token: adminToken.trim(),
      }
      await pb.send('/backend/v1/uazapi/connect', { method: 'POST', body: payload })
      toast({
        title: 'Conexão iniciada',
        description: 'O comando de conexão foi enviado ao Uazapi.',
      })
      checkConnection(instanceNumber.trim(), domain.trim(), token.trim(), adminToken.trim())
    } catch (e: any) {
      let errMsg = e.message || 'Erro de comunicação.'
      const errStr = String(e.response?.error || e.response?.message || e.message)
      if (e.status === 401 || errStr.includes('Unauthorized')) {
        errMsg = 'Unauthorized: Verifique seu Admin Token e o Domain fornecido.'
      }
      toast({ title: 'Erro ao Conectar', description: errMsg, variant: 'destructive' })
      setErrorDetail(errMsg)
      setStatus('disconnected')
    } finally {
      setIsReconnecting(false)
    }
  }

  const disconnectInstance = async () => {
    if (!user) return
    if (!validateFields()) {
      toast({
        title: 'Dados inválidos',
        description: 'Verifique as configurações antes de desconectar.',
        variant: 'destructive',
      })
      return
    }
    setIsDisconnecting(true)
    try {
      await pb
        .send(`/backend/v1/uazapi/disconnect`, {
          method: 'POST',
          body: {
            instance_name: instanceNumber.trim(),
            domain: domain.trim(),
            admin_token: adminToken.trim(),
          },
        })
        .catch(() =>
          pb.send(`/backend/v1/uazapi/disconnect/${instanceNumber.trim()}`, {
            method: 'DELETE',
            body: {
              domain: domain.trim(),
              admin_token: adminToken.trim(),
            },
          }),
        )
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
    if (!validateFields()) {
      toast({
        title: 'Dados inválidos',
        description: 'Verifique as configurações antes de reiniciar.',
        variant: 'destructive',
      })
      return
    }
    setIsRestarting(true)
    try {
      await pb
        .send(`/backend/v1/uazapi/restart`, {
          method: 'POST',
          body: {
            instance_name: instanceNumber.trim(),
            domain: domain.trim(),
            admin_token: adminToken.trim(),
          },
        })
        .catch(() =>
          pb.send(`/backend/v1/uazapi/restart/${instanceNumber.trim()}`, {
            method: 'PUT',
            body: {
              domain: domain.trim(),
              admin_token: adminToken.trim(),
            },
          }),
        )
      toast({ title: 'Reiniciando', description: 'A instância está sendo reiniciada.' })
      setTimeout(() => {
        checkConnection(instanceNumber.trim(), domain.trim(), token.trim(), adminToken.trim())
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
      const cleanDomain = domain.trim()
      const cleanToken = token.trim()
      const cleanAdminToken = adminToken.trim()
      const cleanInstanceNumber = instanceNumber.trim()

      const payload: any = {
        name,
        uazapi_domain: cleanDomain,
        uazapi_token: cleanToken,
        uazapi_admin_token: cleanAdminToken,
        uazapi_instance_number: cleanInstanceNumber,
      }
      if (email !== user.email) payload.email = email

      setDomain(cleanDomain)
      setToken(cleanToken)
      setAdminToken(cleanAdminToken)
      setInstanceNumber(cleanInstanceNumber)

      const updatedUser = await pb.collection('users').update(user.id, payload)
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({ title: 'Configurações salvas', description: 'Testando conexão...' })
      await checkConnection(cleanInstanceNumber, cleanDomain, cleanToken, cleanAdminToken)
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
      const updatedUser = await pb
        .collection('users')
        .update(user.id, { meta_whatsapp_status: 'Conectado', uazapi_error: '' })
      pb.authStore.save(pb.authStore.token, updatedUser)
    } catch (e: any) {
      setMetaStatus('disconnected')

      let errMsg =
        'Erro de comunicação com a Meta. Verifique se o Token não está expirado e se os IDs estão corretos.'
      if (e.response?.message && e.response?.message !== 'Something went wrong.') {
        errMsg = e.response.message
      } else if (e.response?.data?.message) {
        errMsg = e.response.data.message
      } else if (e.message && e.message !== 'Something went wrong.') {
        errMsg = e.message
      }

      setMetaErrorDetail(errMsg)
      const updatedUser = await pb
        .collection('users')
        .update(user.id, { meta_whatsapp_status: 'Desconectado', uazapi_error: errMsg })
      pb.authStore.save(pb.authStore.token, updatedUser)
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
      const updatedUser = await pb.collection('users').update(user.id, payload)
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({
        title: 'Configurações Meta salvas',
        description: 'Suas credenciais foram atualizadas com sucesso.',
      })
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

  // --- Meta CAPI Handlers ---
  const handleSaveMetaCapi = async () => {
    if (!user) return
    setIsSavingCapi(true)
    try {
      const payload = {
        meta_pixel_id: metaPixelId.trim(),
        meta_capi_token: metaCapiToken.trim(),
      }
      const updatedUser = await pb.collection('users').update(user.id, payload)
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({
        title: 'Meta CAPI Salvo',
        description: 'As configurações de Pixel e Conversions API foram salvas.',
      })
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações do Meta CAPI.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCapi(false)
    }
  }

  const testMetaCapiConnection = async () => {
    if (!user) return
    setIsTestingCapi(true)
    try {
      await pb.send('/backend/v1/meta_capi_test', {
        method: 'POST',
        body: { pixel_id: metaPixelId.trim(), access_token: metaCapiToken.trim() },
      })
      setCapiStatus('connected')
      const updatedUser = await pb
        .collection('users')
        .update(user.id, { meta_token_status: 'valid' })
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({ title: 'Meta CAPI Conectado', description: 'Teste de conexão bem-sucedido.' })
    } catch (e: any) {
      setCapiStatus('disconnected')
      let errMsg = 'Erro na validação do CAPI.'
      if (e.response?.message) errMsg = e.response.message
      else if (e.message) errMsg = e.message

      const updatedUser = await pb
        .collection('users')
        .update(user.id, { meta_token_status: 'invalid' })
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({
        title: 'Erro de Conexão CAPI',
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setIsTestingCapi(false)
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

      <Tabs defaultValue="meta" className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-[1200px] overflow-x-auto">
          <TabsTrigger value="meta">WhatsApp (Meta)</TabsTrigger>
          <TabsTrigger value="uazapi">Uazapi (Legado)</TabsTrigger>
          <TabsTrigger value="meta-capi">Meta CAPI</TabsTrigger>
          <TabsTrigger value="ai">IA BIA</TabsTrigger>
          <TabsTrigger value="google-ads">Google Ads</TabsTrigger>
          <TabsTrigger value="social">Web & Marketing</TabsTrigger>
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
                  <div className="relative">
                    <Input
                      value={metaAccessToken}
                      onChange={(e) => {
                        setMetaAccessToken(e.target.value)
                        if (metaValidationErrors.token)
                          setMetaValidationErrors({ ...metaValidationErrors, token: undefined })
                      }}
                      type={showMetaToken ? 'text' : 'password'}
                      placeholder="EAA..."
                      className={metaValidationErrors.token ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                      onClick={() => setShowMetaToken(!showMetaToken)}
                    >
                      {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
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
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => checkMetaConnection(metaBusinessId, metaPhoneId, metaAccessToken)}
                  disabled={
                    metaStatus === 'checking' ||
                    isSavingMeta ||
                    !metaBusinessId ||
                    !metaPhoneId ||
                    !metaAccessToken
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
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meta Pixel ID</Label>
                  <Input
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    placeholder="Ex: 1029384756"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conversions API Token</Label>
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
                      className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:bg-transparent"
                      onClick={() => setShowCapiToken(!showCapiToken)}
                    >
                      {showCapiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <Button type="button" onClick={handleSaveMetaCapi} disabled={isSavingCapi}>
                  {isSavingCapi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={testMetaCapiConnection}
                  disabled={isTestingCapi || !metaPixelId || !metaCapiToken}
                >
                  {isTestingCapi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
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
                <CardTitle>Configuração Global Uazapi</CardTitle>
              </div>
              <CardDescription>
                Defina a URL do Servidor, Token de Administração e sua Instância.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {status === 'disconnected' && errorDetail && (
                <div className="flex items-start p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
                  <AlertTriangle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Falha na conexão: {errorDetail}</p>
                    {errorDetail.toLowerCase().includes('unauthorized') && (
                      <p className="text-xs mt-1">
                        Verifique o seu <strong>Admin Token</strong> abaixo e salve as configurações
                        para tentar novamente.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="col-span-2 p-4 bg-muted/30 rounded-lg border flex flex-col gap-3">
                  <Label>Instâncias Uazapi Disponíveis</Label>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setInstanceNumber('rqqga0')
                        setAdminToken('c41be398-c7b7-4ba6-b70b-e61a36873e5c')
                        toast({
                          title: 'Instância 1 Selecionada',
                          description: 'Preenchido com rqqga0. Clique em Salvar Configuração.',
                        })
                      }}
                    >
                      Selecionar Instância 1 (rqqga0)
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setInstanceNumber('CcZPx1')
                        setAdminToken('64582e1c-d189-4ea6-8c6c-61f652991b64')
                        toast({
                          title: 'Instância 2 Selecionada',
                          description: 'Preenchido com CcZPx1. Clique em Salvar Configuração.',
                        })
                      }}
                    >
                      Selecionar Instância 2 (CcZPx1)
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Server URL</Label>
                  <Input
                    value={domain}
                    onChange={(e) => {
                      setDomain(e.target.value)
                      if (validationErrors.domain)
                        setValidationErrors({ ...validationErrors, domain: undefined })
                    }}
                    placeholder="https://api.uazapi.com"
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
                    onChange={(e) => {
                      setAdminToken(e.target.value)
                      if (validationErrors.adminToken)
                        setValidationErrors({ ...validationErrors, adminToken: undefined })
                    }}
                    type="password"
                    placeholder="Obrigatório"
                    className={validationErrors.adminToken ? 'border-destructive' : ''}
                  />
                  {validationErrors.adminToken && (
                    <p className="text-xs text-destructive">{validationErrors.adminToken}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Token da API (Opcional)</Label>
                  <Input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    type="password"
                    placeholder="c41be398-c7b7-4ba6-b70b-e61a36873e5c"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome de Exibição (Identificação)</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Minha Instância"
                  />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label>ID da Instância (Lógica)</Label>
                  <Input
                    value={instanceNumber}
                    onChange={(e) => {
                      setInstanceNumber(e.target.value)
                      if (validationErrors.instance)
                        setValidationErrors({ ...validationErrors, instance: undefined })
                    }}
                    placeholder="CcZPx1 ou rqqga0"
                    className={validationErrors.instance ? 'border-destructive' : ''}
                  />
                  {validationErrors.instance && (
                    <p className="text-xs text-destructive">{validationErrors.instance}</p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Configuração
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm mt-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Instâncias Uazapi</CardTitle>
                  <CardDescription>
                    Limite de dispositivos (instâncias) que podem ser conectados: 2
                  </CardDescription>
                </div>
                <div className="text-sm font-medium bg-muted px-3 py-1.5 rounded-md border text-muted-foreground">
                  1 instância ativa
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={connectInstance}
                  disabled={isReconnecting || !instanceNumber}
                >
                  {isReconnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Conectar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={restartInstance}
                  disabled={isRestarting || !instanceNumber}
                >
                  {isRestarting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="mr-2 h-4 w-4" />
                  )}
                  Reiniciar Instância
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    checkConnection(
                      instanceNumber.trim(),
                      domain.trim(),
                      token.trim(),
                      adminToken.trim(),
                    )
                  }
                  disabled={status === 'checking'}
                >
                  {status === 'checking' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Status
                </Button>
                <Button variant="outline" size="sm">
                  <Globe2 className="mr-2 h-4 w-4" />
                  Webhook Global
                </Button>
                <Button variant="outline" size="sm">
                  <Wallet className="mr-2 h-4 w-4" />
                  Financeiro
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Número</th>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Instância</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="bg-background">
                      <td className="px-4 py-3 font-medium">5548992098050</td>
                      <td className="px-4 py-3 text-muted-foreground">{name || 'Instância'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {instanceNumber || 'Nenhuma'}
                      </td>
                      <td className="px-4 py-3">
                        {status === 'connected' ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive">
                            Disconnected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={generateQrCode}
                          disabled={isGeneratingQr || status === 'connected'}
                        >
                          {isGeneratingQr && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                          Gerar QR Code
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={disconnectInstance}
                          disabled={isDisconnecting || status === 'disconnected'}
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 ml-2"
                        >
                          {isDisconnecting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                          Desconectar
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {qrCode && (
                <div className="mt-6 flex flex-col items-center p-6 border rounded-lg bg-muted/30">
                  <p className="text-sm mb-4 font-medium text-center">
                    Escaneie o QR Code abaixo com seu WhatsApp para conectar a instância{' '}
                    <strong className="text-foreground">{instanceNumber}</strong>
                  </p>
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <img
                      src={qrCode}
                      alt="QR Code para conectar ao WhatsApp"
                      className="w-56 h-56"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <div className="mt-4">
            <SettingsAi />
          </div>
        </TabsContent>

        <TabsContent value="social">
          <SettingsSocial />
        </TabsContent>
      </Tabs>
    </div>
  )
}
