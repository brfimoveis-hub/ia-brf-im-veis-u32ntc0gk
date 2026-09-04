import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Instagram, CheckCircle2, AlertCircle, Info, Loader2, Save, KeyRound } from 'lucide-react'
import { MaskedInput } from './MaskedInput'

export function InstagramConnect() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState({
    meta_instagram_business_id: user?.meta_instagram_business_id || '',
    meta_instagram_page_token: user?.meta_instagram_page_token || '',
    meta_page_access_token: user?.meta_page_access_token || '',
  })
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [inlineError, setInlineError] = useState('')

  const hasIgId = !!(form.meta_instagram_business_id || user?.meta_instagram_business_id)
  const hasPageToken = !!(
    form.meta_page_access_token ||
    form.meta_instagram_page_token ||
    user?.meta_page_access_token ||
    user?.meta_instagram_page_token
  )
  const [igConnected, setIgConnected] = useState(hasIgId && hasPageToken)
  const [msgConnected, setMsgConnected] = useState(hasPageToken)

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    const recordIgId = !!e.record.meta_instagram_business_id
    const recordPageToken = !!(
      e.record.meta_page_access_token || e.record.meta_instagram_page_token
    )
    setIgConnected(recordIgId && recordPageToken)
    setMsgConnected(recordPageToken)
    setForm({
      meta_instagram_business_id: e.record.meta_instagram_business_id || '',
      meta_instagram_page_token: e.record.meta_instagram_page_token || '',
      meta_page_access_token: e.record.meta_page_access_token || '',
    })
  })

  const hasAppConfig = !!user?.meta_app_id && !!user?.meta_app_secret
  const redirectUri = `${window.location.origin}/settings/connections/instagram/callback`

  const set = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    setFieldErrors((prev) => ({ ...prev, [key]: '' }))
    setInlineError('')
  }

  const validate = (): { valid: boolean; errors: FieldErrors } => {
    const errors: FieldErrors = {}
    const bizId = form.meta_instagram_business_id.trim()
    const pageToken = form.meta_page_access_token.trim()

    if (!bizId) {
      errors.meta_instagram_business_id = 'Instagram Business ID é obrigatório.'
    } else if (!/^\d+$/.test(bizId)) {
      errors.meta_instagram_business_id =
        'Instagram Business ID deve conter apenas números (ex: 17841400000000000).'
    }

    if (!pageToken) {
      errors.meta_page_access_token = 'Instagram Page Access Token é obrigatório.'
    } else if (pageToken.length < 10) {
      errors.meta_page_access_token = 'Token de acesso parece curto demais. Verifique o valor.'
    }

    return { valid: Object.keys(errors).length === 0, errors }
  }

  const handleSave = async () => {
    if (!user) return
    const { valid, errors } = validate()
    if (!valid) {
      setFieldErrors(errors)
      const firstErr = Object.values(errors).find(Boolean) || 'Corrija os campos destacados.'
      setInlineError(firstErr)
      toast({
        variant: 'destructive',
        title: 'Campos inválidos',
        description: firstErr,
      })
      return
    }

    setSaving(true)
    setInlineError('')
    setFieldErrors({})
    try {
      const updated = await pb.collection('users').update(user.id, {
        meta_instagram_business_id: form.meta_instagram_business_id.trim(),
        meta_instagram_page_token: form.meta_instagram_page_token.trim(),
        meta_page_access_token: form.meta_page_access_token.trim(),
      })
      try {
        pb.authStore.save(pb.authStore.token || '', updated)
      } catch {
        // realtime will sync
      }
      toast({
        title: 'Credenciais Instagram salvas',
        description: 'Os valores foram persistidos no seu perfil.',
      })
    } catch (err: any) {
      const errors = extractFieldErrors(err)
      setFieldErrors(errors)
      const msg =
        err?.message ||
        Object.values(errors).find(Boolean) ||
        'Erro ao salvar credenciais Instagram.'
      setInlineError(msg)
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleConnect = () => {
    if (!hasAppConfig) {
      toast({
        variant: 'destructive',
        title: 'Configuração incompleta',
        description:
          'Preencha o Meta App ID e App Secret na aba "Meta API Configuration" primeiro.',
      })
      return
    }

    const scope =
      'instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement,pages_show_list,pages_messaging'
    const oauthUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${user!.meta_app_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`

    window.open(oauthUrl, '_blank')
    toast({
      title: 'Abrindo login do Facebook',
      description: 'Uma nova aba foi aberta para você autorizar a conexão.',
    })
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Instagram className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">Instagram Business &amp; Messenger</CardTitle>
        </div>
        <CardDescription>
          Conecte sua conta do Instagram Business e Messenger para receber mensagens diretamente no
          CRM. Você pode usar o OAuth (botão abaixo) ou preencher manualmente os campos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {!hasAppConfig && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-700">Configuração necessária (OAuth)</AlertTitle>
            <AlertDescription className="text-yellow-600">
              Para usar o fluxo OAuth, preencha o <strong>Meta App ID</strong> e{' '}
              <strong>App Secret</strong> na aba &quot;Meta API Configuration&quot; acima. Caso
              contrário, preencha manualmente os campos abaixo.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <Button onClick={handleConnect} className="gap-2" variant="default">
            <Instagram className="h-4 w-4" />
            Conectar Instagram (OAuth)
          </Button>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              className={
                igConnected
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : hasIgId
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    : ''
              }
              variant={igConnected || hasIgId ? 'default' : 'secondary'}
            >
              {igConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Instagram Conectado
                </>
              ) : hasIgId ? (
                <>
                  <Info className="h-3 w-3 mr-1" /> ID Configurado (Aguardando Page Token)
                </>
              ) : (
                'Instagram Aguardando'
              )}
            </Badge>
            <Badge
              className={msgConnected ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
              variant={msgConnected ? 'default' : 'secondary'}
            >
              {msgConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Messenger Conectado
                </>
              ) : (
                'Messenger Aguardando'
              )}
            </Badge>
          </div>
        </div>

        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
          <div className="flex items-start gap-2">
            <KeyRound className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Configuração Manual de Credenciais
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Preencha os campos abaixo e clique em &quot;Salvar Credenciais&quot;. Os valores são
                persistidos no seu perfil e o status acima será atualizado automaticamente. Esta
                opção não afeta nenhuma outra integração (WhatsApp, CAPI, Pixel, Messenger).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ig_business_id">
                Instagram Business ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ig_business_id"
                value={form.meta_instagram_business_id}
                onChange={(e) =>
                  set('meta_instagram_business_id', e.target.value.replace(/\D/g, ''))
                }
                placeholder="17841400000000000"
                inputMode="numeric"
                aria-invalid={!!fieldErrors.meta_instagram_business_id}
                className={
                  fieldErrors.meta_instagram_business_id
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : ''
                }
              />
              {fieldErrors.meta_instagram_business_id ? (
                <p className="text-xs text-red-500">{fieldErrors.meta_instagram_business_id}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Encontrado no Meta Business Suite &gt; Instagram &gt; Configurações &gt; ID da
                  conta.
                </p>
              )}
            </div>

            <MaskedInput
              id="ig_page_access_token"
              label="Instagram Page Access Token"
              value={form.meta_page_access_token}
              onChange={(v) => set('meta_page_access_token', v)}
              placeholder="EAAG..."
              required
            />

            <MaskedInput
              id="ig_page_token"
              label="Instagram Page Token"
              value={form.meta_instagram_page_token}
              onChange={(v) => set('meta_instagram_page_token', v)}
              placeholder="EAAG... (opcional)"
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

          {inlineError && !Object.values(fieldErrors).some(Boolean) && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{inlineError}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Credenciais
            </Button>
            <span className="text-xs text-muted-foreground">
              Valores inválidos não limpam credenciais já salvas.
            </span>
          </div>
        </div>

        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground mb-1">Como funciona:</p>
            <p>
              O botão &quot;Conectar Instagram (OAuth)&quot; abre o login do Facebook em uma nova
              aba. Após autorizar, o Instagram Business ID e os tokens serão configurados
              automaticamente, sobrescrevendo quaisquer valores manuais. Alternativamente, preencha
              os campos manuais acima. O status dos cards é atualizado em tempo real e o fluxo de
              verificação de saúde (&quot;Verificar Todas&quot;) reconhece os valores informados.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default InstagramConnect
