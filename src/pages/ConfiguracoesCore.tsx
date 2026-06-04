import { useState, useEffect } from 'react'
import { Link, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Facebook } from 'lucide-react'

export default function ConfiguracoesCore() {
  const location = useLocation()
  const currentTab = location.pathname.includes('meta-capi') ? 'meta-capi' : 'uazapi'

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações de Integração</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as conexões com WhatsApp (Uazapi) e Meta Conversions API.
          </p>
        </div>

        <Tabs value={currentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="uazapi" asChild>
              <Link to="/configuracoes/uazapi">WhatsApp Uazapi</Link>
            </TabsTrigger>
            <TabsTrigger value="meta-capi" asChild>
              <Link to="/configuracoes/meta-capi">Meta CAPI</Link>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <Routes>
              <Route path="/" element={<Navigate to="uazapi" replace />} />
              <Route path="uazapi" element={<UazapiSettings />} />
              <Route path="meta-capi" element={<MetaCapiSettings />} />
            </Routes>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

function UazapiSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [instanceData, setInstanceData] = useState<any>(null)

  const [domain, setDomain] = useState(user?.uazapi_domain || 'https://iabrfimveis.uazapi.com')
  const [instanceNumber, setInstanceNumber] = useState(
    user?.uazapi_instance_number || '554892098050',
  )
  const [token, setToken] = useState(user?.uazapi_token || '6df3aaaa-9198-40aa-9d0c-da3abd9c1934')

  const [status, setStatus] = useState(user?.uazapi_status || 'disconnected')
  const [errorMsg, setErrorMsg] = useState(user?.uazapi_error || '')

  if (!user) return null

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setStatus(e.record.uazapi_status)
      setErrorMsg(e.record.uazapi_error)
    }
  })

  const saveSettings = async () => {
    try {
      setLoading(true)
      await pb.collection('users').update(user.id, {
        uazapi_domain: domain,
        uazapi_instance_number: instanceNumber,
        uazapi_token: token,
      })
      toast({ title: 'Configurações salvas' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await pb.send('/backend/v1/uazapi/status', { method: 'GET' })
      setInstanceData(res.data)
      if (!silent) toast({ title: 'Status atualizado com sucesso!' })
    } catch (err: any) {
      if (!silent)
        toast({ title: 'Erro de Status', description: err.message, variant: 'destructive' })
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    // Check status on mount
    checkStatus(true)
  }, [])

  const connectInstance = async () => {
    try {
      setLoading(true)
      const res = await pb.send('/backend/v1/uazapi/connect', { method: 'POST' })
      setInstanceData(res.data)
      toast({ title: 'Comando de conexão enviado' })
    } catch (err: any) {
      toast({ title: 'Erro de Conexão', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const qrCodeData =
    typeof instanceData?.qrcode === 'string'
      ? instanceData.qrcode
      : typeof instanceData?.instance?.qrcode === 'string'
        ? instanceData.instance.qrcode
        : typeof instanceData?.base64 === 'string'
          ? instanceData.base64
          : ''

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Credenciais Uazapi</CardTitle>
          <CardDescription>Configure sua API de WhatsApp via Uazapi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Domínio / URL da API</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="https://api.uazapi.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Nome da Instância</Label>
            <Input
              value={instanceNumber}
              onChange={(e) => setInstanceNumber(e.target.value)}
              placeholder="minha_instancia"
            />
          </div>
          <div className="space-y-2">
            <Label>Token (apikey)</Label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Seu token de acesso"
            />
          </div>
          <Button onClick={saveSettings} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status da Instância</CardTitle>
          <CardDescription>Acompanhe a saúde da sua conexão Uazapi em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
            <div className="flex items-center gap-4">
              <Smartphone className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Status de Conexão</p>
                <div className="flex items-center gap-2 mt-1">
                  {status === 'connected' ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">Conectado</Badge>
                  ) : status === 'qr_ready' ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      Aguardando QR Code
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Desconectado</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-3 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          {qrCodeData && status === 'qr_ready' && (
            <div className="flex flex-col items-center justify-center space-y-4 p-4 border rounded-lg bg-slate-50/50">
              <p className="text-sm text-center font-medium text-amber-700">
                Aguardando Pareamento: Escaneie o QR Code com seu WhatsApp
              </p>
              <div className="bg-white p-2 rounded-lg border shadow-sm">
                <img
                  src={
                    qrCodeData.startsWith('data:image')
                      ? qrCodeData
                      : `data:image/png;base64,${qrCodeData}`
                  }
                  alt="QR Code"
                  className="w-48 h-48 rounded"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => checkStatus()}
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button onClick={connectInstance} disabled={loading} className="flex-1">
              Conectar / Gerar QR
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetaCapiSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [pixelId, setPixelId] = useState(user?.meta_pixel_id || '')
  const [capiToken, setCapiToken] = useState(user?.meta_capi_token || '')

  const [status, setStatus] = useState(user?.meta_capi_status || 'disconnected')
  const [errorMsg, setErrorMsg] = useState(user?.meta_capi_error || '')

  if (!user) return null

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setStatus(e.record.meta_capi_status)
      setErrorMsg(e.record.meta_capi_error)
    }
  })

  const saveAndTest = async () => {
    try {
      setLoading(true)
      await pb.collection('users').update(user.id, {
        meta_pixel_id: pixelId,
        meta_capi_token: capiToken,
      })

      await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: JSON.stringify({ pixel_id: pixelId, access_token: capiToken }),
      })
      toast({ title: 'Conexão validada com sucesso!' })
    } catch (err: any) {
      toast({ title: 'Erro de Validação', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Credenciais Meta CAPI</CardTitle>
          <CardDescription>Insira seu ID de Pixel e Token de Acesso (CAPI).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pixel / Dataset ID</Label>
            <Input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label>Token de Acesso</Label>
            <Input
              type="password"
              value={capiToken}
              onChange={(e) => setCapiToken(e.target.value)}
              placeholder="EAAB..."
            />
          </div>
          <Button onClick={saveAndTest} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Salvar e Testar Conexão'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status da Integração Meta</CardTitle>
          <CardDescription>Monitoramento em tempo real dos disparos de eventos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
            <div className="flex items-center gap-4">
              <Facebook className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium">Status do Envio de Eventos</p>
                <div className="flex items-center gap-2 mt-1">
                  {status === 'connected' ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">Online e Validado</Badge>
                  ) : status === 'error' ? (
                    <Badge variant="destructive">Falha / Erro</Badge>
                  ) : (
                    <Badge variant="outline">Desconectado</Badge>
                  )}
                </div>
              </div>
            </div>
            {status === 'connected' && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-3 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Erro detectado pelo Meta:</p>
                <p>{errorMsg}</p>
                {errorMsg.toLowerCase().includes('insufficient') && (
                  <p className="mt-2 text-xs opacity-90">
                    *Dica: Verifique se seus Leads/Clientes possuem E-mail ou Telefone válidos
                    preenchidos no CRM para melhorar a qualidade da correspondência.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
            <p className="font-medium mb-1">Como funciona a integração?</p>
            <p>
              Os eventos são disparados automaticamente sempre que o status de um cliente ou lead é
              atualizado no CRM, enriquecidos com e-mail, telefone e IP do usuário para contornar o
              alerta de Parâmetros Insuficientes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
