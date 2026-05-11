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

  const ADMIN_TOKEN = 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'
  const INSTANCE_NUMBER = '554892098050'
  const DOMAIN = 'https://iabrfimveis.uazapi.com'

  const checkConnection = async (tokenToCheck: string) => {
    if (!tokenToCheck) {
      setUazapiStatus('disconnected')
      return
    }
    setUazapiStatus('checking')
    setUazapiErrorDetail('')
    try {
      const res = await fetch(`${DOMAIN}/instance/connectionState/${INSTANCE_NUMBER}`, {
        headers: { apikey: tokenToCheck },
      })
      const data = await res.json()
      if (res.ok && data?.instance?.state === 'open') {
        setUazapiStatus('connected')
        setUazapiErrorDetail('')
      } else {
        setUazapiStatus('disconnected')
        const errorMsg =
          data?.message ||
          data?.error ||
          (res.status === 401
            ? 'Token inválido (Erro 401)'
            : res.status === 404
              ? 'Instância não encontrada (Erro 404)'
              : res.status === 504
                ? 'Gateway Timeout (Erro 504)'
                : 'Instância desconectada.')
        setUazapiErrorDetail(errorMsg)
      }
    } catch (e: any) {
      setUazapiStatus('disconnected')
      setUazapiErrorDetail(e.message || 'Falha na comunicação com a API.')
    }
  }

  useEffect(() => {
    checkConnection(uazapiToken)
  }, [uazapiToken])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        uazapi_token: uazapiToken,
        uazapi_admin_token: ADMIN_TOKEN,
        uazapi_instance_number: INSTANCE_NUMBER,
        uazapi_domain: DOMAIN,
        uazapi_error: uazapiErrorDetail,
      })
      toast.success('Configurações Uazapi salvas com sucesso')
      checkConnection(uazapiToken)
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
      step: 'Verificação de URL e SSL',
      status: 'pending',
      message: 'Verificando conectividade básica com o domínio...',
    })
    setTroubleshootLogs([...logs])
    try {
      const res = await fetch(`${DOMAIN}/instance/fetchInstances`, {
        headers: { apikey: ADMIN_TOKEN },
      })
      if (res.ok) {
        logs[0] = {
          step: 'Verificação de URL e SSL',
          status: 'success',
          message: 'Domínio alcançável e SSL válido.',
        }
      } else {
        logs[0] = {
          step: 'Verificação de URL e SSL',
          status: 'error',
          message: `Erro HTTP ${res.status}: Verifique se o Admin Token é válido ou se há erro 504.`,
        }
      }
    } catch (e: any) {
      logs[0] = {
        step: 'Verificação de URL e SSL',
        status: 'error',
        message: `Falha de rede: ${e.message}. Possível erro 502/504 ou problema de SSL.`,
      }
    }
    setTroubleshootLogs([...logs])

    logs.push({
      step: 'Verificação de Instância',
      status: 'pending',
      message: `Buscando estado da instância ${INSTANCE_NUMBER}...`,
    })
    setTroubleshootLogs([...logs])
    if (!uazapiToken) {
      logs[1] = {
        step: 'Verificação de Instância',
        status: 'error',
        message: 'API Key (Token) não fornecida. Insira a API Key para verificar.',
      }
    } else {
      try {
        const res = await fetch(`${DOMAIN}/instance/connectionState/${INSTANCE_NUMBER}`, {
          headers: { apikey: uazapiToken },
        })
        const data = await res.json()
        if (res.ok) {
          if (data?.instance?.state === 'open') {
            logs[1] = {
              step: 'Verificação de Instância',
              status: 'success',
              message: 'Instância online e estado open.',
            }
          } else {
            logs[1] = {
              step: 'Verificação de Instância',
              status: 'error',
              message: `Instância não está open. Estado: ${data?.instance?.state || 'desconhecido'}`,
            }
          }
        } else {
          let errMsg = `Erro HTTP ${res.status}. `
          if (res.status === 401) errMsg += 'Unauthorized (Token Inválido).'
          else if (res.status === 404) errMsg += 'Not Found. A instância não foi encontrada.'
          logs[1] = { step: 'Verificação de Instância', status: 'error', message: errMsg }
        }
      } catch (e: any) {
        logs[1] = {
          step: 'Verificação de Instância',
          status: 'error',
          message: `Erro de rede: ${e.message}`,
        }
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

          <div className="space-y-2">
            <Label>Admin Token (Fixo)</Label>
            <Input value={ADMIN_TOKEN} disabled type="password" className="bg-muted/50" />
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
            Execute uma verificação profunda para validar conectividade e SSL baseada no Guia
            Técnico.
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
