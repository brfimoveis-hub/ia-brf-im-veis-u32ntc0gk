import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  Activity,
} from 'lucide-react'

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full text-muted-foreground hover:bg-transparent"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )
}

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status)
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Não Configurado
      </Badge>
    )
  const s = status.toLowerCase()
  if (s === 'connected' || s === 'active' || s === 'success' || s === 'open' || s === 'qr_ready') {
    return (
      <Badge className="bg-green-500 hover:bg-green-600">
        <CheckCircle className="w-3 h-3 mr-1" /> {status.toUpperCase()}
      </Badge>
    )
  }
  if (s === 'error' || s === 'disconnected' || s === 'failed') {
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" /> {status.toUpperCase()}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="bg-yellow-500 text-white hover:bg-yellow-600">
      <AlertTriangle className="w-3 h-3 mr-1" /> {status.toUpperCase()}
    </Badge>
  )
}

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'

  const [currentUser, setCurrentUser] = useState<any>(null)

  const [metaCapi, setMetaCapi] = useState({ pixel_id: '', token: '' })
  const [metaWa, setMetaWa] = useState({
    business_id: '',
    phone_number_id: '',
    access_token: '',
    verify_token: '',
  })
  const [uazapi, setUazapi] = useState({
    domain: '',
    instance: '',
    token: '',
    admin_token: '',
  })

  const [saving, setSaving] = useState({ capi: false, wa: false, uazapi: false })
  const [testing, setTesting] = useState({ capi: false, wa: false, uazapi: false })

  useEffect(() => {
    if (user?.id) {
      pb.collection('users')
        .getOne(user.id)
        .then((record) => {
          setCurrentUser(record)
          setMetaCapi({ pixel_id: record.meta_pixel_id || '', token: record.meta_capi_token || '' })
          setMetaWa({
            business_id: record.meta_whatsapp_business_id || '',
            phone_number_id: record.meta_whatsapp_phone_number_id || '',
            access_token: record.meta_whatsapp_access_token || '',
            verify_token: record.meta_whatsapp_verify_token || '',
          })
          setUazapi({
            domain: record.uazapi_domain || '',
            instance: record.uazapi_instance_number || '',
            token: record.uazapi_token || '',
            admin_token: record.uazapi_admin_token || '',
          })
        })
        .catch(console.error)
    }
  }, [user?.id])

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      setCurrentUser(e.record)
    }
  })

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true })
  }

  const handleSaveCapi = async () => {
    if (!user) return
    try {
      setSaving((p) => ({ ...p, capi: true }))
      await pb.collection('users').update(user.id, {
        meta_pixel_id: metaCapi.pixel_id,
        meta_capi_token: metaCapi.token,
      })
      toast.success('Meta CAPI salvo com sucesso!')
    } catch (e: any) {
      toast.error('Erro ao salvar Meta CAPI', { description: e.message })
    } finally {
      setSaving((p) => ({ ...p, capi: false }))
    }
  }

  const handleTestCapi = async () => {
    try {
      setTesting((p) => ({ ...p, capi: true }))
      await pb.send('/backend/v1/meta-capi-test-connection', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      toast.success('Teste Meta CAPI enviado com sucesso!')
    } catch (e: any) {
      toast.error('Falha no teste Meta CAPI', {
        description: e.response?.message || e.message || 'Erro desconhecido',
      })
    } finally {
      setTesting((p) => ({ ...p, capi: false }))
    }
  }

  const handleSaveWa = async () => {
    if (!user) return
    try {
      setSaving((p) => ({ ...p, wa: true }))
      await pb.collection('users').update(user.id, {
        meta_whatsapp_business_id: metaWa.business_id,
        meta_whatsapp_phone_number_id: metaWa.phone_number_id,
        meta_whatsapp_access_token: metaWa.access_token,
        meta_whatsapp_verify_token: metaWa.verify_token,
      })
      toast.success('WhatsApp API salvo com sucesso!')
    } catch (e: any) {
      toast.error('Erro ao salvar WhatsApp API', { description: e.message })
    } finally {
      setSaving((p) => ({ ...p, wa: false }))
    }
  }

  const handleTestWa = async () => {
    try {
      setTesting((p) => ({ ...p, wa: true }))
      await pb.send('/backend/v1/meta-whatsapp-test', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      toast.success('Teste WhatsApp API enviado com sucesso!')
    } catch (e: any) {
      toast.error('Falha no teste WhatsApp API', {
        description: e.response?.message || e.message || 'Erro desconhecido',
      })
    } finally {
      setTesting((p) => ({ ...p, wa: false }))
    }
  }

  const handleSaveUazapi = async () => {
    if (!user) return
    try {
      setSaving((p) => ({ ...p, uazapi: true }))
      await pb.collection('users').update(user.id, {
        uazapi_domain: uazapi.domain,
        uazapi_instance_number: uazapi.instance,
        uazapi_token: uazapi.token,
        uazapi_admin_token: uazapi.admin_token,
      })
      toast.success('Credenciais Uazapi atualizadas com sucesso!')
    } catch (e: any) {
      toast.error('Erro ao salvar Uazapi', { description: e.message })
    } finally {
      setSaving((p) => ({ ...p, uazapi: false }))
    }
  }

  const handleTestUazapi = async () => {
    try {
      setTesting((p) => ({ ...p, uazapi: true }))
      await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({ instance: uazapi.instance }),
      })
      toast.success('Teste Uazapi enviado com sucesso!')
    } catch (e: any) {
      toast.error('Falha no teste Uazapi', {
        description: e.response?.message || e.message || 'Erro desconhecido',
      })
    } finally {
      setTesting((p) => ({ ...p, uazapi: false }))
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações e Integrações</h2>
        <p className="text-muted-foreground">
          Gerencie as conexões externas da plataforma e verifique seu status.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 md:gap-0 h-auto md:h-10 bg-muted/50 p-1 rounded-lg mb-4 md:mb-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="meta-capi">Meta CAPI</TabsTrigger>
          <TabsTrigger value="meta-whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="uazapi">Uazapi</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">UAZAPI</CardTitle>
                <CardDescription>Conexão com API do WhatsApp não-oficial</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBadge status={currentUser?.uazapi_status} />
                <p className="text-sm font-medium mt-4">Instância:</p>
                <p className="text-xs text-muted-foreground">
                  {currentUser?.uazapi_instance_number || 'Não configurada'}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleTabChange('uazapi')}
                >
                  Gerenciar UAZAPI
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Meta CAPI & Pixel</CardTitle>
                <CardDescription>Envio de eventos server-side</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBadge status={currentUser?.meta_capi_status} />
                <p className="text-sm font-medium mt-4">Pixel ID:</p>
                <p className="text-xs text-muted-foreground">
                  {currentUser?.meta_pixel_id || 'Não configurado'}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleTabChange('meta-capi')}
                >
                  Gerenciar Meta CAPI
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">WhatsApp API</CardTitle>
                <CardDescription>Conexão Oficial Meta</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBadge
                  status={currentUser?.meta_whatsapp_status || currentUser?.meta_token_status}
                />
                <p className="text-sm font-medium mt-4">Business ID:</p>
                <p className="text-xs text-muted-foreground">
                  {currentUser?.meta_whatsapp_business_id || 'Não configurado'}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleTabChange('meta-whatsapp')}
                >
                  Gerenciar WhatsApp
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meta-capi">
          <Card>
            <CardHeader>
              <CardTitle>Meta Conversions API (CAPI) & Pixel</CardTitle>
              <CardDescription>
                Configure o envio de eventos server-side para otimizar campanhas do Facebook e
                Instagram.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentUser?.meta_capi_error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro de Integração</AlertTitle>
                  <AlertDescription className="break-words">
                    {currentUser.meta_capi_error}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pixel ID</Label>
                  <Input
                    value={metaCapi.pixel_id}
                    onChange={(e) => setMetaCapi({ ...metaCapi, pixel_id: e.target.value })}
                    placeholder="Ex: 61569504383085"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Conversions API Access Token (CAPI Token)</Label>
                  <PasswordInput
                    value={metaCapi.token}
                    onChange={(e: any) => setMetaCapi({ ...metaCapi, token: e.target.value })}
                    placeholder="EAAI..."
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 border-t pt-6">
              <Button
                variant="outline"
                onClick={handleTestCapi}
                disabled={testing.capi}
                className="w-full sm:w-auto"
              >
                {testing.capi ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="mr-2 h-4 w-4" />
                )}
                Testar Conexão
              </Button>
              <Button onClick={handleSaveCapi} disabled={saving.capi} className="w-full sm:w-auto">
                {saving.capi ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="meta-whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>Meta WhatsApp Business API</CardTitle>
              <CardDescription>
                Credenciais oficiais da API do WhatsApp Cloud para automações de mensageria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentUser?.meta_token_status === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Token Inválido ou Expirado</AlertTitle>
                  <AlertDescription>
                    Verifique se o token de acesso possui as permissões necessárias e ainda é válido
                    na Meta.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>WhatsApp Business ID</Label>
                  <Input
                    value={metaWa.business_id}
                    onChange={(e) => setMetaWa({ ...metaWa, business_id: e.target.value })}
                    placeholder="Ex: 10234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    value={metaWa.phone_number_id}
                    onChange={(e) => setMetaWa({ ...metaWa, phone_number_id: e.target.value })}
                    placeholder="Ex: 10987654321"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Access Token (Permanente)</Label>
                  <PasswordInput
                    value={metaWa.access_token}
                    onChange={(e: any) => setMetaWa({ ...metaWa, access_token: e.target.value })}
                    placeholder="EAAI..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Verify Token (Webhook)</Label>
                  <PasswordInput
                    value={metaWa.verify_token}
                    onChange={(e: any) => setMetaWa({ ...metaWa, verify_token: e.target.value })}
                    placeholder="Sua chave secreta para webhooks..."
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 border-t pt-6">
              <Button
                variant="outline"
                onClick={handleTestWa}
                disabled={testing.wa}
                className="w-full sm:w-auto"
              >
                {testing.wa ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="mr-2 h-4 w-4" />
                )}
                Testar Conexão
              </Button>
              <Button onClick={handleSaveWa} disabled={saving.wa} className="w-full sm:w-auto">
                {saving.wa ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="uazapi">
          <Card>
            <CardHeader>
              <CardTitle>Configuração UAZAPI</CardTitle>
              <CardDescription>
                Gerencie sua instância Uazapi (provedor não-oficial de WhatsApp) e chaves de acesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentUser?.uazapi_error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro de Conexão (Uazapi)</AlertTitle>
                  <AlertDescription className="break-words">
                    {currentUser.uazapi_error}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Domínio Uazapi (URL)</Label>
                  <Input
                    value={uazapi.domain}
                    onChange={(e) => setUazapi({ ...uazapi, domain: e.target.value })}
                    placeholder="https://api.uazapi.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número da Instância</Label>
                  <Input
                    value={uazapi.instance}
                    onChange={(e) => setUazapi({ ...uazapi, instance: e.target.value })}
                    placeholder="Ex: 554899999999"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Token (Globalapikey)</Label>
                  <PasswordInput
                    value={uazapi.token}
                    onChange={(e: any) => setUazapi({ ...uazapi, token: e.target.value })}
                    placeholder="Token da API"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Admin Token</Label>
                  <PasswordInput
                    value={uazapi.admin_token}
                    onChange={(e: any) => setUazapi({ ...uazapi, admin_token: e.target.value })}
                    placeholder="Token Admin"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 border-t pt-6">
              <Button
                variant="outline"
                onClick={handleTestUazapi}
                disabled={testing.uazapi}
                className="w-full sm:w-auto"
              >
                {testing.uazapi ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="mr-2 h-4 w-4" />
                )}
                Testar Conexão
              </Button>
              <Button
                onClick={handleSaveUazapi}
                disabled={saving.uazapi}
                className="w-full sm:w-auto"
              >
                {saving.uazapi ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
