import { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Wifi, WifiOff } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)

  const [formData, setFormData] = useState({
    domain: '',
    adminToken: '',
    token: '',
    instanceNumber: '',
  })

  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'unknown'>(
    'unknown',
  )
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        domain: user.uazapi_domain || 'https://iabrfimveis.uazapi.com',
        adminToken: user.uazapi_admin_token || '',
        token: user.uazapi_token || '',
        instanceNumber: user.uazapi_instance_number || '5548992098050',
      })
      if (user.uazapi_status === 'Connected') setStatus('connected')
      else if (user.uazapi_status === 'Connecting') setStatus('connecting')
      else if (user.uazapi_status === 'Disconnected') setStatus('disconnected')

      setErrorMsg(user.uazapi_error || '')
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    if (!formData.domain || !formData.token || !formData.instanceNumber) {
      toast({
        title: 'Atenção',
        description: 'Preencha o domínio, token e número da instância.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await pb.collection('users').update(user!.id, {
        uazapi_domain: formData.domain,
        uazapi_admin_token: formData.adminToken,
        uazapi_token: formData.token,
        uazapi_instance_number: formData.instanceNumber,
      })

      await pb.collection('users').authRefresh()
      toast({
        title: 'Configurações salvas',
        description: 'Credenciais atualizadas com sucesso. Testando conexão...',
      })

      await testConnection()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setErrorMsg('')
    let currentStatus = 'disconnected'
    let currentError = ''

    try {
      const res = await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: formData.domain,
          token: formData.token,
          adminToken: formData.adminToken,
          instanceNumber: formData.instanceNumber,
        }),
      })

      if (res.success) {
        currentStatus = res.state
        setStatus(res.state as any)
        toast({ title: 'Conexão Estabelecida', description: 'Instância conectada com sucesso.' })
      } else {
        currentStatus = 'disconnected'
        currentError = res.error || 'Erro desconhecido'
        setStatus('disconnected')
        setErrorMsg(currentError)
        toast({ title: 'Falha na conexão', description: currentError, variant: 'destructive' })
      }
    } catch (err: any) {
      currentStatus = 'disconnected'
      currentError = 'Erro ao tentar conectar com a API'
      setStatus('disconnected')
      setErrorMsg(currentError)
      toast({ title: 'Erro', description: currentError, variant: 'destructive' })
    } finally {
      setTesting(false)
    }

    try {
      const mappedStatus =
        currentStatus === 'connected'
          ? 'Connected'
          : currentStatus === 'connecting'
            ? 'Connecting'
            : 'Disconnected'

      await pb.collection('users').update(user!.id, {
        uazapi_status: mappedStatus,
        uazapi_error: currentError,
      })
      await pb.collection('users').authRefresh()
    } catch (err) {
      console.error('Error saving connection status', err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações da IA</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as integrações e parâmetros de operação da sua Inteligência Artificial.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Integração Uazapi (WhatsApp)</CardTitle>
              <CardDescription>
                Configure as credenciais da API para envio e recebimento de mensagens.
              </CardDescription>
            </div>
            {status === 'connected' && (
              <Badge className="bg-green-500 hover:bg-green-600 gap-1.5">
                <Wifi className="h-3.5 w-3.5" /> Conectado
              </Badge>
            )}
            {status === 'connecting' && (
              <Badge
                variant="outline"
                className="text-amber-500 border-amber-500/20 bg-amber-500/10 gap-1.5"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando
              </Badge>
            )}
            {status === 'disconnected' && (
              <Badge variant="destructive" className="gap-1.5">
                <WifiOff className="h-3.5 w-3.5" /> Desconectado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domínio da API</Label>
              <Input
                id="domain"
                name="domain"
                placeholder="Ex: https://iabrfimveis.uazapi.com"
                value={formData.domain}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instanceNumber">Número da Instância</Label>
              <Input
                id="instanceNumber"
                name="instanceNumber"
                placeholder="Ex: 5548992098050"
                value={formData.instanceNumber}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminToken">Admin Token</Label>
                <Input
                  id="adminToken"
                  name="adminToken"
                  type="password"
                  placeholder="Token Administrativo"
                  value={formData.adminToken}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">Instance Token</Label>
                <Input
                  id="token"
                  name="token"
                  type="password"
                  placeholder="Token da Instância"
                  value={formData.token}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() =>
              setFormData({
                domain: user?.uazapi_domain || 'https://iabrfimveis.uazapi.com',
                adminToken: user?.uazapi_admin_token || '',
                token: user?.uazapi_token || '',
                instanceNumber: user?.uazapi_instance_number || '5548992098050',
              })
            }
            disabled={loading || testing}
          >
            Descartar
          </Button>
          <Button onClick={handleSave} disabled={loading || testing} className="gap-2">
            {loading || testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar e Conectar
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
