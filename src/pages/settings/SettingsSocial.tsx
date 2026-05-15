import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Loader2, Globe, Instagram, Youtube, CheckCircle2, Target } from 'lucide-react'

export function SettingsSocial() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [websiteUrl, setWebsiteUrl] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [googleAdsWebhookKey, setGoogleAdsWebhookKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingCapi, setIsTestingCapi] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const initialized = useRef(false)

  useEffect(() => {
    if (user && !initialized.current) {
      setWebsiteUrl(user.website_url || '')
      setInstagramUsername(user.instagram_username || '')
      setYoutubeUrl(user.youtube_url || '')
      setMetaPixelId(user.meta_pixel_id || '')
      setMetaCapiToken(user.meta_capi_token || '')
      setGoogleAdsWebhookKey(user.google_ads_webhook_key || '')
      initialized.current = true
    }
  }, [user])

  const handleTestCapi = async () => {
    if (!user) return
    if (!metaPixelId || !metaCapiToken) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o Pixel ID e o Token da CAPI primeiro.',
        variant: 'destructive',
      })
      return
    }

    if (!/^\d+$/.test(metaPixelId)) {
      toast({
        title: 'Pixel ID Inválido',
        description: 'O Pixel ID deve conter apenas números.',
        variant: 'destructive',
      })
      return
    }

    if (!/^EAA[a-zA-Z0-9]+$/.test(metaCapiToken)) {
      toast({
        title: 'Token CAPI Inválido',
        description: 'O token deve começar com "EAA" e ser alfanumérico.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingCapi(true)
    try {
      await pb.send('/backend/v1/meta/test-capi', {
        method: 'POST',
        body: { pixelId: metaPixelId, capiToken: metaCapiToken },
      })
      const updatedUser = await pb.collection('users').getOne(user.id)
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({
        title: 'Conexão CAPI estabelecida',
        description: 'Sua integração Meta CAPI foi validada com sucesso!',
      })
    } catch (error) {
      toast({
        title: 'Erro na conexão CAPI',
        description:
          'Verifique suas credenciais e tente novamente. Certifique-se de que o Token e o Pixel ID são válidos.',
        variant: 'destructive',
      })
    } finally {
      setIsTestingCapi(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    setFieldErrors({})
    try {
      const isCapiChanged =
        user.meta_pixel_id !== metaPixelId || user.meta_capi_token !== metaCapiToken
      const payload: any = {
        website_url: websiteUrl,
        instagram_username: instagramUsername,
        youtube_url: youtubeUrl,
        meta_pixel_id: metaPixelId,
        meta_capi_token: metaCapiToken,
        google_ads_webhook_key: googleAdsWebhookKey,
      }

      if (isCapiChanged) {
        payload.meta_token_status = 'invalid'
      }

      const updatedUser = await pb.collection('users').update(user.id, payload)
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({
        title: 'Configurações salvas',
        description: 'Suas conexões e configurações de marketing foram atualizadas.',
      })
    } catch (error) {
      const errors = extractFieldErrors(error)
      setFieldErrors(errors)
      toast({
        title: 'Erro',
        description: 'Verifique os erros nos campos e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 mt-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-6 w-6 text-primary" />
            <CardTitle>Conexões Web & Social</CardTitle>
          </div>
          <CardDescription>
            Conecte seu site e redes sociais para alimentar o conhecimento da IA e habilitar
            integrações de mensagens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" /> Website URL
              </Label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.brfimoveis.com.br"
                className={fieldErrors.website_url ? 'border-destructive' : ''}
              />
              {fieldErrors.website_url && (
                <p className="text-xs text-destructive">{fieldErrors.website_url}</p>
              )}
              <p className="text-xs text-muted-foreground">
                A IA poderá ler o conteúdo público deste site.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Instagram className="h-4 w-4" /> Instagram Username
              </Label>
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">
                  @
                </div>
                <Input
                  className={`rounded-l-none ${fieldErrors.instagram_username ? 'border-destructive' : ''}`}
                  value={instagramUsername}
                  onChange={(e) => setInstagramUsername(e.target.value)}
                  placeholder="brfimoveis"
                />
              </div>
              {fieldErrors.instagram_username && (
                <p className="text-xs text-destructive">{fieldErrors.instagram_username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Youtube className="h-4 w-4" /> YouTube Channel URL
              </Label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/@brfimoveis"
                className={fieldErrors.youtube_url ? 'border-destructive' : ''}
              />
              {fieldErrors.youtube_url && (
                <p className="text-xs text-destructive">{fieldErrors.youtube_url}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-6 w-6 text-primary" />
            <CardTitle>Rastreamento e Marketing (Meta CAPI)</CardTitle>
          </div>
          <CardDescription>
            Configure as credenciais de rastreamento avançado (Meta Pixel e Conversions API).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meta Pixel ID</Label>
              <Input
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                placeholder="Ex: 123456789012345"
                className={fieldErrors.meta_pixel_id ? 'border-destructive' : ''}
              />
              {fieldErrors.meta_pixel_id && (
                <p className="text-xs text-destructive">{fieldErrors.meta_pixel_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Meta CAPI Token (Conversions API Token)</Label>
              <Input
                type="password"
                value={metaCapiToken}
                onChange={(e) => setMetaCapiToken(e.target.value)}
                placeholder="Ex: EAAB..."
                className={fieldErrors.meta_capi_token ? 'border-destructive' : ''}
              />
              {fieldErrors.meta_capi_token && (
                <p className="text-xs text-destructive">{fieldErrors.meta_capi_token}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Token de acesso gerado no Gerenciador de Eventos da Meta.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <Label>Google Ads Webhook Key (GCLID)</Label>
              <Input
                value={googleAdsWebhookKey}
                onChange={(e) => setGoogleAdsWebhookKey(e.target.value)}
                placeholder="Ex: XXXX-YYYY-ZZZZ"
                className={fieldErrors.google_ads_webhook_key ? 'border-destructive' : ''}
              />
              {fieldErrors.google_ads_webhook_key && (
                <p className="text-xs text-destructive">{fieldErrors.google_ads_webhook_key}</p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div
                className={`px-2 py-1 rounded-md border text-xs font-medium ${(user as any)?.meta_token_status === 'valid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
              >
                Status:{' '}
                {(user as any)?.meta_token_status === 'valid' ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 pt-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestCapi}
            disabled={isTestingCapi || isSaving}
          >
            {isTestingCapi ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Target className="mr-2 h-4 w-4" />
            )}
            Testar Conexão CAPI
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || isTestingCapi}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
