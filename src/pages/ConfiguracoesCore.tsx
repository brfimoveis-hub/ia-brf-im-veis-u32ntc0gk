import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [testingUazapi, setTestingUazapi] = useState(false)
  const [testingMeta, setTestingMeta] = useState(false)

  // Uazapi Form State
  const [uazapiDomain, setUazapiDomain] = useState('')
  const [uazapiInstance, setUazapiInstance] = useState('')
  const [uazapiToken, setUazapiToken] = useState('')

  // Meta Form State
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [metaBusinessId, setMetaBusinessId] = useState('')

  // Status State
  const [uazapiStatus, setUazapiStatus] = useState('offline')
  const [uazapiError, setUazapiError] = useState('')
  const [metaStatus, setMetaStatus] = useState('offline')
  const [metaError, setMetaError] = useState('')

  // Dialog open state
  const [uazapiDialogOpen, setUazapiDialogOpen] = useState(false)
  const [metaDialogOpen, setMetaDialogOpen] = useState(false)

  useEffect(() => {
    if (user) {
      setUazapiDomain(user.uazapi_domain || '')
      setUazapiInstance(user.uazapi_instance_number || '')
      setUazapiToken(user.uazapi_token || '')
      setMetaPixelId(user.meta_pixel_id || '')
      setMetaCapiToken(user.meta_capi_token || '')
      setMetaBusinessId(user.meta_whatsapp_business_id || '')
      setUazapiStatus(user.uazapi_status || 'offline')
      setUazapiError(user.uazapi_error || '')
      setMetaStatus(user.meta_capi_status || 'offline')
      setMetaError(user.meta_capi_error || '')
    }
  }, [user])

  const handleSaveUazapi = async () => {
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, {
        uazapi_domain: uazapiDomain,
        uazapi_instance_number: uazapiInstance,
        uazapi_token: uazapiToken,
      })
      toast({ title: 'Configurações do Uazapi salvas com sucesso!' })
      setUazapiDialogOpen(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar Uazapi', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleTestUazapi = async () => {
    setTestingUazapi(true)
    try {
      await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: uazapiDomain,
          instance: uazapiInstance,
          token: uazapiToken,
        }),
      })

      setUazapiStatus('Saudável')
      setUazapiError('')
      toast({ title: 'Conexão com Uazapi Saudável!' })

      if (user) {
        await pb.collection('users').update(user.id, {
          uazapi_status: 'Saudável',
          uazapi_error: '',
        })
      }
    } catch (err: any) {
      const errMsg = err?.response?.error || err.message || 'Erro desconhecido'
      setUazapiStatus('Falha')
      setUazapiError(errMsg)
      toast({
        title: 'Falha na conexão com Uazapi',
        description: errMsg,
        variant: 'destructive',
      })

      if (user) {
        await pb.collection('users').update(user.id, {
          uazapi_status: 'error',
          uazapi_error: errMsg,
        })
      }
    } finally {
      setTestingUazapi(false)
    }
  }

  const handleSaveMeta = async () => {
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_pixel_id: metaPixelId,
        meta_capi_token: metaCapiToken,
        meta_whatsapp_business_id: metaBusinessId,
      })
      toast({ title: 'Configurações da Meta salvas com sucesso!' })
      setMetaDialogOpen(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar Meta', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleTestMeta = async () => {
    setTestingMeta(true)
    try {
      await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: JSON.stringify({
          pixel_id: metaPixelId,
          access_token: metaCapiToken,
          business_id: metaBusinessId,
        }),
      })

      setMetaStatus('Saudável')
      setMetaError('')
      toast({ title: 'Conexão Meta CAPI Saudável!' })

      if (user) {
        await pb.collection('users').update(user.id, {
          meta_capi_status: 'connected',
          meta_capi_error: '',
        })
      }
    } catch (err: any) {
      const errMsg = err?.response?.error?.message || err.message || 'Erro desconhecido'
      setMetaStatus('Falha')
      setMetaError(errMsg)
      toast({
        title: 'Falha na conexão com Meta',
        description: errMsg,
        variant: 'destructive',
      })

      if (user) {
        await pb.collection('users').update(user.id, {
          meta_capi_status: 'error',
          meta_capi_error: errMsg,
        })
      }
    } finally {
      setTestingMeta(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8 animate-in fade-in-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas integrações e tokens de API com feedback em tempo real.
        </p>
      </div>

      <Tabs defaultValue="uazapi" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="uazapi">Uazapi (WhatsApp)</TabsTrigger>
          <TabsTrigger value="meta">Meta (Pixel & CAPI)</TabsTrigger>
        </TabsList>

        <TabsContent value="uazapi">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Integração Uazapi</CardTitle>
                  <CardDescription>
                    Configure os dados da instância para disparo e recebimento de mensagens.
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    uazapiStatus === 'Saudável'
                      ? 'default'
                      : uazapiStatus === 'Falha' || uazapiStatus === 'error'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {uazapiStatus === 'Saudável' ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Saudável
                    </span>
                  ) : uazapiStatus === 'Falha' || uazapiStatus === 'error' ? (
                    <span className="flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Falha
                    </span>
                  ) : (
                    <span>{uazapiStatus || 'Desconhecido'}</span>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(uazapiStatus === 'Falha' || uazapiStatus === 'error') && uazapiError && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">
                  <strong>Erro de Conexão:</strong> {uazapiError}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="uazapi-domain">Base URL (Domain)</Label>
                <Input
                  id="uazapi-domain"
                  value={uazapiDomain}
                  onChange={(e) => setUazapiDomain(e.target.value)}
                  placeholder="https://iabrfimveis.uazapi.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uazapi-instance">Instance ID (Number)</Label>
                <Input
                  id="uazapi-instance"
                  value={uazapiInstance}
                  onChange={(e) => setUazapiInstance(e.target.value)}
                  placeholder="554892098050"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uazapi-token">Bearer Token (API Key)</Label>
                <Input
                  id="uazapi-token"
                  type="password"
                  value={uazapiToken}
                  onChange={(e) => setUazapiToken(e.target.value)}
                  placeholder="SuAwfdyh..."
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" onClick={handleTestUazapi} disabled={testingUazapi}>
                {testingUazapi && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
              </Button>
              <Dialog open={uazapiDialogOpen} onOpenChange={setUazapiDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={loading}>Salvar Alterações</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Atualização</DialogTitle>
                    <DialogDescription>
                      Deseja salvar as configurações do Uazapi? A instabilidade do token pode afetar
                      envios em andamento.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSaveUazapi} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="meta">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Integração Meta CAPI</CardTitle>
                  <CardDescription>
                    Configure as credenciais para o Conversion API da Meta.
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    metaStatus === 'Saudável' || metaStatus === 'connected'
                      ? 'default'
                      : metaStatus === 'Falha' || metaStatus === 'error'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {metaStatus === 'Saudável' || metaStatus === 'connected' ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Saudável
                    </span>
                  ) : metaStatus === 'Falha' || metaStatus === 'error' ? (
                    <span className="flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Falha
                    </span>
                  ) : (
                    <span>{metaStatus || 'Desconhecido'}</span>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(metaStatus === 'Falha' || metaStatus === 'error') && metaError && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">
                  <strong>Erro de Conexão:</strong> {metaError}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="meta-pixel">Pixel ID</Label>
                <Input
                  id="meta-pixel"
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value)}
                  placeholder="1234567890"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meta-business">Business ID</Label>
                <Input
                  id="meta-business"
                  value={metaBusinessId}
                  onChange={(e) => setMetaBusinessId(e.target.value)}
                  placeholder="0987654321"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meta-token">Meta CAPI Token</Label>
                <Input
                  id="meta-token"
                  type="password"
                  value={metaCapiToken}
                  onChange={(e) => setMetaCapiToken(e.target.value)}
                  placeholder="EAAG..."
                />
                <p className="text-[0.8rem] text-muted-foreground mt-1">
                  Atualize o token CAPI se as sessões do Meta forem invalidadas.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" onClick={handleTestMeta} disabled={testingMeta}>
                {testingMeta && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
              </Button>
              <Dialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={loading}>Salvar Alterações</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Atualização</DialogTitle>
                    <DialogDescription>
                      Deseja salvar as configurações da Meta? Certifique-se de testar a conexão
                      antes de prosseguir.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSaveMeta} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
