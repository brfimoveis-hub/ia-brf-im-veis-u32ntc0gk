import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RefreshCw, Save, Loader2, Database, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function Remarketing() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)

  const [formData, setFormData] = useState({
    meta_pixel_id: '',
    meta_capi_token: '',
    meta_whatsapp_access_token: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        meta_pixel_id: user.meta_pixel_id || '',
        meta_capi_token: user.meta_capi_token || '',
        meta_whatsapp_access_token: user.meta_whatsapp_access_token || '',
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({
        title: 'Sucesso',
        description: 'Credenciais de Remarketing salvas com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao atualizar os tokens.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      await pb.send('/backend/v1/meta-capi/test-connection', { method: 'POST' }).catch(() => {
        // Fallback for custom hooks path mapping
        return pb.send('/backend/v1/meta/test-connection', { method: 'POST' })
      })
      toast({
        title: 'Teste Enviado',
        description: 'Solicitação de teste da API de Conversões (CAPI) executada.',
      })
      await pb.collection('users').authRefresh()
    } catch (error: any) {
      toast({
        title: 'Aviso',
        description:
          'Verifique se os dados estão corretos e salvos ou se o webhook de teste está disponível.',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'active' || s === 'connected' || s === 'valid') {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
        </Badge>
      )
    }
    if (s === 'error' || s === 'invalid' || s === 'disconnected') {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" /> Erro
        </Badge>
      )
    }
    return (
      <Badge
        variant="secondary"
        className="bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30"
      >
        Pendente
      </Badge>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RefreshCw className="h-8 w-8" />
          Remarketing & Meta CAPI
        </h1>
        <p className="text-muted-foreground">
          Gerencie os tokens e credenciais para sincronização de eventos com a Meta.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Credenciais Meta</CardTitle>
                <CardDescription>
                  Tokens de acesso para API de Conversões e WhatsApp.
                </CardDescription>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground mb-1">Status CAPI</span>
                  {getStatusBadge(user?.meta_capi_status)}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground mb-1">Status Token</span>
                  {getStatusBadge(user?.meta_token_status)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="meta_pixel_id">ID do Pixel da Meta</Label>
              <Input
                id="meta_pixel_id"
                value={formData.meta_pixel_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, meta_pixel_id: e.target.value }))
                }
                placeholder="Ex: 950541937872426"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_capi_token">Token da API de Conversões (CAPI)</Label>
              <Input
                id="meta_capi_token"
                type="password"
                value={formData.meta_capi_token}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, meta_capi_token: e.target.value }))
                }
                placeholder="EAAL..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_whatsapp_access_token">Token de Acesso do WhatsApp</Label>
              <Input
                id="meta_whatsapp_access_token"
                type="password"
                value={formData.meta_whatsapp_access_token}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, meta_whatsapp_access_token: e.target.value }))
                }
                placeholder="EAAL..."
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Testar Conexão
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Credenciais
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
