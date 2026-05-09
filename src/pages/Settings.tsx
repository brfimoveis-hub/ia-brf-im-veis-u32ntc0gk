import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

export default function Settings() {
  const { user } = useAuth()

  const [domain, setDomain] = useState('https://iabrfimveis.uazapi.com')
  const [token, setToken] = useState('')
  const [phone, setPhone] = useState('5548992098050')

  const [status, setStatus] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    if (user) {
      if (user.uazapi_domain) setDomain(user.uazapi_domain)
      if (user.uazapi_token) setToken(user.uazapi_token)
      if (user.meta_campaign_phone) setPhone(user.meta_campaign_phone)
      setStatus(user.uazapi_status || '')
      setErrorMsg(user.uazapi_error || '')
    }
  }, [user])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setStatus(e.record.uazapi_status || '')
      setErrorMsg(e.record.uazapi_error || '')
    }
  })

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        uazapi_domain: domain,
        uazapi_token: token,
        meta_campaign_phone: phone,
      })
      toast.success('Configurações salvas com sucesso')
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      if (!user) return

      await pb.collection('users').update(user.id, {
        uazapi_domain: domain,
        uazapi_token: token,
        meta_campaign_phone: phone,
      })

      await pb.send('/backend/v1/uazapi-test-connection', {
        method: 'POST',
        body: JSON.stringify({ phone }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast.success('Conexão estabelecida com sucesso!')
    } catch (error: any) {
      const msg = error?.response?.message || error?.message || 'Erro ao testar conexão'
      toast.error(msg)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Uazapi</CardTitle>
          <CardDescription>Gerencie as credenciais de integração com a API Uazapi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domínio Uazapi</Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="https://iabrfimveis.uazapi.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">Admin Token</Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Insira o seu token"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Número da Instância (WhatsApp)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5548992098050"
            />
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted flex flex-col gap-2">
            <h3 className="font-medium text-sm text-muted-foreground mb-1">Status da Conexão</h3>
            <div className="flex items-center gap-2">
              {status === 'online' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Online</span>
                </div>
              ) : status === 'error' ? (
                <div className="flex flex-col gap-1 text-red-600">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">Erro</span>
                  </div>
                  {errorMsg && <p className="text-sm mt-1">{errorMsg}</p>}
                </div>
              ) : (
                <div className="text-muted-foreground font-medium">Não testado / Desconhecido</div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
          <Button onClick={handleTestConnection} disabled={isTesting || !domain || !token}>
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Testar Conexão
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
