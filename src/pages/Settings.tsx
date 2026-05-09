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
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    uazapi_domain: '',
    uazapi_instance_number: '',
    uazapi_token: '',
    uazapi_admin_token: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        uazapi_domain: user.uazapi_domain || '',
        uazapi_instance_number: user.uazapi_instance_number || '',
        uazapi_token: user.uazapi_token || '',
        uazapi_admin_token: user.uazapi_admin_token || '',
      })
    }
  }, [user])

  useEffect(() => {
    // Guarantee that handshake occurs only after the component has fully mounted
    const runInitialTest = async () => {
      if (user?.uazapi_domain && user?.uazapi_instance_number && user?.uazapi_token) {
        await testConnection(
          user.uazapi_domain,
          user.uazapi_instance_number,
          user.uazapi_token,
          user.uazapi_admin_token,
        )
      }
    }

    const timer = setTimeout(() => {
      runInitialTest()
    }, 500)

    return () => clearTimeout(timer)
  }, [
    user?.uazapi_domain,
    user?.uazapi_instance_number,
    user?.uazapi_token,
    user?.uazapi_admin_token,
  ])

  const testConnection = async (
    domain: string,
    instanceNumber: string,
    token: string,
    adminToken: string,
  ) => {
    setTesting(true)
    setErrorMessage('')
    setStatus('connecting')

    try {
      const res = await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain,
          instanceNumber,
          token,
          adminToken,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (res.success) {
        setStatus(res.state)
      } else {
        setStatus('disconnected')
        setErrorMessage(res.error || 'Erro ao conectar com a instância.')
      }
    } catch (err: any) {
      setStatus('disconnected')
      setErrorMessage('Erro na comunicação com o servidor. Verifique o endpoint.')
    } finally {
      setTesting(false)
    }
  }

  const handleTestClick = () => {
    if (!formData.uazapi_domain || !formData.uazapi_instance_number || !formData.uazapi_token) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Preencha o domínio, número da instância e token para testar.',
      })
      return
    }
    testConnection(
      formData.uazapi_domain,
      formData.uazapi_instance_number,
      formData.uazapi_token,
      formData.uazapi_admin_token,
    )
  }

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({
        title: 'Configurações salvas',
        description: 'Suas configurações do Uazapi foram atualizadas com sucesso.',
      })

      if (formData.uazapi_domain && formData.uazapi_instance_number && formData.uazapi_token) {
        testConnection(
          formData.uazapi_domain,
          formData.uazapi_instance_number,
          formData.uazapi_token,
          formData.uazapi_admin_token,
        )
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações. Verifique os dados.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas configurações de conexão com o WhatsApp via Uazapi.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conexão Uazapi</CardTitle>
            <CardDescription>
              Configure os detalhes da sua instância do Uazapi para integrar o WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-lg bg-muted/50 border">
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Status da Conexão</p>
                <div className="flex items-center gap-2 text-sm">
                  {status === 'connecting' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span className="text-blue-500 font-medium">Conectando...</span>
                    </>
                  )}
                  {status === 'connected' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-green-500 font-medium">Conectado e Operacional</span>
                    </>
                  )}
                  {status === 'disconnected' && (
                    <>
                      <XCircle className="w-4 h-4 text-destructive" />
                      <span className="text-destructive font-medium">Desconectado</span>
                    </>
                  )}
                </div>
                {errorMessage && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="leading-snug">{errorMessage}</p>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestClick}
                disabled={testing}
                className="shrink-0 w-full md:w-auto mt-2 md:mt-0"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Testar Conexão
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4">
              <div className="space-y-2">
                <Label htmlFor="uazapi_domain">Domínio do Servidor (Endpoint)</Label>
                <Input
                  id="uazapi_domain"
                  placeholder="https://sua-api.uazapi.com"
                  value={formData.uazapi_domain}
                  onChange={(e) => setFormData({ ...formData, uazapi_domain: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uazapi_instance_number">Número da Instância (DDI+DDD+NÚMERO)</Label>
                <Input
                  id="uazapi_instance_number"
                  placeholder="554899999999"
                  value={formData.uazapi_instance_number}
                  onChange={(e) =>
                    setFormData({ ...formData, uazapi_instance_number: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uazapi_token">Token da Instância</Label>
                <Input
                  id="uazapi_token"
                  type="password"
                  placeholder="Token de acesso"
                  value={formData.uazapi_token}
                  onChange={(e) => setFormData({ ...formData, uazapi_token: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uazapi_admin_token">Admin Token (Opcional)</Label>
                <Input
                  id="uazapi_admin_token"
                  type="password"
                  placeholder="Token administrativo"
                  value={formData.uazapi_admin_token}
                  onChange={(e) => setFormData({ ...formData, uazapi_admin_token: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t p-6">
            <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
