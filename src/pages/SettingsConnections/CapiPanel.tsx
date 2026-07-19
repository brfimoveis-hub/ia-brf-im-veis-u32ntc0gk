import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusTrafficLight } from './StatusTrafficLight'
import { MaskedInput } from './MaskedInput'
import { Loader2, TrendingUp, CheckCircle2 } from 'lucide-react'

export function CapiPanel() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState({
    meta_pixel_id: user?.meta_pixel_id || '',
    meta_capi_token: user?.meta_capi_token || '',
    meta_app_id: user?.meta_app_id || '',
    meta_app_secret: user?.meta_app_secret || '',
    meta_dataset_id: user?.meta_dataset_id || '',
    meta_offline_event_set_id: user?.meta_offline_event_set_id || '',
    meta_whatsapp_business_id: user?.meta_whatsapp_business_id || '',
  })
  const [capiStatus, setCapiStatus] = useState(user?.meta_capi_status || '')
  const [capiError, setCapiError] = useState(user?.meta_capi_error || '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    setCapiStatus(e.record.meta_capi_status || '')
    setCapiError(e.record.meta_capi_error || '')
  })

  const set = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const updated = await pb.collection('users').update(user.id, {
        meta_pixel_id: form.meta_dataset_id.trim() || form.meta_pixel_id.trim(),
        meta_capi_token: form.meta_capi_token.trim(),
        meta_app_id: form.meta_app_id.trim(),
        meta_app_secret: form.meta_app_secret.trim(),
        meta_dataset_id: form.meta_dataset_id.trim(),
        meta_offline_event_set_id: form.meta_offline_event_set_id.trim(),
      })
      pb.authStore.save(pb.authStore.token, updated)
      toast({ title: 'Configurações CAPI salvas com sucesso' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!user) return
    if (!form.meta_dataset_id.trim() || !form.meta_capi_token.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Dataset ID e CAPI Token são obrigatórios para testar.',
      })
      return
    }
    setTesting(true)
    try {
      await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: {
          business_id: form.meta_whatsapp_business_id.trim(),
          dataset_id: form.meta_dataset_id.trim(),
          pixel_id: form.meta_dataset_id.trim(),
          access_token: form.meta_capi_token.trim(),
        },
      })
      setCapiStatus('connected')
      setCapiError('')
      toast({
        title: 'Conexão CAPI validada',
        description: 'Meta Conversions API está funcionando.',
      })
    } catch (err: any) {
      setCapiStatus('error')
      toast({
        variant: 'destructive',
        title: 'Falha na conexão CAPI',
        description: err?.message || 'Erro ao testar conexão',
      })
    } finally {
      setTesting(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Carregando...</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Meta Conversions API (CAPI)</CardTitle>
          </div>
          <StatusTrafficLight status={capiStatus} error={capiError} />
        </div>
        <CardDescription>
          Configure a Conversions API para rastreamento de eventos de conversão e integração com o
          Pixel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>
              Pixel ID / Dataset ID <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.meta_dataset_id}
              onChange={(e) => set('meta_dataset_id', e.target.value.replace(/\D/g, ''))}
              placeholder="123456789012345"
            />
            <p className="text-xs text-muted-foreground">
              Dataset/Pixel ID numérico entre 10 e 18 dígitos.
            </p>
          </div>
          <MaskedInput
            id="capi_token"
            label="CAPI Token"
            value={form.meta_capi_token}
            onChange={(v) => set('meta_capi_token', v)}
            placeholder="EAA..."
            required
          />
          <div className="space-y-2">
            <Label>App ID</Label>
            <Input value={form.meta_app_id} onChange={(e) => set('meta_app_id', e.target.value)} />
          </div>
          <MaskedInput
            id="app_secret"
            label="App Secret"
            value={form.meta_app_secret}
            onChange={(v) => set('meta_app_secret', v)}
            placeholder="..."
          />
          <div className="space-y-2">
            <Label>Offline Event Set ID</Label>
            <Input
              value={form.meta_offline_event_set_id}
              onChange={(e) => set('meta_offline_event_set_id', e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
          <Button onClick={handleTest} disabled={testing} variant="outline">
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="mr-2 h-4 w-4" />
            )}
            Testar Conexão CAPI
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default CapiPanel
