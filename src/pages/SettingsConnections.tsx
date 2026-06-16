import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function SettingsConnections() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    meta_whatsapp_access_token: '',
    meta_pixel_id: '',
    meta_capi_token: '',
    meta_app_id: '',
    meta_app_secret: '',
    meta_dataset_id: '',
    meta_offline_event_set_id: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        meta_whatsapp_access_token: user.meta_whatsapp_access_token || '',
        meta_pixel_id: user.meta_pixel_id || '',
        meta_capi_token: user.meta_capi_token || '',
        meta_app_id: user.meta_app_id || '',
        meta_app_secret: user.meta_app_secret || '',
        meta_dataset_id: user.meta_dataset_id || '',
        meta_offline_event_set_id: user.meta_offline_event_set_id || '',
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({ title: 'Credenciais atualizadas com sucesso!' })
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conexões</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas integrações e credenciais de API.
        </p>
      </div>

      <Tabs defaultValue="meta" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="meta">Meta & CAPI</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp API Oficial</TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Meta Pixel e Conversions API</CardTitle>
                  <CardDescription>
                    Configurações fixas para o rastreamento de eventos no Meta.
                  </CardDescription>
                </div>
                {user?.meta_capi_status === 'active' ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-4 h-4 mr-1" />
                    Desconectado
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_pixel_id">Pixel ID</Label>
                <Input
                  id="meta_pixel_id"
                  name="meta_pixel_id"
                  value={formData.meta_pixel_id}
                  onChange={handleChange}
                  placeholder="Ex: 1093869151209421"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_capi_token">Access Token (CAPI)</Label>
                <Input
                  id="meta_capi_token"
                  name="meta_capi_token"
                  type="password"
                  value={formData.meta_capi_token}
                  onChange={handleChange}
                  placeholder="EAANCebjvTQ..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_dataset_id">Dataset ID</Label>
                  <Input
                    id="meta_dataset_id"
                    name="meta_dataset_id"
                    value={formData.meta_dataset_id}
                    onChange={handleChange}
                    placeholder="Ex: 1318084933157075"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_offline_event_set_id">Offline Event Set ID</Label>
                  <Input
                    id="meta_offline_event_set_id"
                    name="meta_offline_event_set_id"
                    value={formData.meta_offline_event_set_id}
                    onChange={handleChange}
                    placeholder="Ex: 1015065407564785"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>WhatsApp Business API Oficial</CardTitle>
                  <CardDescription>
                    Credenciais da API Oficial do Meta para WhatsApp.
                  </CardDescription>
                </div>
                {user?.meta_whatsapp_status === 'active' ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-4 h-4 mr-1" />
                    Desconectado
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_whatsapp_access_token">WhatsApp Access Token</Label>
                <Input
                  id="meta_whatsapp_access_token"
                  name="meta_whatsapp_access_token"
                  type="password"
                  value={formData.meta_whatsapp_access_token}
                  onChange={handleChange}
                  placeholder="EAATKh9qcDhY..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_app_id">App ID</Label>
                  <Input
                    id="meta_app_id"
                    name="meta_app_id"
                    value={formData.meta_app_id}
                    onChange={handleChange}
                    placeholder="Ex: 1348584743898646"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_app_secret">App Secret</Label>
                  <Input
                    id="meta_app_secret"
                    name="meta_app_secret"
                    type="password"
                    value={formData.meta_app_secret}
                    onChange={handleChange}
                    placeholder="25c9f2269da7b0a0..."
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
