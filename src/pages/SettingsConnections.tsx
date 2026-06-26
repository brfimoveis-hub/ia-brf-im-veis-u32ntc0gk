import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, PowerOff, QrCode, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

export default function SettingsConnections() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [userData, setUserData] = useState<any>(user)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    uazapi_domain: '',
    uazapi_token: '',
    uazapi_admin_token: '',
    uazapi_instance_number: '',
  })

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        try {
          const data = await pb.collection('users').getOne(user.id)
          setUserData(data)
          setFormData({
            uazapi_domain: data.uazapi_domain || '',
            uazapi_token: data.uazapi_token || '',
            uazapi_admin_token: data.uazapi_admin_token || '',
            uazapi_instance_number: data.uazapi_instance_number || '',
          })
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
    }
    loadData()
  }, [user?.id])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setUserData((prev: any) => ({ ...prev, ...e.record }))
    }
  })

  const handleSaveConfig = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({ title: 'Configurações salvas com sucesso!' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (action: string, path: string) => {
    setLoadingAction(action)
    setQrCode(null)
    try {
      const res = await pb.send(path, { method: 'POST' })
      toast({ title: 'Ação executada com sucesso' })
      if (res?.qrcode || res?.base64) {
        setQrCode(res.qrcode || res.base64)
      } else if (res?.qr) {
        setQrCode(res.qr)
      }
    } catch (err: any) {
      toast({ title: 'Erro na ação', description: err.message, variant: 'destructive' })
    } finally {
      setLoadingAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const status = userData?.uazapi_status?.toLowerCase() || 'disconnected'
  const isConnected = status === 'connected' || status === 'open'
  const isConnecting = status === 'connecting'
  const isError = status === 'error' || status === 'falha'

  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-fade-in-up mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conexões UAZAPI</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie sua conexão do WhatsApp e configurações de API.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status da Instância</CardTitle>
          <CardDescription>
            Acompanhe o estado da sua conexão com o WhatsApp em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-sm text-foreground/80">Status atual:</span>
            <Badge
              variant="outline"
              className={cn(
                'px-3 py-1 font-semibold',
                isConnected &&
                  'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400',
                isConnecting &&
                  'border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
                isError && 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400',
                !isConnected &&
                  !isConnecting &&
                  !isError &&
                  'border-gray-500 bg-gray-500/10 text-gray-700 dark:text-gray-400',
              )}
            >
              {isConnected && <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              {isConnecting && <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />}
              {isError && <AlertCircle className="w-4 h-4 mr-1.5" />}
              {!isConnected && !isConnecting && !isError && <PowerOff className="w-4 h-4 mr-1.5" />}

              {userData?.uazapi_status ? userData.uazapi_status.toUpperCase() : 'DESCONECTADO'}
            </Badge>
          </div>

          {userData?.uazapi_error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro na Integração</AlertTitle>
              <AlertDescription>{userData.uazapi_error}</AlertDescription>
            </Alert>
          )}

          {qrCode && (
            <div className="mt-4 p-6 border rounded-lg flex flex-col items-center space-y-4 bg-muted/20">
              <p className="font-medium text-center">
                Leia o QR Code abaixo no seu WhatsApp (Aparelhos Conectados):
              </p>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                {qrCode.startsWith('data:image') ? (
                  <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
                ) : (
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 object-contain"
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 bg-muted/30 py-4 border-t">
          <Button
            variant="default"
            onClick={() => handleAction('connect', '/backend/v1/uazapi/connect')}
            disabled={!!loadingAction || isConnected}
            className="flex-1 sm:flex-none"
          >
            {loadingAction === 'connect' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4 mr-2" />
            )}
            Conectar / QR Code
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleAction('disconnect', '/backend/v1/uazapi/disconnect')}
            disabled={!!loadingAction || (!isConnected && status !== 'qrcode')}
            className="flex-1 sm:flex-none"
          >
            {loadingAction === 'disconnect' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PowerOff className="w-4 h-4 mr-2" />
            )}
            Desconectar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAction('restart', '/backend/v1/uazapi/restart')}
            disabled={!!loadingAction}
            className="flex-1 sm:flex-none bg-background"
          >
            {loadingAction === 'restart' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Reiniciar
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleAction('resync', '/backend/v1/uazapi/resync')}
            disabled={!!loadingAction || !isConnected}
            className="flex-1 sm:flex-none"
          >
            {loadingAction === 'resync' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Ressincronizar
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Acesso</CardTitle>
          <CardDescription>
            Preencha os dados da sua instância UAZAPI para permitir a comunicação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="uazapi_domain" className="text-foreground/80">
                Domínio / URL da API
              </Label>
              <Input
                id="uazapi_domain"
                value={formData.uazapi_domain}
                onChange={(e) => setFormData((p) => ({ ...p, uazapi_domain: e.target.value }))}
                placeholder="ex: https://api.uazapi.com"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uazapi_instance_number" className="text-foreground/80">
                Número / Nome da Instância
              </Label>
              <Input
                id="uazapi_instance_number"
                value={formData.uazapi_instance_number}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, uazapi_instance_number: e.target.value }))
                }
                placeholder="ex: 5511999999999"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uazapi_token" className="text-foreground/80">
                Token da Instância (Global)
              </Label>
              <Input
                id="uazapi_token"
                type="password"
                value={formData.uazapi_token}
                onChange={(e) => setFormData((p) => ({ ...p, uazapi_token: e.target.value }))}
                placeholder="Insira o Token JWT"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uazapi_admin_token" className="text-foreground/80">
                Admin Token / API Key
              </Label>
              <Input
                id="uazapi_admin_token"
                type="password"
                value={formData.uazapi_admin_token}
                onChange={(e) => setFormData((p) => ({ ...p, uazapi_admin_token: e.target.value }))}
                placeholder="Insira a API Key ou Global Token"
                className="bg-background"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 py-4 border-t flex justify-end">
          <Button onClick={handleSaveConfig} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
