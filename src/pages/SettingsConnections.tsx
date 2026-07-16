import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, RefreshCw, CheckCircle2, BarChart, AlertCircle, Plug } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { createSystemLog } from '@/services/system_logs'
import ChavesNaMao from '@/pages/SettingsConnections/ChavesNaMao'
import { MetaWhatsAppPanel } from '@/pages/SettingsConnections/MetaWhatsAppPanel'
import { DiagnosticCenter } from '@/components/DiagnosticCenter'

function StatusBanner({ type, message }: { type: 'error' | 'success'; message: string }) {
  if (type === 'success') {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700">Conectado</AlertTitle>
        <AlertDescription className="text-green-600">{message}</AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Status de Erro</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function MetaCapiPanel() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pixelId, setPixelId] = useState(user?.meta_pixel_id || user?.meta_dataset_id || '')
  const [capiToken, setCapiToken] = useState(user?.meta_capi_token || '')
  const [businessId, setBusinessId] = useState(user?.meta_whatsapp_business_id || '')
  const [status, setStatus] = useState(user?.meta_capi_status || 'disconnected')
  const [errorMsg, setErrorMsg] = useState(user?.meta_capi_error || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    const newStatus = e.record.meta_capi_status || 'disconnected'
    const newError = e.record.meta_capi_error || ''
    setStatus((prev) => (prev !== newStatus ? newStatus : prev))
    setErrorMsg((prev) => (prev !== newError ? newError : prev))
  })

  const handleSave = useCallback(async () => {
    if (!user) return
    const cleanPixelId = pixelId.replace(/\D/g, '').trim()
    const cleanBusinessId = businessId.replace(/\D/g, '').trim()
    if (cleanPixelId && (cleanPixelId.length < 10 || cleanPixelId.length > 20)) {
      toast({
        variant: 'destructive',
        title: 'ID inválido',
        description: 'O Dataset/Pixel ID deve ter entre 10 e 20 dígitos.',
      })
      return
    }
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        meta_pixel_id: cleanPixelId,
        meta_dataset_id: cleanPixelId,
        meta_capi_token: capiToken.trim(),
        meta_whatsapp_business_id: cleanBusinessId,
      })
      toast({
        title: 'Configurações salvas',
        description: 'As credenciais do Meta CAPI foram atualizadas.',
      })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    } finally {
      setIsSaving(false)
    }
  }, [user, pixelId, capiToken, businessId, toast])

  const handleTestConnection = useCallback(async () => {
    if (!user) return
    const cleanPixelId = pixelId.replace(/\D/g, '').trim()
    const cleanBusinessId = businessId.replace(/\D/g, '').trim()
    if (!cleanPixelId || !capiToken.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Dataset ID e Token de Acesso são obrigatórios para o teste.',
      })
      return
    }
    if (cleanPixelId.length < 10 || cleanPixelId.length > 20) {
      toast({
        variant: 'destructive',
        title: 'ID inválido',
        description: 'O Dataset/Pixel ID deve ter entre 10 e 20 dígitos.',
      })
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      await pb.collection('users').update(user.id, {
        meta_pixel_id: cleanPixelId,
        meta_dataset_id: cleanPixelId,
        meta_capi_token: capiToken.trim(),
        meta_whatsapp_business_id: cleanBusinessId,
      })
      const res = await pb.send('/backend/v1/meta_capi_test_connection', {
        method: 'POST',
        body: JSON.stringify({
          pixel_id: cleanPixelId,
          access_token: capiToken.trim(),
          business_id: cleanBusinessId,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.success) {
        setStatus('connected')
        setErrorMsg('')
        setTestResult({
          success: true,
          message: 'A comunicação com a Meta API está funcionando perfeitamente.',
        })
        toast({
          title: 'Conexão bem-sucedida',
          description: 'A comunicação com a Meta API está funcionando perfeitamente.',
        })
      } else {
        const msg = res.error?.message || 'Erro ao testar a conexão.'
        setTestResult({ success: false, message: msg })
        toast({ variant: 'destructive', title: 'Falha na conexão', description: msg })
      }
    } catch (err: any) {
      const msg =
        err?.response?.error?.message ||
        err?.response?.message ||
        err?.message ||
        'Erro ao testar a conexão'
      setStatus('error')
      setErrorMsg(msg)
      setTestResult({ success: false, message: msg })
      toast({ variant: 'destructive', title: 'Falha na conexão', description: msg })
    } finally {
      setIsTesting(false)
    }
  }, [user, pixelId, capiToken, businessId, toast])

  const isConnected = status.toLowerCase() === 'connected' || status.toLowerCase() === 'active'

  if (!user) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardContent className="py-10 text-center text-muted-foreground">
          Carregando dados do usuário...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Meta Conversions API</CardTitle>
          </div>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={
              isConnected ? 'bg-green-500 hover:bg-green-600 text-sm py-1' : 'text-sm py-1'
            }
          >
            {isConnected ? 'Conectado' : status || 'Desconectado'}
          </Badge>
        </div>
        <CardDescription className="pt-2">
          Integre o Pixel e a API de Conversões para rastreamento de eventos offline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {(isConnected || errorMsg) && (
          <StatusBanner
            key={errorMsg ? 'meta-error-banner' : 'meta-success-banner'}
            type={errorMsg ? 'error' : 'success'}
            message={errorMsg || 'A comunicação com a Meta API está funcionando perfeitamente.'}
          />
        )}

        {testResult && (
          <Alert
            key={testResult.success ? 'meta-test-success' : 'meta-test-error'}
            variant={testResult.success ? 'default' : 'destructive'}
            className={testResult.success ? 'border-green-500/50 bg-green-500/10' : ''}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{testResult.success ? 'Teste Bem-sucedido' : 'Falha no Teste'}</AlertTitle>
            <AlertDescription>{testResult.message}</AlertDescription>
            {!testResult.success ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="mt-3"
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Tentar Novamente
              </Button>
            ) : null}
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="meta_business_id">Business ID</Label>
            <Input
              id="meta_business_id"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="ID do Gerenciador de Negócios"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_pixel_id">ID do Pixel (Dataset ID)</Label>
            <Input
              id="meta_pixel_id"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value.replace(/\D/g, ''))}
              placeholder="1093869151209421"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="meta_capi_token">Token de Acesso (CAPI)</Label>
            <Input
              id="meta_capi_token"
              type="password"
              value={capiToken}
              onChange={(e) => setCapiToken(e.target.value)}
              placeholder="EAA..."
            />
          </div>
        </div>

        <div className="pt-6 border-t flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar Meta CAPI
          </Button>
          <Button
            onClick={handleTestConnection}
            disabled={isTesting}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsConnections() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Conexões</h2>
          <p className="text-muted-foreground mt-2">
            Monitore e configure integrações de API externas necessárias para o CRM.
          </p>
        </div>
      </div>
      <div className="grid gap-8">
        <ErrorBoundary key="meta-capi-panel-boundary" fallback={null}>
          <MetaCapiPanel />
        </ErrorBoundary>
        <ErrorBoundary key="chaves-na-mao-panel-boundary" fallback={null}>
          <ChavesNaMao />
        </ErrorBoundary>
        <ErrorBoundary key="meta-whatsapp-panel-boundary" fallback={null}>
          <MetaWhatsAppPanel />
        </ErrorBoundary>
      </div>

      <ErrorBoundary key="diagnostic-center-boundary" fallback={null}>
        <DiagnosticCenter />
      </ErrorBoundary>
    </div>
  )
}
