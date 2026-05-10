import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export function SettingsUazapi() {
  const { user } = useAuth()
  const [uazapiStatus, setUazapiStatus] = useState<'checking' | 'connected' | 'disconnected'>(
    'checking',
  )
  const [uazapiToken, setUazapiToken] = useState(user?.uazapi_token || '')
  const [uazapiErrorDetail, setUazapiErrorDetail] = useState(user?.uazapi_error || '')
  const [isSaving, setIsSaving] = useState(false)

  // Connection Guard: validation fires automatically on mount or when token updates
  useEffect(() => {
    let isMounted = true
    const checkConnection = async () => {
      if (!uazapiToken) {
        if (isMounted) setUazapiStatus('disconnected')
        return
      }
      try {
        if (isMounted) {
          setUazapiStatus('checking')
          setUazapiErrorDetail('')
        }
        const res = await fetch(
          `https://iabrfimveis.uazapi.com/instance/connectionState/554892098050`,
          {
            headers: {
              apikey: uazapiToken,
            },
          },
        )
        const data = await res.json()
        if (isMounted) {
          if (res.ok && data?.instance?.state === 'open') {
            setUazapiStatus('connected')
            setUazapiErrorDetail('')
          } else {
            setUazapiStatus('disconnected')
            const errorMsg =
              data?.message ||
              data?.error ||
              (res.status === 401 ? 'Token inválido' : 'Instância desconectada ou não encontrada.')
            setUazapiErrorDetail(errorMsg)
          }
        }
      } catch (e: any) {
        if (isMounted) {
          setUazapiStatus('disconnected')
          setUazapiErrorDetail(e.message || 'Falha na comunicação com a API.')
        }
      }
    }

    checkConnection()
    return () => {
      isMounted = false
    }
  }, [uazapiToken])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        uazapi_token: uazapiToken,
        uazapi_admin_token: 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj',
        uazapi_instance_number: '554892098050',
        uazapi_domain: 'https://iabrfimveis.uazapi.com',
        uazapi_error: uazapiErrorDetail,
      })
      toast.success('Configurações Uazapi salvas com sucesso')
      setUazapiToken(uazapiToken)
    } catch (e) {
      toast.error('Erro ao salvar integrações Uazapi')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle>Conexão Uazapi</CardTitle>
        <CardDescription>Configure a integração com o WhatsApp via Uazapi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4 mb-2">
          <div className="flex items-center space-x-2 bg-muted/40 border px-4 py-2.5 rounded-lg">
            <span className="text-sm font-medium text-foreground">Status da Instância:</span>
            {uazapiStatus === 'checking' && (
              <span className="flex items-center text-muted-foreground font-medium">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verificando...
              </span>
            )}
            {uazapiStatus === 'connected' && (
              <span className="flex items-center text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Conectado
              </span>
            )}
            {uazapiStatus === 'disconnected' && (
              <span className="flex items-center text-destructive font-medium">
                <XCircle className="h-4 w-4 mr-2" /> Desconectado
              </span>
            )}
          </div>
        </div>

        {uazapiStatus === 'disconnected' && uazapiErrorDetail && (
          <div className="flex items-start p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
            <AlertTriangle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Falha na conexão</p>
              <p className="text-sm opacity-90">{uazapiErrorDetail}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Instância WhatsApp (Fixo)</Label>
            <Input value="554892098050" disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>Endpoint Uazapi (Fixo)</Label>
            <Input value="https://iabrfimveis.uazapi.com" disabled className="bg-muted/50" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="uazapiToken">Token de Acesso (API Key)</Label>
          <Input
            id="uazapiToken"
            value={uazapiToken}
            onChange={(e) => setUazapiToken(e.target.value)}
            type="password"
            placeholder="Insira a API Key da sua instância"
          />
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar e Testar Conexão
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
