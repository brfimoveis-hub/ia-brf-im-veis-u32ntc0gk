import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Loader2,
  RefreshCw,
  Smartphone,
  QrCode,
  Power,
  CheckCircle2,
  BarChart,
  AlertCircle,
  Plug,
  LogOut,
  Wifi,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { createSystemLog } from '@/services/system_logs'
import { cn } from '@/lib/utils'
import ChavesNaMao from '@/pages/SettingsConnections/ChavesNaMao'
import { DiagnosticCenter } from '@/components/DiagnosticCenter'

const sanitizeDomain = (raw: string) => {
  let clean = raw.trim()
  if (clean && !clean.startsWith('http')) clean = 'https://' + clean
  if (clean.endsWith('/')) clean = clean.slice(0, -1)
  return clean
}

const normalizeUazapiStatus = (raw: string) => {
  const s = (raw || '').toLowerCase()
  if (s === 'connected' || s === 'open') return { connected: true, label: 'Conectado' }
  if (s === 'qr_ready' || s === 'qrcode' || s === 'qr')
    return { connected: false, label: 'QR Code Pronto' }
  if (s === 'connecting' || s === 'loading') return { connected: false, label: 'Conectando...' }
  if (s === 'error' || s === 'failed' || s === 'close')
    return { connected: false, label: 'Erro de Conexão' }
  if (s === 'disconnected' || s === '') return { connected: false, label: 'Desconectado' }
  return { connected: false, label: raw }
}

const mapHttpError = (code: number | undefined, defaultMessage: string): string => {
  if (code === 404)
    return 'Erro 404: Endpoint não encontrado. Verifique o Domínio da API e o Número da Instância.'
  if (code === 405)
    return 'Erro 405: Método não permitido. A requisição foi recusada pelo servidor.'
  if (code === 401)
    return 'Erro 401: Não autorizado. Verifique o Token da Instância ou Global API Key.'
  return defaultMessage
}

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

