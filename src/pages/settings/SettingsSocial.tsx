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
import {
  Loader2,
  Globe,
  Instagram,
  Youtube,
  CheckCircle2,
  Target,
  MessageSquare,
  Smartphone,
} from 'lucide-react'

export function SettingsSocial() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [websiteUrl, setWebsiteUrl] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [googleAdsWebhookKey, setGoogleAdsWebhookKey] = useState('')

  const [uazapiDomain, setUazapiDomain] = useState('https://iabrfimveis.uazapi.com')
  const [uazapiAdminToken, setUazapiAdminToken] = useState('')
  const [uazapiInstanceNumber, setUazapiInstanceNumber] = useState('')
  const [uazapiStatus, setUazapiStatus] = useState('')

  const [metaWhatsappBusinessId, setMetaWhatsappBusinessId] = useState('')
  const [metaWhatsappPhoneNumberId, setMetaWhatsappPhoneNumberId] = useState('')
  const [metaWhatsappAccessToken, setMetaWhatsappAccessToken] = useState('')
  const [metaWhatsappStatus, setMetaWhatsappStatus] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isTestingCapi, setIsTestingCapi] = useState(false)
  const [isTestingUazapi, setIsTestingUazapi] = useState(false)
  const [isTestingMetaWhatsapp, setIsTestingMetaWhatsapp] = useState(false)
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
      setUazapiDomain(user.uazapi_domain || 'https://iabrfimveis.uazapi.com')
      setUazapiAdminToken(user.uazapi_admin_token || '')
      setUazapiInstanceNumber(user.uazapi_instance_number || '')

      setMetaWhatsappBusinessId(user.meta_whatsapp_business_id || '')
      setMetaWhatsappPhoneNumberId(user.meta_whatsapp_phone_number_id || '')
      setMetaWhatsappAccessToken(user.meta_whatsapp_access_token || '')

      initialized.current = true
    }

    if (user) {
      setUazapiStatus(user.uazapi_status || '')
      setMetaWhatsappStatus(user.meta_whatsapp_status || '')
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

  const handleTestUazapi = async () => {
    if (!user) return
    if (!uazapiDomain || !uazapiAdminToken || !uazapiInstanceNumber) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o Domínio, Admin Token e a Instância do Uazapi primeiro.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingUazapi(true)
    try {
      await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: {
          domain: uazapiDomain,
          adminToken: uazapiAdminToken,
          instance: uazapiInstanceNumber,
        },
      })

      const updatedUser = await pb.collection('users').update(user.id, {
        uazapi_status: 'connected',
        uazapi_domain: uazapiDomain,
        uazapi_admin_token: uazapiAdminToken,
        uazapi_instance_number: uazapiInstanceNumber,
      })
      pb.authStore.save(pb.authStore.token, updatedUser)
      setUazapiStatus('connected')

      toast({
        title: 'Conexão Uazapi estabelecida',
        description: 'Sua instância do WhatsApp foi validada com sucesso!',
      })
    } catch (error) {
      const updatedUser = await pb.collection('users').update(user.id, {
        uazapi_status: 'disconnected',
      })
      pb.authStore.save(pb.authStore.token, updatedUser)
      setUazapiStatus('disconnected')

      toast({
        title: 'Erro na conexão Uazapi',
        description: 'Verifique suas credenciais e certifique-se de que a instância está ativa.',
        variant: 'destructive',
      })
    } finally {
      setIsTestingUazapi(false)
    }
  }

  const handleTestMetaWhatsapp = async () => {
    if (!user) return
    if (!metaWhatsappBusinessId || !metaWhatsappPhoneNumberId || !metaWhatsappAccessToken) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o Business ID, Phone Number ID e Access Token primeiro.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingMetaWhatsapp(true)
    try {
      await pb.send('/backend/v1/meta_test_connection', {
        method: 'POST',
        body: {
          business_id: metaWhatsappBusinessId,
          phone_number_id: metaWhatsappPhoneNumberId,
          access_token: metaWhatsappAccessToken,
        },
      })

      const updatedUser = await pb.collection('users').update(user.id, {
        meta_whatsapp_status: 'connected',
        meta_whatsapp_business_id: metaWhatsappBusinessId,
        meta_whatsapp_phone_number_id: metaWhatsappPhoneNumberId,
        meta_whatsapp_access_token: metaWhatsappAccessToken,
      })
      pb.authStore.save(pb.authStore.token, updatedUser)
      setMetaWhatsappStatus('connected')

      toast({
        title: 'Conexão Bem-sucedida',
        description: 'Sua integração com o Meta WhatsApp Business API foi validada com sucesso!',
      })
    } catch (error: any) {
      const updatedUser = await pb.collection('users').update(user.id, {
        meta_whatsapp_status: 'disconnected',
      })
      pb.authStore.save(pb.authStore.token, updatedUser)
      setMetaWhatsappStatus('disconnected')

      toast({
        title: 'Erro na conexão Meta WhatsApp',
        description: error.message || 'Verifique suas credenciais e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsTestingMetaWhatsapp(false)
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
        uazapi_domain: uazapiDomain,
        uazapi_admin_token: uazapiAdminToken,
        uazapi_instance_number: uazapiInstanceNumber,
        meta_whatsapp_business_id: metaWhatsappBusinessId,
        meta_whatsapp_phone_number_id: metaWhatsappPhoneNumberId,
        meta_whatsapp_access_token: metaWhatsappAccessToken,
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
        <CardFooter className="bg-muted/30 pt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestCapi}
            disabled={isTestingCapi || isSaving || isTestingUazapi || isTestingMetaWhatsapp}
          >
            {isTestingCapi ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Target className="mr-2 h-4 w-4" />
            )}
            Testar CAPI
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-6 w-6 text-primary" />
            <CardTitle>Integração WhatsApp Oficial (Meta API)</CardTitle>
          </div>
          <CardDescription>
            Conecte a API Oficial do WhatsApp Business para comunicação com seus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Account ID</Label>
              <Input
                value={metaWhatsappBusinessId}
                onChange={(e) => setMetaWhatsappBusinessId(e.target.value)}
                placeholder="Ex: 27018364624521397"
                className={fieldErrors.meta_whatsapp_business_id ? 'border-destructive' : ''}
              />
              {fieldErrors.meta_whatsapp_business_id && (
                <p className="text-xs text-destructive">{fieldErrors.meta_whatsapp_business_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Phone Number ID</Label>
              <Input
                value={metaWhatsappPhoneNumberId}
                onChange={(e) => setMetaWhatsappPhoneNumberId(e.target.value)}
                placeholder="Ex: 554892098050"
                className={fieldErrors.meta_whatsapp_phone_number_id ? 'border-destructive' : ''}
              />
              {fieldErrors.meta_whatsapp_phone_number_id && (
                <p className="text-xs text-destructive">
                  {fieldErrors.meta_whatsapp_phone_number_id}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input
                type="password"
                value={metaWhatsappAccessToken}
                onChange={(e) => setMetaWhatsappAccessToken(e.target.value)}
                placeholder="Ex: EAAzbADOLSAoBRX..."
                className={fieldErrors.meta_whatsapp_access_token ? 'border-destructive' : ''}
              />
              {fieldErrors.meta_whatsapp_access_token && (
                <p className="text-xs text-destructive">{fieldErrors.meta_whatsapp_access_token}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div
                className={`px-2 py-1 rounded-md border text-xs font-medium ${metaWhatsappStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
              >
                Status: {metaWhatsappStatus === 'connected' ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 pt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestMetaWhatsapp}
            disabled={isTestingMetaWhatsapp || isSaving || isTestingCapi || isTestingUazapi}
          >
            {isTestingMetaWhatsapp ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Verificar Conexão
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-6 w-6 text-primary" />
            <CardTitle>Integração WhatsApp (Uazapi)</CardTitle>
          </div>
          <CardDescription>Conecte suas instâncias não-oficiais do Uazapi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Domínio do Servidor (Uazapi)</Label>
              <Input
                value={uazapiDomain}
                onChange={(e) => setUazapiDomain(e.target.value)}
                placeholder="https://iabrfimveis.uazapi.com"
                className={fieldErrors.uazapi_domain ? 'border-destructive' : ''}
              />
              {fieldErrors.uazapi_domain && (
                <p className="text-xs text-destructive">{fieldErrors.uazapi_domain}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Admin Token</Label>
              <Input
                type="password"
                value={uazapiAdminToken}
                onChange={(e) => setUazapiAdminToken(e.target.value)}
                placeholder="Token Administrativo..."
                className={fieldErrors.uazapi_admin_token ? 'border-destructive' : ''}
              />
              {fieldErrors.uazapi_admin_token && (
                <p className="text-xs text-destructive">{fieldErrors.uazapi_admin_token}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Instância (BRF 1, zRuJNw, etc.)</Label>
              <Input
                value={uazapiInstanceNumber}
                onChange={(e) => setUazapiInstanceNumber(e.target.value)}
                placeholder="Ex: BRF 1"
                className={fieldErrors.uazapi_instance_number ? 'border-destructive' : ''}
              />
              {fieldErrors.uazapi_instance_number && (
                <p className="text-xs text-destructive">{fieldErrors.uazapi_instance_number}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div
                className={`px-2 py-1 rounded-md border text-xs font-medium ${uazapiStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
              >
                Status: {uazapiStatus === 'connected' ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 pt-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestUazapi}
            disabled={isTestingUazapi || isSaving || isTestingCapi || isTestingMetaWhatsapp}
          >
            {isTestingUazapi ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="mr-2 h-4 w-4" />
            )}
            Testar Uazapi
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isTestingCapi || isTestingUazapi || isTestingMetaWhatsapp}
          >
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
