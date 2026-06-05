import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { updateUserIntegrations } from '@/services/integrations'
import { DiagnosticCenter } from '@/components/DiagnosticCenter'
import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [domain, setDomain] = useState(user?.uazapi_domain || '')
  const [instanceId, setInstanceId] = useState(user?.uazapi_instance_number || '')
  const [token, setToken] = useState(user?.uazapi_token || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [status, setStatus] = useState(user?.uazapi_status || 'offline')
  const [errorLog, setErrorLog] = useState(user?.uazapi_error || '')

  useEffect(() => {
    if (user) {
      setDomain(user.uazapi_domain || '')
      setInstanceId(user.uazapi_instance_number || '')
      setToken(user.uazapi_token || '')
      setStatus(user.uazapi_status || 'offline')
      setErrorLog(user.uazapi_error || '')
    }
  }, [user])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setStatus(e.record.uazapi_status || 'offline')
      setErrorLog(e.record.uazapi_error || '')
    }
  })

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await updateUserIntegrations(user.id, {
        uazapi_domain: domain,
        uazapi_instance_number: instanceId,
        uazapi_token: token,
      })
      toast({
        title: 'Configurações salvas',
        description: 'As credenciais do Uazapi foram atualizadas.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      await pb.send('/backend/v1/uazapi/status', { method: 'GET' })
      toast({
        title: 'Teste de conexão enviado',
        description: 'Status atualizado com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Falha no teste',
        description: error.message || 'Não foi possível conectar ao Uazapi.',
        variant: 'destructive',
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-300">
      <h1 className="text-3xl font-bold mb-6">Configurações de Integração</h1>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-border shadow-elevation">
          <CardHeader>
            <CardTitle>Credenciais Uazapi</CardTitle>
            <CardDescription>
              Gerencie a conexão com sua instância do WhatsApp via Uazapi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domínio Uazapi</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="https://sua-instancia.uazapi.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceId">Número da Instância</Label>
              <Input
                id="instanceId"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="5548992098050"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token da API</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Seu token de acesso"
              />
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-elevation">
          <CardHeader>
            <CardTitle>Status da Conexão</CardTitle>
            <CardDescription>Status em tempo real da conexão com o Uazapi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-muted/20 gap-4">
              <div className="flex items-center gap-3">
                {status === 'online' ? (
                  <div className="p-2 bg-green-500/10 rounded-full shrink-0">
                    <Wifi className="h-6 w-6 text-green-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-destructive/10 rounded-full shrink-0">
                    <WifiOff className="h-6 w-6 text-destructive" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <h3 className="font-semibold capitalize">
                    {status === 'qr_ready' ? 'Aguardando QR Code' : status}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {status === 'online'
                      ? 'Conectado e operante'
                      : 'Instância desconectada ou com erro'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="shrink-0 w-full sm:w-auto"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Verificar Status
              </Button>
            </div>

            {errorLog && status !== 'online' && (
              <div className="space-y-2">
                <Label className="text-destructive font-semibold flex items-center gap-2">
                  Logs de Erro Recentes
                </Label>
                <div className="p-3 border border-destructive/20 bg-destructive/5 rounded-md text-sm font-mono text-destructive break-words whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {errorLog}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <DiagnosticCenter />
      </div>
    </div>
  )
}
