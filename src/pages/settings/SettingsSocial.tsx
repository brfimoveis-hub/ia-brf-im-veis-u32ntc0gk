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
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const initialized = useRef(false)

  useEffect(() => {
    if (user && !initialized.current) {
      setWebsiteUrl(user.website_url || '')
      setInstagramUsername(user.instagram_username || '')
      setYoutubeUrl(user.youtube_url || '')
      setMetaPixelId(user.meta_pixel_id || '')
      setMetaCapiToken(user.meta_capi_token || '')
      initialized.current = true
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    setFieldErrors({})
    try {
      const updatedUser = await pb.collection('users').update(user.id, {
        website_url: websiteUrl,
        instagram_username: instagramUsername,
        youtube_url: youtubeUrl,
        meta_pixel_id: metaPixelId,
        meta_capi_token: metaCapiToken,
      })
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
