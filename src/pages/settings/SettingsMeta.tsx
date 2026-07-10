import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
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
  Facebook,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { executeCapiVerification } from '@/services/meta_capi'

export function SettingsMeta() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [metaDatasetId, setMetaDatasetId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [metaWhatsappBusinessId, setMetaWhatsappBusinessId] = useState('')
  const [metaWhatsappPhoneNumberId, setMetaWhatsappPhoneNumberId] = useState('')
  const [metaWhatsappAccessToken, setMetaWhatsappAccessToken] = useState('')
  const [metaTokenStatus, setMetaTokenStatus] = useState('')
  const [metaCapiStatus, setMetaCapiStatus] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isTestingWa, setIsTestingWa] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const initialized = useRef(false)

  const loadData = async () => {
    if (!user) return
    try {
      const record = await pb.collection('users').getOne(user.id, { $autoCancel: false })
      setMetaDatasetId(record.meta_dataset_id || record.meta_pixel_id || '')
      setMetaCapiToken(record.meta_capi_token || '')
      setMetaWhatsappBusinessId(record.meta_whatsapp_business_id || '')
      setMetaWhatsappPhoneNumberId(record.meta_whatsapp_phone_number_id || '')
      setMetaWhatsappAccessToken(record.meta_whatsapp_access_token || '')
      setMetaTokenStatus(record.meta_token_status || '')
      setMetaCapiStatus(record.meta_capi_status || '')
    } catch (error) {
      console.error('Failed to load user meta settings', error)
    }
  }

  useEffect(() => {
    if (user && !initialized.current) {
      loadData()
      initialized.current = true
    }
  }, [user])

  useRealtime(
    'users',
    (e) => {
      if (user && e.record.id === user.id && e.action === 'update') {
        setMetaTokenStatus(e.record.meta_token_status || '')
        setMetaCapiStatus(e.record.meta_capi_status || '')
      }
    },
    !!user,
  )

  const validateFields = () => {
    const errors: Record<string, string> = {}
    const dId = metaDatasetId.replace(/\D/g, '')
    const bId = metaWhatsappBusinessId.replace(/\D/g, '')
    const token = metaCapiToken.replace(/\s/g, '')

    if (!dId) {
      errors.meta_dataset_id = 'Dataset ID é obrigatório'
    } else if (!/^\d+$/.test(dId)) {
      errors.meta_dataset_id = 'Dataset ID deve conter apenas números'
    } else if (dId.length < 10 || dId.length > 18) {
      errors.meta_dataset_id = 'Dataset ID deve ter entre 10 e 18 dígitos'
    }

    if (!token) {
      errors.meta_capi_token = 'CAPI Token é obrigatório'
    }

    if (!metaWhatsappPhoneNumberId.trim()) {
      errors.meta_whatsapp_phone_number_id = 'Phone Number ID é obrigatório'
    }

    if (bId && !/^\d+$/.test(bId)) {
      errors.meta_whatsapp_business_id = 'Business ID deve conter apenas números'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!user) return
    if (!validateFields()) {
      toast({
        title: 'Erro de Validação',
        description: 'Preencha todos os campos obrigatórios antes de salvar.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    setFieldErrors({})
    try {
      const cleanDatasetId = metaDatasetId.replace(/\D/g, '').trim()
      const cleanBusinessId = metaWhatsappBusinessId.replace(/\D/g, '').trim()
      const cleanToken = metaCapiToken.trim()

      const payload: any = {
        meta_pixel_id: cleanDatasetId,
        meta_dataset_id: cleanDatasetId,
        meta_capi_token: cleanToken,
        meta_whatsapp_business_id: cleanBusinessId,
        meta_whatsapp_phone_number_id: metaWhatsappPhoneNumberId.replace(/\D/g, '').trim(),
        meta_whatsapp_access_token: metaWhatsappAccessToken.trim(),
      }

      const updatedUser = await pb
        .collection('users')
        .update(user.id, payload, { $autoCancel: false, requestKey: null })
      pb.authStore.save(pb.authStore.token, updatedUser)

      toast({
        title: 'Configurações Salvas',
        description: 'Suas credenciais Meta CAPI foram salvas com sucesso.',
      })

      try {
        await executeCapiVerification(user.id, cleanBusinessId, cleanDatasetId, cleanToken)
        toast({
          title: 'Conexão Validada',
          description: 'Sua integração Meta CAPI está funcionando corretamente.',
        })
      } catch (verifyError: any) {
        toast({
          title: 'Falha na Verificação CAPI',
          description: verifyError.message || 'A verificação falhou.',
          variant: 'destructive',
        })
      }

      loadData()
    } catch (error: any) {
      const fe = extractFieldErrors(error)
      if (Object.keys(fe).length > 0) setFieldErrors(fe)
      toast({
        title: 'Erro ao Salvar',
        description: error.message || 'Falha ao salvar configurações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestCapi = async () => {
    if (!user) return
    if (!metaDatasetId.trim() || !metaCapiToken.trim()) {
      toast({
        title: 'Campos Faltando',
        description: 'Dataset ID e CAPI Token são obrigatórios para testar a conexão.',
        variant: 'destructive',
      })
      return
    }

    setIsTesting(true)
    try {
      const cleanDatasetId = metaDatasetId.replace(/\D/g, '').trim()
      const cleanBusinessId = metaWhatsappBusinessId.replace(/\D/g, '').trim()
      const cleanToken = metaCapiToken.trim()

      await executeCapiVerification(user.id, cleanBusinessId, cleanDatasetId, cleanToken)
      toast({
        title: 'Conexão Validada',
        description: 'Sua integração Meta CAPI está funcionando corretamente.',
      })
      loadData()
    } catch (error: any) {
      toast({
        title: 'Falha na Conexão CAPI',
        description: error.message || 'Falha de comunicação com Meta CAPI',
        variant: 'destructive',
      })
      loadData()
    } finally {
      setIsTesting(false)
    }
  }

  const handleTestWhatsapp = async () => {
    if (!user) return
    if (!metaWhatsappPhoneNumberId.trim() || !metaWhatsappAccessToken.trim()) {
      toast({
        title: 'Campos Faltando',
        description: 'Phone Number ID e Access Token são obrigatórios para testar WhatsApp.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingWa(true)
    try {
      await pb.send('/backend/v1/meta_whatsapp_test', {
        method: 'POST',
        body: {
          phone_number_id: metaWhatsappPhoneNumberId.trim(),
          access_token: metaWhatsappAccessToken.trim(),
        },
      })

      toast({
        title: 'Conexão WhatsApp Validada',
        description: 'Sua integração Meta WhatsApp está funcionando corretamente.',
      })
    } catch (error: any) {
      const errorMsg =
        error.response?.message || error.message || 'Falha de comunicação com Meta WhatsApp'
      toast({
        title: 'Falha na Conexão WhatsApp',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsTestingWa(false)
    }
  }

  const isFormValid =
    metaDatasetId.trim() !== '' &&
    metaCapiToken.trim() !== '' &&
    metaWhatsappPhoneNumberId.trim() !== ''

  return (
    <div className="space-y-6 mt-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Facebook className="h-6 w-6 text-primary" />
            <CardTitle>Meta CAPI & WhatsApp Config</CardTitle>
            {metaCapiStatus === 'connected' && (
              <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium ml-2">
                <CheckCircle2 className="h-4 w-4" />
                Conexão Validada
              </span>
            )}
            {metaCapiStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-sm text-destructive font-medium ml-2">
                <XCircle className="h-4 w-4" />
                Erro de Conexão
              </span>
            )}
          </div>
          <CardDescription>
            Configure your Meta Conversions API and WhatsApp Cloud API credentials directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                ID do Pixel (Dataset ID) <span className="text-destructive">*</span>
              </Label>
              <Input
                value={metaDatasetId}
                onChange={(e) => setMetaDatasetId(e.target.value.replace(/\D/g, ''))}
                placeholder="1093869151209421"
                className={fieldErrors.meta_dataset_id ? 'border-destructive' : ''}
              />
              {fieldErrors.meta_dataset_id && (
                <p className="text-xs text-destructive">{fieldErrors.meta_dataset_id}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Dataset/Pixel ID numérico entre 10 e 18 dígitos.
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Meta CAPI Token <span className="text-destructive">*</span>
              </Label>
              <Input
                type="password"
                value={metaCapiToken}
                onChange={(e) => setMetaCapiToken(e.target.value.replace(/\s/g, ''))}
                placeholder="EAA..."
                className={fieldErrors.meta_capi_token ? 'border-destructive' : ''}
              />
              {fieldErrors.meta_capi_token && (
                <p className="text-xs text-destructive">{fieldErrors.meta_capi_token}</p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label>Meta WhatsApp Business ID</Label>
              <Input
                value={metaWhatsappBusinessId}
                onChange={(e) => setMetaWhatsappBusinessId(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 9876543210"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label>
                Meta WhatsApp Phone Number ID <span className="text-destructive">*</span>
              </Label>
              <Input
                value={metaWhatsappPhoneNumberId}
                onChange={(e) => setMetaWhatsappPhoneNumberId(e.target.value)}
                placeholder="Ex: 1122334455"
                className={fieldErrors.meta_whatsapp_phone_number_id ? 'border-destructive' : ''}
              />
              {fieldErrors.meta_whatsapp_phone_number_id && (
                <p className="text-xs text-destructive">
                  {fieldErrors.meta_whatsapp_phone_number_id}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label>Meta WhatsApp Access Token</Label>
              <Input
                type="password"
                value={metaWhatsappAccessToken}
                onChange={(e) => setMetaWhatsappAccessToken(e.target.value)}
                placeholder="EAA..."
              />
            </div>

            {metaTokenStatus && (
              <div className="pt-2 text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Status: <span className="font-medium">{metaTokenStatus}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 pt-4 flex justify-between gap-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestCapi}
              disabled={isTesting || !metaDatasetId.trim() || !metaCapiToken.trim()}
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Testar Conexão
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestWhatsapp}
              disabled={
                isTestingWa || !metaWhatsappPhoneNumberId.trim() || !metaWhatsappAccessToken.trim()
              }
            >
              {isTestingWa ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="mr-2 h-4 w-4" />
              )}
              Test WhatsApp
            </Button>
          </div>
          <Button type="button" onClick={handleSave} disabled={isSaving || !isFormValid}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
