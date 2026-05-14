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
import { Loader2, Globe, Instagram, Youtube, CheckCircle2 } from 'lucide-react'

export function SettingsSocial() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [websiteUrl, setWebsiteUrl] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (user && !initialized.current) {
      setWebsiteUrl(user.website_url || '')
      setInstagramUsername(user.instagram_username || '')
      setYoutubeUrl(user.youtube_url || '')
      initialized.current = true
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const updatedUser = await pb.collection('users').update(user.id, {
        website_url: websiteUrl,
        instagram_username: instagramUsername,
        youtube_url: youtubeUrl,
      })
      pb.authStore.save(pb.authStore.token, updatedUser)
      toast({
        title: 'Configurações salvas',
        description: 'Suas conexões sociais e de web foram atualizadas.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-sm mt-4">
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
            />
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
                className="rounded-l-none"
                value={instagramUsername}
                onChange={(e) => setInstagramUsername(e.target.value)}
                placeholder="brfimoveis"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Youtube className="h-4 w-4" /> YouTube Channel URL
            </Label>
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@brfimoveis"
            />
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
          Salvar Conexões
        </Button>
      </CardFooter>
    </Card>
  )
}
