import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Activity } from 'lucide-react'

export function SettingsUazapi() {
  const { user } = useAuth()
  const [uazapiStatus, setUazapiStatus] = useState<'checking' | 'connected' | 'disconnected'>(
    'checking',
  )
  const [uazapiToken, setUazapiToken] = useState(user?.uazapi_token || '')
  const [uazapiErrorDetail, setUazapiErrorDetail] = useState(user?.uazapi_error || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isTroubleshooting, setIsTroubleshooting] = useState(false)
  const [troubleshootLogs, setTroubleshootLogs] = useState<
    { step: string; status: 'pending' | 'success' | 'error'; message: string }[]
  >([])

  const INSTANCE_NUMBER = '554892098050'
  const DOMAIN = 'https://iabrfimveis.uazapi.com'

  const checkConnection = async () => {
    setUazapiStatus('checking')
    setUazapiErrorDetail('')
    try {
      const data = await pb.send(`/backend/v1/uazapi/status/${INSTANCE_NUMBER}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (data?.instance?.state === 'open') {
        setUazapiStatus('connected')
        setUazapiErrorDetail('')
      } else {
        setUazapiStatus('disconnected')
        const errorMsg =
          data?.message ||
          data?.error ||
          (data?.statusCode === 401
            ? 'Token inválido/Unauthorized (Erro 401)'
            : data?.statusCode === 404
              ? 'Instância não encontrada (Erro 404)'
              : 'Instância desconectada.')
        setUazapiErrorDetail(errorMsg)
      }
    } catch (e: any) {
      setUazapiStatus('disconnected')
      setUazapiErrorDetail(e.message || 'Falha na comunicação com o Proxy Uazapi.')
    }
  }

  useEffect(() => {
    if (user && !uazapiToken) {
      setUazapiToken(user.uazapi_token || '')
    }
    checkConnection()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        uazapi_token: uazapiToken,
        uazapi_instance_number: INSTANCE_NUMBER,
        uazapi_domain: DOMAIN,
        uazapi_error: uazapiErrorDetail,
      })
      toast.success('Configurações Uazapi salvas com sucesso')
      checkConnection()
    } catch (e) {
      toast.error('Erro ao salvar integrações Uazapi')
    } finally {
      setIsSaving(false)
    }
  }

  const runTroubleshooting = async () => {
    setIsTroubleshooting(true)
    const logs: { step: string; status: 'pending' | 'success' | 'error'; message: string }[] = []

    logs.push({
      step: 'Iniciando Diagnóstico Back-to-Back (Port 443)',
      status: 'pending',
      message: 'Buscando estado da instância e webhooks via servidor...',
    })
    setTroubleshootLogs([...logs])

    try {
      const data = await pb.send(`/backend/v1/uazapi/diagnostics/${INSTANCE_NUMBER}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (data.proxy?.statusCode === 200 && !data.proxy?.data?.error) {
        logs[0] = {
          step: 'Conectividade e SSL (Gateway)',
          status: 'success',
          message: 'Domínio alcançável na porta 443 e SSL validado.',
        }
      } else {
        logs[0] = {
          step: 'Conectividade e SSL (Gateway)',
          status: 'error',
          message: `Erro HTTP ${data.proxy?.statusCode}. Verifique as permissões de rede.`,
        }
      }

      const stateData = data.state?.data
      if (stateData?.instance?.state === 'open') {
        logs.push({
          step: 'Estado da Instância',
          status: 'success',
          message: `Instância ${INSTANCE_NUMBER} está online e aberta.`,
        })
      } else {
        logs.push({
          step: 'Estado da Instância',
          status: 'error',
          message: `Instância não está open. Estado: ${stateData?.instance?.state || 'desconhecido'}`,
        })
      }

      const whData = data.webhook?.data
      if (whData && whData.url) {
        logs.push({
          step: 'Verificação de Webhook',
          status: 'success',
          message: `Webhook configurado e apontando para ${whData.url}`,
        })
      } else if (whData && whData.webhooks && whData.webhooks.length > 0) {
        logs.push({
          step: 'Verificação de Webhook',
          status: 'success',
          message: 'Webhooks configurados corretamente (multi).',
        })
      } else {
        logs.push({
          step: 'Verificação de Webhook',
          status: 'warning',
          message:
            'Nenhum webhook ativo encontrado na instância. A comunicação bidirecional não funcionará.',
        })
      }
    } catch (e: any) {
      logs[0] = {
        step: 'Diagnóstico Back-to-Back Falhou',
        status: 'error',
        message: `Falha na execução: ${e.message}`,
      }
    }

    setTroubleshootLogs([...logs])
    setIsTroubleshooting(false)
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Conexão Uazapi</CardTitle>
          <CardDescription>
            Configure a integração com o WhatsApp via Uazapi (Golden Version).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <div className="flex items-center space-x-2 bg-muted/40 border px-4 py-2.5 rounded-lg">
              <span className="text-sm font-medium text-foreground">Uazapi Status:</span>
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

            <div className="flex items-center space-x-2 bg-muted/40 border px-4 py-2.5 rounded-lg">
              <span className="text-sm font-medium text-foreground">CRM Sync:</span>
              <span className="flex items-center text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Ativo
              </span>
            </div>

            <div className="flex items-center space-x-2 bg-muted/40 border px-4 py-2.5 rounded-lg">
              <span className="text-sm font-medium text-foreground">Slack Notificações:</span>
              <span className="flex items-center text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4 mr-2" /> #leads-sc
              </span>
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
              <Input value={INSTANCE_NUMBER} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>Endpoint Uazapi (Fixo)</Label>
              <Input value={DOMAIN} disabled className="bg-muted/50" />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="uazapiToken">Token de Acesso (API Key da Instância)</Label>
            <Input
              id="uazapiToken"
              value={uazapiToken}
              onChange={(e) => setUazapiToken(e.target.value)}
              type="password"
              placeholder="Insira a API Key da sua instância"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar e Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm border-l-4 border-l-amber-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Diagnóstico Técnico (Troubleshooting)</CardTitle>
          </div>
          <CardDescription>
            Execute uma verificação profunda para validar conectividade, SSL e Webhook usando o
            proxy do servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runTroubleshooting}
            disabled={isTroubleshooting}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {isTroubleshooting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Activity className="mr-2 h-4 w-4" />
            )}
            Rodar Diagnóstico Completo
          </Button>

          {troubleshootLogs.length > 0 && (
            <div className="mt-4 space-y-3 p-4 bg-muted/30 rounded-lg border">
              {troubleshootLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  {log.status === 'pending' && (
                    <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-muted-foreground shrink-0" />
                  )}
                  {log.status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  )}
                  {log.status === 'error' && (
                    <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{log.step}</p>
                    <p className="text-muted-foreground">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
