import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusTrafficLight } from './StatusTrafficLight'
import { MaskedInput } from './MaskedInput'
import { Loader2, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'

export function CapiPanel() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState({
    meta_pixel_id: user?.meta_pixel_id || '',
    meta_dataset_id: user?.meta_dataset_id || '',
    meta_capi_token: user?.meta_capi_token || '',
    meta_app_id: user?.meta_app_id || '',
    meta_app_secret: user?.meta_app_secret || '',
    meta_offline_event_set_id: user?.meta_offline_event_set_id || '',
    meta_whatsapp_business_id: user?.meta_whatsapp_business_id || '',
  })
  const [capiStatus, setCapiStatus] = useState(user?.meta_capi_status || '')
  const [capiError, setCapiError] = useState(user?.meta_capi_error || '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [inlineError, setInlineError] = useState('')

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    setCapiStatus(e.record.meta_capi_status || '')
    setCapiError(e.record.meta_capi_error || '')
  })

  const set = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    setFieldErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setInlineError('')
    setFieldErrors({})
    try {
      const updated = await pb.collection('users').update(user.id, {
        meta_pixel_id: form.meta_pixel_id.trim(),
        meta_dataset_id: form.meta_dataset_id.trim(),
        meta_capi_token: form.meta_capi_token.trim(),
        meta_app_id: form.meta_app_id.trim(),
        meta_app_secret: form.meta_app_secret.trim(),
        meta_offline_event_set_id: form.meta_offline_event_set_id.trim(),
      })
      pb.authStore.save(pb.authStore.token, updated)
      toast({ title: 'Credenciais CAPI salvas com sucesso' })
    } catch (err: any) {
      const errors = extractFieldErrors(err)
      setFieldErrors(errors)
      const msg =
        err?.message || Object.values(errors).find(Boolean) || 'Erro ao salvar credenciais CAPI'
      setInlineError(msg)
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!user) return
    if (!form.meta_dataset_id.trim() || !form.meta_capi_token.trim()) {
      const msg = 'Dataset ID e Token de Acesso são obrigatórios para testar.'
      setInlineError(msg)
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: msg,
      })
      return
    }
    setTesting(true)
    setInlineError('')
    try {
      const res: any = await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: {
          business_id: form.meta_whatsapp_business_id.trim(),
          dataset_id: form.meta_dataset_id.trim(),
          pixel_id: form.meta_pixel_id.trim() || form.meta_dataset_id.trim(),
          access_token: form.meta_capi_token.trim(),
        },
      })
      if (res?.success === false) {
        const errMsg = res?.error?.message || 'Falha ao testar conexão CAPI'
        setCapiStatus('error')
        setCapiError(errMsg)
        setInlineError(errMsg)
        toast({
          variant: 'destructive',
          title: 'Falha na conexão CAPI',
          description: errMsg,
        })
      } else {
        setCapiStatus('connected')
        setCapiError('')
        toast({
          title: 'Conexão CAPI validada',
          description: 'Meta Conversions API está funcionando.',
        })
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.error?.message ||
        err?.response?.message ||
        err?.message ||
        'Erro ao testar conexão CAPI'
      setCapiStatus('error')
      setCapiError(errMsg)
      setInlineError(errMsg)
      toast({
        variant: 'destructive',
        title: 'Falha na conexão CAPI',
        description: errMsg,
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

  const isError = (capiStatus || '').toLowerCase() === 'error'

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
        {isError && capiError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Erro</p>
              <p className="text-sm text-red-600">{capiError}</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MaskedInput
            id="capi_app_id"
            label="App ID"
            value={form.meta_app_id}
            onChange={(v) => set('meta_app_id', v)}
            placeholder="123456789012345"
          />
          <MaskedInput
            id="capi_app_secret"
            label="App Secret"
            value={form.meta_app_secret}
            onChange={(v) => set('meta_app_secret', v)}
            placeholder="..."
          />
          <MaskedInput
            id="capi_pixel_id"
            label="Pixel ID"
            value={form.meta_pixel_id}
            onChange={(v) => set('meta_pixel_id', v)}
            placeholder="123456789012345"
          />
          <MaskedInput
            id="capi_dataset_id"
            label="Dataset ID"
            value={form.meta_dataset_id}
            onChange={(v) => set('meta_dataset_id', v)}
            placeholder="123456789012345"
            required
          />
          <MaskedInput
            id="capi_offline_event_set_id"
            label="Offline Event Set ID"
            value={form.meta_offline_event_set_id}
            onChange={(v) => set('meta_offline_event_set_id', v)}
            placeholder="123456789012345"
          />
          <MaskedInput
            id="capi_token"
            label="Token de Acesso"
            value={form.meta_capi_token}
            onChange={(v) => set('meta_capi_token', v)}
            placeholder="EAA..."
            required
          />
        </div>

        {Object.values(fieldErrors).some(Boolean) && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div className="text-sm text-red-600 space-y-1">
              {Object.entries(fieldErrors).map(
                ([field, msg]) =>
                  msg && (
                    <p key={field}>
                      <span className="font-medium">{field}:</span> {msg}
                    </p>
                  ),
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSave} disabled={saving || testing}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar Credenciais CAPI
          </Button>
          <Button onClick={handleTest} disabled={saving || testing} variant="outline">
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="mr-2 h-4 w-4" />
            )}
            Testar Conexão CAPI
          </Button>
        </div>

        {inlineError && !isError && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{inlineError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CapiPanel
