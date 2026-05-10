import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export function SettingsUazapi() {
  const { user } = useAuth()
  const [uazapiStatus, setUazapiStatus] = useState<'checking' | 'connected' | 'disconnected'>(
    'checking',
  )
  const [uazapiToken, setUazapiToken] = useState(user?.uazapi_token || '')
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
        if (isMounted) setUazapiStatus('checking')
        // Call Uazapi endpoint with fixed instance
        const res = await fetch(
          `https://iabrfimveis.uazapi.com/instance/connectionState/5548992098050`,
          {
            headers: {
              apikey: uazapiToken,
            },
          },
        )
        const data = await res.json()
        if (isMounted) {
          if (data?.instance?.state === 'open') {
            setUazapiStatus('connected')
          } else {
            setUazapiStatus('disconnected')
          }
        }
      } catch (e) {
        if (isMounted) setUazapiStatus('disconnected')
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
        uazapi_instance_number: '5548992098050',
        uazapi_domain: 'https://iabrfimveis.uazapi.com',
      })
      toast.success('Configurações Uazapi salvas com sucesso')
      // Trigger effect by briefly unsetting if the value didn't change,
      // but usually the user changes it or it triggers anyway on load
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
                <XCircle className="h-4 w-4 mr-2" /> Desconectado / Instância não encontrada
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Instância WhatsApp (Fixo)</Label>
            <Input value="5548992098050" disabled className="bg-muted/50" />
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
