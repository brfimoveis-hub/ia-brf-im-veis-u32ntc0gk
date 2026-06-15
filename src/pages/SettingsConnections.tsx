import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Smartphone } from 'lucide-react'

export default function SettingsConnections() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    uazapi_domain: '',
    uazapi_token: '',
    uazapi_instance_number: '',
  })

  useEffect(() => {
    if (user?.id) {
      pb.collection('users')
        .getOne(user.id)
        .then((res) => {
          setFormData({
            uazapi_domain: res.uazapi_domain || '',
            uazapi_token: res.uazapi_token || '',
            uazapi_instance_number: res.uazapi_instance_number || '',
          })
          setLoading(false)
        })
    }
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      // Data persistence rule: update only specific fields
      await pb.collection('users').update(user.id, {
        uazapi_domain: formData.uazapi_domain,
        uazapi_token: formData.uazapi_token,
        uazapi_instance_number: formData.uazapi_instance_number,
      })
      toast({ title: 'Configurações de conexão salvas' })
    } catch (err) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conexões</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as integrações do sistema com plataformas externas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Uazapi (WhatsApp)
          </CardTitle>
          <CardDescription>
            Configure as credenciais para envio e recebimento via WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="domain">Domínio da API</Label>
            <Input
              id="domain"
              value={formData.uazapi_domain}
              onChange={(e) => setFormData({ ...formData, uazapi_domain: e.target.value })}
              placeholder="https://api.uazapi.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">Global Token (API Key)</Label>
            <Input
              id="token"
              type="password"
              value={formData.uazapi_token}
              onChange={(e) => setFormData({ ...formData, uazapi_token: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instance">Número da Instância</Label>
            <Input
              id="instance"
              value={formData.uazapi_instance_number}
              onChange={(e) => setFormData({ ...formData, uazapi_instance_number: e.target.value })}
              placeholder="Ex: 5548999999999"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
