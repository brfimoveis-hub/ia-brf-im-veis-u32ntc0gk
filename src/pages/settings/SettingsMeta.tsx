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
import { Loader2, Facebook, MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { executeCapiVerification } from '@/services/meta_capi'

export function SettingsMeta() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [metaWhatsappBusinessId, setMetaWhatsappBusinessId] = useState('')
  const [metaWhatsappPhoneNumberId, setMetaWhatsappPhoneNumberId] = useState('')
  const [metaWhatsappAccessToken, setMetaWhatsappAccessToken] = useState('')
  const [metaTokenStatus, setMetaTokenStatus] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isTestingWa, setIsTestingWa] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const initialized = useRef(false)

  const loadData = async () => {
    if (!user) return
    try {
      // Direct Database Synchronization - Fresh fetch
      const record = await pb.collection('users').getOne(user.id, { $autoCancel: false })
      setMetaPixelId(record.meta_pixel_id || '')
      setMetaCapiToken(record.meta_capi_token || '')
      setMetaWhatsappBusinessId(record.meta_whatsapp_business_id || '')
      setMetaWhatsappPhoneNumberId(record.meta_whatsapp_phone_number_id || '')
      setMetaWhatsappAccessToken(record.meta_whatsapp_access_token || '')
      setMetaTokenStatus(record.meta_token_status || '')
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

  useEffect(() => {
    if (!user) return
    const unsubscribe = pb.collection('users').subscribe(user.id, (e) => {
      if (e.action === 'update') {
        setMetaTokenStatus(e.record.meta_token_status || '')
      }
    })
    return () => {
      pb.collection('users')
        .unsubscribe(user.id)
        .catch(() => {})
    }
  }, [user])

  const validateFields = () => {
    const errors: Record<string, string> = {}
    const pId = metaPixelId.replace(/\D/g, '')
    const bId = metaWhatsappBusinessId.replace(/\D/g, '')
    const token = metaCapiToken.replace(/\s/g, '')

    if (!pId) {
      errors.meta_pixel_id = 'Pixel ID is required'
    } else if (!/^\d+$/.test(pId)) {
      errors.meta_pixel_id = 'Pixel ID must be strictly numeric'
    }

    if (!token) {
      errors.meta_capi_token = 'CAPI Token is required'
    }

    if (!metaWhatsappPhoneNumberId.trim()) {
      errors.meta_whatsapp_phone_number_id = 'Phone Number ID is required'
    }

    if (bId && !/^\d+$/.test(bId)) {
      errors.meta_whatsapp_business_id = 'Business ID must be strictly numeric'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!user) return
    if (!validateFields()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all mandatory fields before saving.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    setFieldErrors({})
    try {
      const cleanBusinessId = metaWhatsappBusinessId.replace(/\D/g, '').trim()
      const cleanPixelId = metaPixelId.replace(/\D/g, '').trim()
      const cleanToken = metaCapiToken.trim()

      const payload: any = {
        meta_pixel_id: cleanPixelId,
        meta_capi_token: cleanToken,
        meta_whatsapp_business_id: cleanBusinessId,
        meta_whatsapp_phone_number_id: metaWhatsappPhoneNumberId.replace(/\D/g, '').trim(),
        meta_whatsapp_access_token: metaWhatsappAccessToken.trim(),
      }

      // Bypass cache and save directly first
      const updatedUser = await pb
        .collection('users')
        .update(user.id, payload, { $autoCancel: false, requestKey: null })
      pb.authStore.save(pb.authStore.token, updatedUser)

      toast({
        title: 'Settings Saved',
        description: 'Your Meta CAPI credentials have been successfully saved.',
      })

      // Try verification after saving
      try {
        await executeCapiVerification(user.id, cleanBusinessId, cleanPixelId, cleanToken)
      } catch (verifyError: any) {
        toast({
          title: 'CAPI Verification Failed',
          description: verifyError.message || 'Verification failed.',
          variant: 'destructive',
        })
      }

      loadData()
    } catch (error: any) {
      toast({
        title: 'Error Saving',
        description: error.message || 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestCapi = async () => {
    if (!user) return
    if (!metaPixelId.trim() || !metaCapiToken.trim()) {
      toast({
        title: 'Missing Fields',
        description: 'Pixel ID and CAPI Token are required to test the connection.',
        variant: 'destructive',
      })
      return
    }

    setIsTesting(true)
    try {
      const cleanBusinessId = metaWhatsappBusinessId.replace(/\D/g, '').trim()
      const cleanPixelId = metaPixelId.replace(/\D/g, '').trim()
      const cleanToken = metaCapiToken.trim()

      await executeCapiVerification(user.id, cleanBusinessId, cleanPixelId, cleanToken)
      toast({
        title: 'CAPI Connection Successful',
        description: 'Your Meta CAPI integration is working properly.',
      })
      loadData()
    } catch (error: any) {
      toast({
        title: 'CAPI Connection Failed',
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
        title: 'Missing Fields',
        description: 'Phone Number ID and Access Token are required to test WhatsApp.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingWa(true)
    try {
      const payload = {
        phone_number_id: metaWhatsappPhoneNumberId.trim(),
        access_token: metaWhatsappAccessToken.trim(),
      }

      // Diagnostic Logging
      console.log('--- DEBUG: Meta WhatsApp Test Payload ---', {
        phone_number_id: payload.phone_number_id
          ? '***' + payload.phone_number_id.slice(-4)
          : undefined,
        access_token: payload.access_token ? '***' + payload.access_token.slice(-4) : undefined,
        structure: Object.keys(payload),
      })

      await pb.send('/backend/v1/meta_whatsapp_test', {
        method: 'POST',
        body: payload,
      })

      toast({
        title: 'WhatsApp Connection Successful',
        description: 'Your Meta WhatsApp integration is working properly.',
      })
    } catch (error: any) {
      const errorMsg =
        error.response?.message || error.message || 'Falha de comunicação com Meta WhatsApp'
      const dataStr = error.response?.data ? JSON.stringify(error.response.data) : ''
      let specificError = errorMsg
      if (dataStr.toLowerCase().includes('invalid parameter')) {
        specificError = 'Invalid parameter error. Please check your Phone Number ID and Token.'
      }

      toast({
        title: 'WhatsApp Connection Failed',
        description: specificError,
        variant: 'destructive',
      })
    } finally {
      setIsTestingWa(false)
    }
  }

  const isFormValid =
    metaPixelId.trim() !== '' &&
    metaCapiToken.trim() !== '' &&
    metaWhatsappPhoneNumberId.trim() !== ''

  return (
    <div className="space-y-6 mt-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Facebook className="h-6 w-6 text-primary" />
            <CardTitle>Meta CAPI & WhatsApp Config</CardTitle>
          </div>
          <CardDescription>
            Configure your Meta Conversions API and WhatsApp Cloud API credentials directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Meta Pixel ID <span className="text-destructive">*</span>
              </Label>
              <Input
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value.replace(/\D/g, ''))}
                placeholder="1234567890"
                className={fieldErrors.meta_pixel_id ? 'border-destructive' : ''}
              />
              {fieldErrors.meta_pixel_id && (
                <p className="text-xs text-destructive">{fieldErrors.meta_pixel_id}</p>
              )}
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
              disabled={isTesting || !metaPixelId.trim() || !metaCapiToken.trim()}
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Test CAPI
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
            Save Configuration
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
