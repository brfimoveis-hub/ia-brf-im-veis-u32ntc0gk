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
import { Loader2, Globe, Instagram, Youtube, CheckCircle2 } from 'lucide-react'

export function SettingsSocial() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [websiteUrl, setWebsiteUrl] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [googleAdsWebhookKey, setGoogleAdsWebhookKey] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const initialized = useRef(false)

  useEffect(() => {
    if (user && !initialized.current) {
      setWebsiteUrl(user.website_url || '')
      setInstagramUsername(user.instagram_username || '')
      setYoutubeUrl(user.youtube_url || '')
      setGoogleAdsWebhookKey(user.google_ads_webhook_key || '')
      initialized.current = true
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    setFieldErrors({})
    try {
      const payload: any = {
        website_url: websiteUrl,
        instagram_username: instagramUsername,
        youtube_url: youtubeUrl,
        google_ads_webhook_key: googleAdsWebhookKey,
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
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 pt-4 flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isSaving}>
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
