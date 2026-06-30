import React, { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  RefreshCw,
  Smartphone,
  QrCode,
  Power,
  CheckCircle2,
  BarChart,
  AlertCircle,
  Plug,
} from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

class ConnectionErrorBoundary extends React.Component<
  { children: React.ReactNode; name: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erro em {this.props.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar este painel de configuração.
            </p>
            <div className="mt-4 bg-red-50 p-3 rounded-md text-sm text-red-800 font-mono break-words overflow-auto">
              {this.state.error?.message || 'Erro desconhecido'}
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}

const UazapiPanel = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [domain, setDomain] = useState(user?.uazapi_domain || '')
  const [token, setToken] = useState(user?.uazapi_token || '')
  const [adminToken, setAdminToken] = useState(user?.uazapi_admin_token || '')
  const [instanceNumber, setInstanceNumber] = useState(user?.uazapi_instance_number || '')

  const [status, setStatus] = useState(user?.uazapi_status || 'disconnected')
  const [errorMsg, setErrorMsg] = useState(user?.uazapi_error || '')

  const [isSaving, setIsSaving] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const [qrCodeData, setQrCodeData] = useState<{ base64?: string; code?: string } | null>(null)
  const [isLoadingQr, setIsLoadingQr] = useState(false)

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setStatus(e.record.uazapi_status || 'disconnected')
      setErrorMsg(e.record.uazapi_error || '')
    }
  })

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        uazapi_domain: domain,
        uazapi_token: token,
        uazapi_admin_token: adminToken,
        uazapi_instance_number: instanceNumber,
      })
      toast({
        title: 'Configurações salvas',
        description: 'As credenciais do UAZAPI foram atualizadas.',
      })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestart = async () => {
    setIsRestarting(true)
    try {
      await pb.send('/backend/v1/uazapi/restart', { method: 'POST' })
      toast({ title: 'Instância reiniciada', description: 'O comando de reinício foi enviado.' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reiniciar',
        description: err.message || 'Falha ao processar comando.',
      })
    } finally {
      setIsRestarting(false)
    }
  }

  const handleSyncStatus = async () => {
    setIsSyncing(true)
    try {
      await pb.send('/backend/v1/uazapi/status', { method: 'GET' })
      toast({ title: 'Status atualizado', description: 'O status da instância foi verificado.' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao verificar status',
        description: err.message || 'Falha ao acessar status.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleTestConnection = async () => {
    if (!domain.trim() || !instanceNumber.trim() || !token.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Domínio, Instância e Token são obrigatórios para testar.',
      })
      return
    }
    setIsTesting(true)
    try {
      let cleanDomain = domain.trim()
      if (cleanDomain && !cleanDomain.startsWith('http')) {
        cleanDomain = 'https://' + cleanDomain
      }
      if (cleanDomain.endsWith('/')) {
        cleanDomain = cleanDomain.slice(0, -1)
      }
      const res = await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: cleanDomain,
          instance: instanceNumber.trim(),
          token: token.trim(),
        }),
      })
      if (res.status === 'success') {
        setStatus('connected')
        toast({
          title: 'Conexão bem-sucedida',
          description: 'A comunicação com a instância UAZAPI está funcionando.',
        })
        if (user?.id) {
          await pb.collection('users').update(user.id, {
            uazapi_domain: cleanDomain,
            uazapi_instance_number: instanceNumber.trim(),
            uazapi_token: token.trim(),
            uazapi_status: 'connected',
            uazapi_error: '',
          })
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha na conexão',
          description: res.error || 'Erro ao testar a conexão.',
        })
      }
    } catch (err: any) {
      const msg = err?.response?.error || err?.message || 'Erro ao testar a conexão.'
      toast({
        variant: 'destructive',
        title: 'Falha na conexão',
        description: msg,
      })
      setStatus('disconnected')
    } finally {
      setIsTesting(false)
    }
  }

  const fetchQrCode = async () => {
    setIsLoadingQr(true)
    try {
      const res = await pb.send('/backend/v1/uazapi/qrcode', { method: 'GET' })
      if (res && res.base64) {
        setQrCodeData({ base64: res.base64, code: res.code })
        toast({ title: 'QR Code gerado', description: 'Leia o QR Code com o seu WhatsApp.' })
      } else {
        toast({
          variant: 'destructive',
          title: 'QR Code não disponível',
          description: 'A instância pode já estar conectada ou ocorreu um erro.',
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar QR Code',
        description: err.message || 'Não foi possível buscar o QR Code.',
      })
    } finally {
      setIsLoadingQr(false)
    }
  }

  const isConnected = status.toLowerCase() === 'connected' || status.toLowerCase() === 'open'

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">WhatsApp (UAZAPI)</CardTitle>
          </div>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={
              isConnected ? 'bg-green-500 hover:bg-green-600 text-sm py-1' : 'text-sm py-1'
            }
          >
            {isConnected ? 'Conectado Perfeitamente' : status || 'Desconectado'}
          </Badge>
        </div>
        <CardDescription className="pt-2">
          Configure a sua instância do UAZAPI para integrações e disparos via WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-100 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-1">Status de Erro:</span>
              <span className="opacity-90">{errorMsg}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="uazapi_domain">Domínio da API</Label>
            <Input
              id="uazapi_domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="https://api.uazapi.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uazapi_instance">Nome/Número da Instância</Label>
            <Input
              id="uazapi_instance"
              value={instanceNumber}
              onChange={(e) => setInstanceNumber(e.target.value)}
              placeholder="instancia-brf"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uazapi_token">Token da Instância (Opcional se usar Global)</Label>
            <Input
              id="uazapi_token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="• • • • • • • •"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uazapi_admin_token">Global API Key</Label>
            <Input
              id="uazapi_admin_token"
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="• • • • • • • •"
            />
          </div>
        </div>

        <div className="pt-6 border-t flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar Credenciais
          </Button>

          <Button
            onClick={handleTestConnection}
            disabled={isTesting}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plug className="mr-2 h-4 w-4" />
            )}
            Testar Conexão
          </Button>

          <Button
            onClick={handleSyncStatus}
            disabled={isSyncing}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar Status
          </Button>

          <Button
            onClick={handleRestart}
            disabled={isRestarting}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {isRestarting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Power className="mr-2 h-4 w-4" />
            )}
            Reiniciar Instância
          </Button>

          {!isConnected && (
            <Button
              onClick={fetchQrCode}
              disabled={isLoadingQr}
              variant="default"
              className="w-full sm:w-auto sm:ml-auto"
            >
              {isLoadingQr ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Gerar QR Code
            </Button>
          )}
        </div>

        {qrCodeData?.base64 && !isConnected && (
          <div className="mt-6 flex flex-col items-center justify-center p-8 border rounded-xl bg-slate-50/80 shadow-inner">
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
              <img src={qrCodeData.base64} alt="QR Code" className="w-64 h-64 object-contain" />
            </div>
            <h4 className="font-medium text-center text-lg">Escaneie o QR Code</h4>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera para a
              imagem acima.
            </p>
            {qrCodeData.code && (
              <div className="mt-4 px-4 py-2 bg-slate-200 rounded text-sm text-slate-700 font-mono font-medium">
                Código: {qrCodeData.code}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const MetaCapiPanel = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pixelId, setPixelId] = useState(user?.meta_pixel_id || user?.meta_dataset_id || '')
  const [capiToken, setCapiToken] = useState(user?.meta_capi_token || '')
  const [businessId, setBusinessId] = useState(user?.meta_whatsapp_business_id || '')

  const [status, setStatus] = useState(user?.meta_capi_status || 'disconnected')
  const [errorMsg, setErrorMsg] = useState(user?.meta_capi_error || '')

  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setStatus(e.record.meta_capi_status || 'disconnected')
      setErrorMsg(e.record.meta_capi_error || '')
    }
  })

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_pixel_id: pixelId,
        meta_dataset_id: pixelId,
        meta_capi_token: capiToken,
        meta_whatsapp_business_id: businessId,
      })
      toast({
        title: 'Configurações salvas',
        description: 'As credenciais do Meta CAPI foram atualizadas.',
      })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!user) return
    if (!pixelId.trim() || !capiToken.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Dataset ID e Token de Acesso são obrigatórios para o teste.',
      })
      return
    }
    setIsTesting(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_pixel_id: pixelId,
        meta_dataset_id: pixelId,
        meta_capi_token: capiToken,
        meta_whatsapp_business_id: businessId,
      })
      const res = await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: JSON.stringify({
          pixel_id: pixelId,
          access_token: capiToken,
          business_id: businessId,
        }),
      })
      if (res.success) {
        toast({
          title: 'Conexão bem-sucedida',
          description: 'A comunicação com a Meta API está funcionando perfeitamente.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha na conexão',
          description: res.error?.message || 'Erro ao testar a conexão.',
        })
      }
    } catch (err: any) {
      const msg =
        err?.response?.error?.message ||
        err?.response?.message ||
        err?.message ||
        'Erro ao testar a conexão'
      toast({
        variant: 'destructive',
        title: 'Falha na conexão',
        description: msg,
      })
    } finally {
      setIsTesting(false)
    }
  }

  const isConnected = status.toLowerCase() === 'connected' || status.toLowerCase() === 'active'

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Meta Conversions API</CardTitle>
          </div>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={
              isConnected ? 'bg-green-500 hover:bg-green-600 text-sm py-1' : 'text-sm py-1'
            }
          >
            {isConnected ? 'Conectado' : status || 'Desconectado'}
          </Badge>
        </div>
        <CardDescription className="pt-2">
          Integre o Pixel e a API de Conversões para rastreamento de eventos offline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {isConnected && !errorMsg && (
          <div className="bg-green-50 text-green-700 p-4 rounded-md text-sm border border-green-100 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-1">Conectado:</span>
              <span className="opacity-90">
                A comunicação com a Meta API está funcionando perfeitamente.
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-100 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-1">Status de Erro:</span>
              <span className="opacity-90">{errorMsg}</span>
            </div>
          </div>
        )}

        {pixelId.replace(/\D/g, '').length >= 16 && (
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md text-sm border border-yellow-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-1">Aviso: Possível App ID</span>
              <span className="opacity-90">
                Este ID parece ser um App ID da Meta, não um Pixel/Dataset ID. App IDs geralmente
                têm 16 ou mais dígitos. Verifique se você está usando o ID correto do Pixel na seção
                de Gerenciador de Eventos do Facebook.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="meta_business_id">Business ID</Label>
            <Input
              id="meta_business_id"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="ID do Gerenciador de Negócios"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_pixel_id">ID do Pixel (Dataset ID)</Label>
            <Input
              id="meta_pixel_id"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="123456789012345"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="meta_capi_token">Token de Acesso (CAPI)</Label>
            <Input
              id="meta_capi_token"
              type="password"
              value={capiToken}
              onChange={(e) => setCapiToken(e.target.value)}
              placeholder="EAA..."
            />
          </div>
        </div>

        <div className="pt-6 border-t flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar Meta CAPI
          </Button>

          <Button
            onClick={handleTestConnection}
            disabled={isTesting}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsConnections() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Conexões</h2>
          <p className="text-muted-foreground mt-2">
            Monitore e configure integrações de API externas necessárias para o CRM.
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        <ConnectionErrorBoundary name="UAZAPI">
          <UazapiPanel />
        </ConnectionErrorBoundary>

        <ConnectionErrorBoundary name="Meta CAPI">
          <MetaCapiPanel />
        </ConnectionErrorBoundary>
      </div>
    </div>
  )
}
