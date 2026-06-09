import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Loader2, RefreshCw, Save, Activity } from 'lucide-react'

export default function Remarketing() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    meta_pixel_id: '',
    meta_capi_token: '',
    meta_whatsapp_business_id: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        meta_pixel_id: user.meta_pixel_id || '',
        meta_capi_token: user.meta_capi_token || '',
        meta_whatsapp_business_id: user.meta_whatsapp_business_id || '',
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({ title: 'Sucesso', description: 'Configurações de Remarketing salvas.' })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl animate-fade-in-up">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <RefreshCw className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Remarketing & Meta CAPI</h1>
          <p className="text-slate-500">
            Integração com Facebook/Instagram para eventos de conversão e rastreamento.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Credenciais Meta</CardTitle>
            <CardDescription>
              Insira as chaves de acesso para ativar a API de Conversões.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm text-slate-500 mb-1">Status CAPI</p>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="font-medium">{user?.meta_capi_status || 'Não configurado'}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm text-slate-500 mb-1">Status do Token</p>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="font-medium">{user?.meta_token_status || 'Não validado'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_pixel_id">Pixel ID</Label>
              <Input
                id="meta_pixel_id"
                name="meta_pixel_id"
                placeholder="Ex: 123456789012345"
                value={formData.meta_pixel_id}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_capi_token">Conversion API Token</Label>
              <Input
                id="meta_capi_token"
                name="meta_capi_token"
                type="password"
                placeholder="EAA..."
                value={formData.meta_capi_token}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_whatsapp_business_id">WhatsApp Business Account ID</Label>
              <Input
                id="meta_whatsapp_business_id"
                name="meta_whatsapp_business_id"
                placeholder="ID da conta WABA..."
                value={formData.meta_whatsapp_business_id}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t flex justify-end p-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
