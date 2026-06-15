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
import { Loader2, Target } from 'lucide-react'

export default function SettingsRemarketing() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    meta_pixel_id: '',
    google_ads_webhook_key: '',
  })

  useEffect(() => {
    if (user?.id) {
      pb.collection('users')
        .getOne(user.id)
        .then((res) => {
          setFormData({
            meta_pixel_id: res.meta_pixel_id || '',
            google_ads_webhook_key: res.google_ads_webhook_key || '',
          })
          setLoading(false)
        })
    }
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      // Data persistence rule: update only remarketing fields
      await pb.collection('users').update(user.id, {
        meta_pixel_id: formData.meta_pixel_id,
        google_ads_webhook_key: formData.google_ads_webhook_key,
      })
      toast({ title: 'Configurações de remarketing salvas' })
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
        <h1 className="text-3xl font-bold tracking-tight">Remarketing</h1>
        <p className="text-muted-foreground mt-1">
          Configure rastreamento avançado para campanhas publicitárias.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Pixels e Webhooks
          </CardTitle>
          <CardDescription>
            Essenciais para retroalimentar as plataformas de anúncios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pixel">Meta Pixel ID</Label>
            <Input
              id="pixel"
              value={formData.meta_pixel_id}
              onChange={(e) => setFormData({ ...formData, meta_pixel_id: e.target.value })}
              placeholder="Ex: 123456789012345"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="google">Google Ads Webhook Key</Label>
            <Input
              id="google"
              value={formData.google_ads_webhook_key}
              onChange={(e) => setFormData({ ...formData, google_ads_webhook_key: e.target.value })}
              placeholder="Ex: A1b2C3d4E5f6G7h8"
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