function UazapiPanel() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [domain, setDomain] = useState(user?.uazapi_domain || '')
  const [token, setToken] = useState(user?.uazapi_token || '')
  const [adminToken, setAdminToken] = useState(user?.uazapi_admin_token || '')
  const [instanceNumber, setInstanceNumber] = useState(user?.uazapi_instance_number || '')
  const [status, setStatus] = useState(user?.uazapi_status || 'disconnected')
  const [errorMsg, setErrorMsg] = useState(user?.uazapi_error || '')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isLoadingQr, setIsLoadingQr] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isResyncing, setIsResyncing] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<{ base64?: string; code?: string } | null>(null)
  const mountedRef = useRef(true)
  const qrFetchingRef = useRef(false)
  const statusRef = useRef(status)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  useRealtime('users', (e) => {
    if (!user?.id || e.record.id !== user.id) return
    const newStatus = e.record.uazapi_status || 'disconnected'
    const newError = e.record.uazapi_error || ''
    setStatus((prev) => (prev !== newStatus ? newStatus : prev))
    setErrorMsg((prev) => (prev !== newError ? newError : prev))
  })

  const handleSave = useCallback(async () => {
    if (!user) return
    const cleanDomain = sanitizeDomain(domain)
    if (domain.trim() && !/^https?:\/\/[^/]+\.[^/]+/.test(cleanDomain)) {
      toast({
        variant: 'destructive',
        title: 'Domínio inválido',
        description: 'O domínio deve ser uma URL válida (ex: https://iabrfimveis.uazapi.com).',
      })
      return
    }
    if (instanceNumber.trim() && !/^[a-zA-Z0-9_-]+$/.test(instanceNumber.trim())) {
      toast({
        variant: 'destructive',
        title: 'Nome de instância inválido',
        description:
          'O nome da instância deve conter apenas letras, números, hífens ou underscores.',
      })
      return
    }
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        uazapi_domain: cleanDomain,
        uazapi_token: token,
        uazapi_admin_token: adminToken,
        uazapi_instance_number: instanceNumber,
      })
      await createSystemLog({
        type: 'uazapi_config',
        message: 'Configurações UAZAPI salvas',
        details: {
          domain: cleanDomain,
          instance: instanceNumber.trim(),
          has_token: !!token.trim(),
          has_admin_token: !!adminToken.trim(),
        },
        payload: { action: 'save_config', instance: instanceNumber.trim() },
      }).catch(() => {})
      toast({
        title: 'Configurações salvas',
        description: 'As credenciais do UAZAPI foram atualizadas.',
      })
    } catch (err: any) {
      await createSystemLog({
        type: 'uazapi_config',
        message: 'Erro ao salvar configurações UAZAPI',
        details: { error: err.message },
        payload: { action: 'save_config_error' },
      }).catch(() => {})
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    } finally {
      setIsSaving(false)
    }
  }, [user, domain, token, adminToken, instanceNumber, toast])

  const handleRestart = useCallback(async () => {
    if (!user?.uazapi_domain || !user?.uazapi_instance_number) {
      toast({
        variant: 'destructive',
        title: 'Credenciais não salvas',
        description: 'Salve as credenciais antes de reiniciar a instância.',
      })
      return
    }
    setIsRestarting(true)
    try {
      await pb.send('/backend/v1/uazapi/restart', { method: 'POST' })
      await createSystemLog({
        type: 'uazapi_config',
        message: 'Instância UAZAPI reiniciada',
        details: { instance: user.uazapi_instance_number },
        payload: { action: 'restart', instance: user.uazapi_instance_number },
      }).catch(() => {})
      toast({ title: 'Instância reiniciada', description: 'O comando de reinício foi enviado.' })
    } catch (err: any) {
      const errCode = err?.response?.code || err?.status
      const errMsg = err?.response?.error || err?.message || 'Falha ao processar comando.'
      const msg = mapHttpError(
        typeof errCode === 'number' ? errCode : undefined,
        errCode && !errMsg.includes('HTTP') ? `HTTP ${errCode}: ${errMsg}` : errMsg,
      )
      await createSystemLog({
        type: 'uazapi_config',
        message: 'Erro ao reiniciar instância UAZAPI',
        details: { error: msg, code: errCode },
        payload: { action: 'restart_error', instance: user.uazapi_instance_number },
      }).catch(() => {})
      toast({ variant: 'destructive', title: 'Erro ao reiniciar', description: msg })
    } finally {
      setIsRestarting(false)
    }
  }, [user, toast])

  const handleSyncStatus = useCallback(async () => {
    setIsSyncing(true)
    try {
      await pb.send('/backend/v1/uazapi/status', { method: 'GET' })
      toast({ title: 'Status atualizado', description: 'O status da instância foi verificado.' })
    } catch (err: any) {
      const errCode = err?.response?.code || err?.status
      const errMsg = err?.response?.error || err?.message || 'Falha ao acessar status.'
      const msg = mapHttpError(typeof errCode === 'number' ? errCode : undefined, errMsg)
      toast({
        variant: 'destructive',
        title: 'Erro ao verificar status',
        description: msg,
      })
    } finally {
      setIsSyncing(false)
    }
  }, [toast])

  const handleResync = useCallback(async () => {
    if (!user?.uazapi_domain || !user?.uazapi_instance_number) {
      toast({
        variant: 'destructive',
        title: 'Credenciais não salvas',
        description: 'Salve as credenciais antes de sincronizar a instância.',
      })
      return
    }
    setIsResyncing(true)
    try {
      const res = await pb.send('/backend/v1/uazapi/resync', { method: 'POST' })
      await createSystemLog({
        type: 'uazapi_config',
        message: 'Instância UAZAPI sincronizada',
        details: { instance: user.uazapi_instance_number, status: res.status },
        payload: { action: 'resync', instance: user.uazapi_instance_number },
      }).catch(() => {})
      toast({
        title: 'Sincronização concluída',
        description: `Status da instância: ${res.status === 'connected' ? 'Conectado' : 'Desconectado'}`,
      })
    } catch (err: any) {
      const errCode = err?.response?.code || err?.status
      const errMsg = err?.response?.error || err?.message || 'Falha ao sincronizar.'
      const msg = mapHttpError(typeof errCode === 'number' ? errCode : undefined, errMsg)
      await createSystemLog({
        type: 'uazapi_config',
        message: 'Erro ao sincronizar instância UAZAPI',
        details: { error: msg, code: errCode },
        payload: { action: 'resync_error', instance: user.uazapi_instance_number },
      }).catch(() => {})
      toast({ variant: 'destructive', title: 'Erro ao sincronizar', description: msg })
    } finally {
      setIsResyncing(false)
    }
  }, [user, toast])

  const handleDisconnect = useCallback(async () => {
    if (!user?.uazapi_instance_number) {
      toast({
        variant: 'destructive',
        title: 'Instância não configurada',
        description: 'Configure o nome da instância antes de desconectar.',
      })
      return
    }
    setIsDisconnecting(true)
    try {
      await pb.send('/backend/v1/uazapi/disconnect', { method: 'POST' })
      await createSystemLog({
        type: 'uazapi_config',
        message: 'Instância UAZAPI desconectada',
        details: { instance: user.uazapi_instance_number },
        payload: { action: 'disconnect', instance: user.uazapi_instance_number },
      }).catch(() => {})
      setStatus('disconnected')
      toast({
        title: 'Instância desconectada',
        description: 'A instância foi desconectada com sucesso.',
      })
    } catch (err: any) {
      const errCode = err?.response?.code || err?.status
      const errMsg = err?.response?.error || err?.message || 'Falha ao desconectar.'
      const msg = mapHttpError(typeof errCode === 'number' ? errCode : undefined, errMsg)
      await createSystemLog({
        type: 'uazapi_config',
        message: 'Erro ao desconectar instância UAZAPI',
        details: { error: msg, code: errCode },
        payload: { action: 'disconnect_error', instance: user.uazapi_instance_number },
      }).catch(() => {})
      toast({ variant: 'destructive', title: 'Erro ao desconectar', description: msg })
    } finally {
      setIsDisconnecting(false)
    }
  }, [user, toast])

  const handleTestConnection = useCallback(async () => {
    if (!domain.trim() || !instanceNumber.trim() || !token.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Domínio, Instância e Token são obrigatórios para testar.',
      })
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      const cleanDomain = sanitizeDomain(domain)
      if (user?.id) {
        await pb.collection('users').update(user.id, {
          uazapi_domain: cleanDomain,
          uazapi_instance_number: instanceNumber.trim(),
          uazapi_token: token.trim(),
          uazapi_admin_token: adminToken.trim(),
        })
      }
      const res = await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: cleanDomain,
          instance: instanceNumber.trim(),
          token: token.trim(),
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status === 'success') {
        const state = res.state || 'unknown'
        const normalizedState = state === 'open' ? 'connected' : state
        setStatus(normalizedState)
        setErrorMsg('')
        setTestResult({
          success: true,
          message: `Conexão bem-sucedida. Status: ${normalizeUazapiStatus(normalizedState).label}`,
        })
        toast({
          title: 'Conexão bem-sucedida',
          description: 'A comunicação com a instância UAZAPI está funcionando.',
        })
        if (user?.id) {
          await pb.collection('users').update(user.id, {
            uazapi_status: normalizedState,
            uazapi_error: '',
          })
        }
        await createSystemLog({
          type: 'uazapi_config',
          message: 'Teste de conexão UAZAPI bem-sucedido',
          details: { instance: instanceNumber.trim(), state: normalizedState },
          payload: {
            action: 'test_connection',
            result: 'success',
            instance: instanceNumber.trim(),
          },
        }).catch(() => {})
      } else {
        const msg = res.error || 'Erro ao testar a conexão.'
        setTestResult({ success: false, message: msg })
        setErrorMsg(msg)
        setStatus('error')
        toast({ variant: 'destructive', title: 'Falha na conexão', description: msg })
        if (user?.id) {
          await pb
            .collection('users')
            .update(user.id, {
              uazapi_status: 'error',
              uazapi_error: msg,
            })
            .catch(() => {})
        }
        await createSystemLog({
          type: 'uazapi_config',
          message: 'Falha no teste de conexão UAZAPI',
          details: { instance: instanceNumber.trim(), error: msg },
          payload: { action: 'test_connection', result: 'error', instance: instanceNumber.trim() },
        }).catch(() => {})
      }
    } catch (err: any) {
      const errCode = err?.response?.code || err?.status
      const errMsg = err?.response?.error || err?.message || 'Erro ao testar a conexão.'
      const msg = mapHttpError(
        typeof errCode === 'number' ? errCode : undefined,
        errCode && !errMsg.includes('HTTP') ? `HTTP ${errCode}: ${errMsg}` : errMsg,
      )
      setTestResult({ success: false, message: msg })
      setErrorMsg(msg)
      setStatus('error')
      toast({ variant: 'destructive', title: 'Falha na conexão', description: msg })
      if (user?.id) {
        await pb
          .collection('users')
          .update(user.id, {
            uazapi_status: 'error',
            uazapi_error: msg,
          })
          .catch(() => {})
      }
      await createSystemLog({
        type: 'uazapi_config',
        message: 'Erro no teste de conexão UAZAPI',
        details: { instance: instanceNumber.trim(), error: msg, code: errCode },
        payload: { action: 'test_connection', result: 'error', instance: instanceNumber.trim() },
      }).catch(() => {})
    } finally {
      setIsTesting(false)
    }
  }, [domain, instanceNumber, token, adminToken, user, toast])

  const fetchQrCode = useCallback(async () => {
    if (qrFetchingRef.current || !mountedRef.current) return
    qrFetchingRef.current = true
    setIsLoadingQr(true)
    try {
      const res = await pb.send('/backend/v1/uazapi/qrcode', { method: 'GET' })
      if (!mountedRef.current) return
      if (res && res.base64) {
        if (statusRef.current === 'connected' || statusRef.current === 'open') {
          setQrCodeData(null)
          return
        }
        setQrCodeData({ base64: res.base64, code: res.code })
        toast({ title: 'QR Code gerado', description: 'Leia o QR Code com o seu WhatsApp.' })
      } else {
        toast({
          variant: 'destructive',
          title: 'QR Code não disponível',
          description: 'A instância pode já estar conectada ou ocorreu um erro.',
        })
      }
    } catch (err: any) {
      if (!mountedRef.current) return
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar QR Code',
        description: err.message || 'Não foi possível buscar o QR Code.',
      })
    } finally {
      qrFetchingRef.current = false
      if (mountedRef.current) setIsLoadingQr(false)
    }
  }, [toast])

  useEffect(() => {
    statusRef.current = status
    if (!mountedRef.current) return
    const s = (status || '').toLowerCase()
    if (
      (s === 'qr_ready' || s === 'qrcode' || s === 'qr') &&
      !qrCodeData?.base64 &&
      !isLoadingQr &&
      !qrFetchingRef.current
    ) {
      fetchQrCode()
    }
    if (s === 'connected' || s === 'open') {
      setQrCodeData(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const statusInfo = normalizeUazapiStatus(status)
  const isConnected = statusInfo.connected

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
            <Smartphone className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">WhatsApp (UAZAPI)</CardTitle>
          </div>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={
              isConnected ? 'bg-green-500 hover:bg-green-600 text-sm py-1' : 'text-sm py-1'
            }
          >
            {isConnected ? 'Conectado Perfeitamente' : statusInfo.label}
          </Badge>
        </div>
        <CardDescription className="pt-2">
          Configure a sua instância do UAZAPI para integrações e disparos via WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className={cn(!(!domain.trim() || !instanceNumber.trim()) && 'hidden')}>
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">Configuração Incompleta</AlertTitle>
            <AlertDescription className="text-blue-600">
              Preencha o Domínio da API e o Nome da Instância abaixo e clique em "Salvar
              Credenciais" para ativar a integração com o WhatsApp.
            </AlertDescription>
          </Alert>
        </div>

        <div
          className={cn('uazapi-status-banner-container', !(errorMsg || isConnected) && 'hidden')}
        >
          <StatusBanner
            type={errorMsg ? 'error' : 'success'}
            message={
              errorMsg || 'A comunicação com a instância UAZAPI está funcionando perfeitamente.'
            }
          />
        </div>

        <div className={cn(!(!!errorMsg && !isConnected) && 'hidden')}>
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700">Passos para Solução de Problemas</AlertTitle>
            <AlertDescription className="text-amber-600">
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Verifique se o Nome da Instância corresponde ao seu painel UAZAPI.</li>
                <li>Confirme se o Domínio da API está correto e acessível.</li>
                <li>Valide se o Token da Instância ou Global API Key estão atualizados.</li>
                <li>Use o botão "Reiniciar Instância" para tentar restabelecer a conexão.</li>
                <li>Clique em "Sincronizar" para forçar a verificação do status atual.</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <div className={cn('uazapi-test-result-container', !testResult && 'hidden')}>
          {testResult && (
            <Alert
              variant={testResult.success ? 'default' : 'destructive'}
              className={testResult.success ? 'border-green-500/50 bg-green-500/10' : ''}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {testResult.success ? 'Teste Bem-sucedido' : 'Falha no Teste'}
              </AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
              {!testResult.success && (
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
              )}
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="uazapi_domain">Domínio da API</Label>
            <Input
              id="uazapi_domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="https://iabrfimveis.uazapi.com"
            />
            <p className="text-xs text-muted-foreground">
              URL base da sua instância UAZAPI (Evolution API).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uazapi_instance">Nome da Instância</Label>
            <Input
              id="uazapi_instance"
              value={instanceNumber}
              onChange={(e) => setInstanceNumber(e.target.value)}
              placeholder="brfimoveis"
            />
            <p className="text-xs text-muted-foreground">
              Use o nome da instância (ex: brfimoveis), não o número de telefone.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uazapi_token">Token da Instância (Opcional se usar Global)</Label>
            <Input
              id="uazapi_token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="• • • • • • • •"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uazapi_admin_token">Global API Key</Label>
            <Input
              id="uazapi_admin_token"
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="• • • • • • • •"
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
            Salvar Credenciais
          </Button>
          <Button
            onClick={handleTestConnection}
            disabled={isTesting}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plug className="mr-2 h-4 w-4" />
            )}
            Testar Conexão
          </Button>
          <Button
            onClick={handleSyncStatus}
            disabled={isSyncing}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar Status
          </Button>
          <Button
            onClick={handleRestart}
            disabled={isRestarting}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {isRestarting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Power className="mr-2 h-4 w-4" />
            )}
            Reiniciar Instância
          </Button>
          <Button
            onClick={handleResync}
            disabled={isResyncing}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isResyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="mr-2 h-4 w-4" />
            )}
            Sincronizar
          </Button>
          {isConnected ? (
            <Button
              key="uazapi-disconnect-btn"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {isDisconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Desconectar
            </Button>
          ) : (
            <Button
              key="uazapi-qrcode-btn"
              onClick={fetchQrCode}
              disabled={isLoadingQr}
              variant="default"
              className="w-full sm:w-auto sm:ml-auto"
            >
              {isLoadingQr ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Gerar QR Code
            </Button>
          )}
        </div>

        <div
          className={cn(
            'uazapi-qr-section-container',
            !(qrCodeData?.base64 && !isConnected) && 'hidden',
          )}
        >
          {!!qrCodeData?.base64 && !isConnected && (
            <div className="mt-6 flex flex-col items-center justify-center p-8 border rounded-xl bg-slate-50/80 shadow-inner animate-fade-in">
              <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                <img src={qrCodeData.base64} alt="QR Code" className="w-64 h-64 object-contain" />
              </div>
              <h4 className="font-medium text-center text-lg">Escaneie o QR Code</h4>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera para a
                imagem acima.
              </p>
              {!!qrCodeData.code && (
                <div className="mt-4 px-4 py-2 bg-slate-200 rounded text-sm text-slate-700 font-mono font-medium">
                  Código: {qrCodeData.code}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
        <div className={cn('meta-status-container', !(isConnected || errorMsg) && 'hidden')}>
          <StatusBanner
            type={errorMsg ? 'error' : 'success'}
            message={errorMsg || 'A comunicação com a Meta API está funcionando perfeitamente.'}
          />
        </div>

        <div className={cn(!testResult && 'hidden')}>
          {testResult && (
            <Alert
              variant={testResult.success ? 'default' : 'destructive'}
              className={testResult.success ? 'border-green-500/50 bg-green-500/10' : ''}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {testResult.success ? 'Teste Bem-sucedido' : 'Falha no Teste'}
              </AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
              {!testResult.success && (
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
              )}
            </Alert>
          )}
        </div>

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
        <ErrorBoundary key="uazapi-panel-boundary" fallback={null}>
          <UazapiPanel />
        </ErrorBoundary>
        <ErrorBoundary key="meta-capi-panel-boundary" fallback={null}>
          <MetaCapiPanel />
        </ErrorBoundary>
        <ErrorBoundary key="chaves-na-mao-panel-boundary" fallback={null}>
          <ChavesNaMao />
        </ErrorBoundary>
      </div>

      <ErrorBoundary key="diagnostic-center-boundary" fallback={null}>
        <DiagnosticCenter />
      </ErrorBoundary>
    </div>
  )
}
