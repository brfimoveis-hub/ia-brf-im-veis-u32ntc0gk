import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isTestingUazapi, setIsTestingUazapi] = useState(false)

  const [formData, setFormData] = useState({
    uazapi_domain: '',
    uazapi_token: '',
    uazapi_instance_number: '',
    meta_whatsapp_access_token: '',
    meta_whatsapp_phone_number_id: '',
    meta_whatsapp_business_id: '',
    meta_capi_token: '',
    meta_pixel_id: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        uazapi_domain: user.uazapi_domain || '',
        uazapi_token: user.uazapi_token || '',
        uazapi_instance_number: user.uazapi_instance_number || '',
        meta_whatsapp_access_token: user.meta_whatsapp_access_token || '',
        meta_whatsapp_phone_number_id: user.meta_whatsapp_phone_number_id || '',
        meta_whatsapp_business_id: user.meta_whatsapp_business_id || '',
        meta_capi_token: user.meta_capi_token || '',
        meta_pixel_id: user.meta_pixel_id || '',
      })
    }
  }, [user])

  const handleSave = async () => {
    setLoading(true)
    try {
      if (user?.id) {
        await pb.collection('users').update(user.id, formData)
        toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso!' })
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleTestUazapi = async () => {
    setIsTestingUazapi(true)
    try {
      await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: formData.uazapi_domain,
          instance: formData.uazapi_instance_number,
          token: formData.uazapi_token,
        }),
      })
      toast({
        title: 'Conexão bem-sucedida',
        description: 'A instância Uazapi está online e respondendo.',
      })
    } catch (err: any) {
      toast({
        title: 'Falha na Conexão',
        description: err.message || 'Erro ao conectar com Uazapi.',
        variant: 'destructive',
      })
    } finally {
      setIsTestingUazapi(false)
    }
  }

  const renderStatus = (status: string | undefined) => {
    if (status === 'online' || status === 'connected' || status === 'Saudável') {
      return (
        <Badge className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Saudável
        </Badge>
      )
    }
    if (status === 'offline' || status === 'disconnected') {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" /> Desconectado
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" /> {status || 'Pendente'}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas integrações de CRM, instâncias do Uazapi e Meta CAPI.
        </p>
      </div>

      <Tabs defaultValue="uazapi" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="uazapi">Uazapi (WhatsApp)</TabsTrigger>
          <TabsTrigger value="meta">Meta WhatsApp API</TabsTrigger>
          <TabsTrigger value="capi">Meta CAPI</TabsTrigger>
        </TabsList>

        <TabsContent value="uazapi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Integração Uazapi
                {renderStatus(user?.uazapi_status)}
              </CardTitle>
              <CardDescription>
                Configure sua instância do Uazapi para envio e recebimento de mensagens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Domínio Base</Label>
                <Input
                  value={formData.uazapi_domain}
                  onChange={(e) => setFormData({ ...formData, uazapi_domain: e.target.value })}
                  placeholder="https://iabrfimveis.uazapi.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Número da Instância</Label>
                <Input
                  value={formData.uazapi_instance_number}
                  onChange={(e) =>
                    setFormData({ ...formData, uazapi_instance_number: e.target.value })
                  }
                  placeholder="554892098050"
                />
              </div>
              <div className="space-y-2">
                <Label>Token de Autenticação (Bearer)</Label>
                <Input
                  type="password"
                  value={formData.uazapi_token}
                  onChange={(e) => setFormData({ ...formData, uazapi_token: e.target.value })}
                  placeholder="Token"
                />
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-2">
                    Testar Conexão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Testar Instância Uazapi</DialogTitle>
                    <DialogDescription>
                      Deseja verificar o status atual da instância{' '}
                      <strong>{formData.uazapi_instance_number || 'não definida'}</strong>?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogTrigger asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogTrigger>
                    <Button
                      onClick={handleTestUazapi}
                      disabled={isTestingUazapi || !formData.uazapi_instance_number}
                    >
                      {isTestingUazapi && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Testar Agora
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
            <CardFooter className="bg-muted/50 flex justify-end p-4 rounded-b-lg border-t">
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="meta" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Meta WhatsApp Cloud API
                {renderStatus(user?.meta_whatsapp_status)}
              </CardTitle>
              <CardDescription>
                Configure os tokens de acesso para a API Oficial do WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Access Token</Label>
                <Input
                  type="password"
                  value={formData.meta_whatsapp_access_token}
                  onChange={(e) =>
                    setFormData({ ...formData, meta_whatsapp_access_token: e.target.value })
                  }
                  placeholder="EAAL..."
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input
                  value={formData.meta_whatsapp_phone_number_id}
                  onChange={(e) =>
                    setFormData({ ...formData, meta_whatsapp_phone_number_id: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Business Account ID</Label>
                <Input
                  value={formData.meta_whatsapp_business_id}
                  onChange={(e) =>
                    setFormData({ ...formData, meta_whatsapp_business_id: e.target.value })
                  }
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 flex justify-end p-4 rounded-b-lg border-t">
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="capi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Meta Conversions API (CAPI)
                {renderStatus(user?.meta_capi_status)}
              </CardTitle>
              <CardDescription>
                Sincronize os eventos de CRM com o Pixel do Facebook.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pixel ID</Label>
                <Input
                  value={formData.meta_pixel_id}
                  onChange={(e) => setFormData({ ...formData, meta_pixel_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CAPI Token</Label>
                <Input
                  type="password"
                  value={formData.meta_capi_token}
                  onChange={(e) => setFormData({ ...formData, meta_capi_token: e.target.value })}
                  placeholder="EAAL..."
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 flex justify-end p-4 rounded-b-lg border-t">
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
