import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export const MetaCapiConfig = () => {
  const { user } = useAuth()
  const [pixelId, setPixelId] = useState('')
  const [capiToken, setCapiToken] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize form from context
  useEffect(() => {
    if (user) {
      setPixelId(user.meta_pixel_id || '')
      setCapiToken(user.meta_capi_token || '')
      setWebsiteUrl(user.website_url || '')
    }
  }, [user])

  // Real-time synchronization
  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      setPixelId(e.record.meta_pixel_id || '')
      setCapiToken(e.record.meta_capi_token || '')
      setWebsiteUrl(e.record.website_url || '')
    }
  })

  const handleSave = async () => {
    if (!user) return

    let processedUrl = websiteUrl.trim()
    if (processedUrl && !/^https?:\/\//i.test(processedUrl)) {
      processedUrl = `https://${processedUrl}`
    }

    setLoading(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_pixel_id: pixelId,
        meta_capi_token: capiToken,
        website_url: processedUrl,
      })
      setWebsiteUrl(processedUrl)
      toast.success('Configurações do Meta salvas com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao salvar as configurações: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="-ml-4 mb-4 text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Meta CAPI</h1>
          <p className="text-muted-foreground">Integre o Facebook Pixel e a API de Conversões.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Rastreamento</CardTitle>
            <CardDescription>
              Defina o ID do Pixel, Token da CAPI e o Domínio do seu site para acompanhamento de
              conversões e eventos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pixel-id">ID do Pixel (Facebook Pixel)</Label>
              <Input
                id="pixel-id"
                placeholder="Ex: 950541937872426"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                O ID padrão recomendado é 950541937872426.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capi-token">Token de Acesso (API de Conversões)</Label>
              <Input
                id="capi-token"
                type="password"
                placeholder="Cole seu token de acesso aqui"
                value={capiToken}
                onChange={(e) => setCapiToken(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website-url">Domínio do Site</Label>
              <Input
                id="website-url"
                placeholder="Ex: www.meusite.ia.crm.inteligente.com.br"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Informe o seu domínio. O prefixo "https://" será adicionado automaticamente, caso
                não incluído.
              </p>
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
