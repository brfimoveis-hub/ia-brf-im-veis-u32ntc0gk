import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { MetaWhatsAppPanel } from './SettingsConnections/MetaWhatsAppPanel'
import ChavesNaMao from './SettingsConnections/ChavesNaMao'
import pb from '@/lib/pocketbase/client'
import { Loader2, Save, TrendingUp, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SettingsConnections() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    meta_pixel_id: '',
    meta_capi_token: '',
    meta_app_id: '',
    meta_app_secret: '',
    meta_dataset_id: '',
    meta_offline_event_set_id: '',
  })

  useEffect(() => {
    if (user) {
      setForm({
        meta_pixel_id: user.meta_pixel_id || '',
        meta_capi_token: user.meta_capi_token || '',
        meta_app_id: user.meta_app_id || '',
        meta_app_secret: user.meta_app_secret || '',
        meta_dataset_id: user.meta_dataset_id || '',
        meta_offline_event_set_id: user.meta_offline_event_set_id || '',
      })
      setLoading(false)
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await pb.collection('users').update(user.id, form)
      await pb.collection('users').authRefresh()
      toast({ title: 'Configuracoes salvas com sucesso' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    const s = (status || '').toLowerCase()
    const isActive = s === 'active' || s === 'connected'
    const isError = s === 'error'
    return (
      <Badge
        variant={isError ? 'destructive' : isActive ? 'default' : 'secondary'}
        className={isActive ? 'bg-green-500 hover:bg-green-600' : ''}
      >
        {status || 'Não configurado'}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integracoes</h1>
        <p className="text-muted-foreground">
          Meta WhatsApp Business API, Conversions API e ChavesNaMao.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Meta WhatsApp Token</span>
            </div>
            {getStatusBadge(user?.meta_token_status)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Meta CAPI</span>
            </div>
            {getStatusBadge(user?.meta_capi_status)}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList>
          <TabsTrigger value="whatsapp">Meta WhatsApp</TabsTrigger>
          <TabsTrigger value="capi">Meta CAPI / Pixel</TabsTrigger>
          <TabsTrigger value="chaves">ChavesNaMao</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-4">
          <MetaWhatsAppPanel />
        </TabsContent>

        <TabsContent value="capi" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Meta Conversions API (CAPI)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pixel ID</Label>
                <Input
                  value={form.meta_pixel_id}
                  onChange={(e) => setForm({ ...form, meta_pixel_id: e.target.value })}
                  placeholder="123456789012345"
                />
              </div>
              <div className="space-y-2">
                <Label>CAPI Token</Label>
                <Input
                  type="password"
                  value={form.meta_capi_token}
                  onChange={(e) => setForm({ ...form, meta_capi_token: e.target.value })}
                  placeholder="EAAG..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>App ID</Label>
                  <Input
                    value={form.meta_app_id}
                    onChange={(e) => setForm({ ...form, meta_app_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>App Secret</Label>
                  <Input
                    type="password"
                    value={form.meta_app_secret}
                    onChange={(e) => setForm({ ...form, meta_app_secret: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dataset ID</Label>
                  <Input
                    value={form.meta_dataset_id}
                    onChange={(e) => setForm({ ...form, meta_dataset_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Offline Event Set ID</Label>
                  <Input
                    value={form.meta_offline_event_set_id}
                    onChange={(e) =>
                      setForm({ ...form, meta_offline_event_set_id: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chaves" className="mt-4">
          <ChavesNaMao />
        </TabsContent>
      </Tabs>
    </div>
  )
}
