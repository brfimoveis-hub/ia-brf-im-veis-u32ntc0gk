import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  CheckCircle2,
  Play,
  RefreshCw,
  Loader2,
  Save,
  Smartphone,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [formData, setFormData] = useState({
    uazapi_domain: '',
    uazapi_instance_number: '',
    uazapi_token: '',
    uazapi_admin_token: '',
  })

  const [status, setStatus] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    if (user) {
      setFormData({
        uazapi_domain: user.uazapi_domain || '',
        uazapi_instance_number: user.uazapi_instance_number || '',
        uazapi_token: user.uazapi_token || '',
        uazapi_admin_token: user.uazapi_admin_token || '',
      })
      setStatus(user.uazapi_status || '')
      setErrorMsg(user.uazapi_error || '')
    }
  }, [user])

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      setStatus(e.record.uazapi_status || '')
      setErrorMsg(e.record.uazapi_error || '')
      setFormData((prev) => ({
        uazapi_domain: e.record.uazapi_domain || prev.uazapi_domain,
        uazapi_instance_number: e.record.uazapi_instance_number || prev.uazapi_instance_number,
        uazapi_token: e.record.uazapi_token || prev.uazapi_token,
        uazapi_admin_token: e.record.uazapi_admin_token || prev.uazapi_admin_token,
      }))
    }
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await pb.collection('users').update(user.id, formData)
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err.message || 'Ocorreu um erro.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleStartInstance = async () => {
    if (!user) return
    try {
      await pb.collection('users').update(user.id, formData)
    } catch (err) {
      console.error(err)
    }

    setLoading(true)
    try {
      const res = await pb.send('/backend/v1/uazapi/v2/connect', {
        method: 'POST',
        body: {
          instance_name: formData.uazapi_instance_number,
          domain: formData.uazapi_domain,
          apikey: formData.uazapi_token,
          admin_token: formData.uazapi_admin_token,
        },
      })

      toast({
        title: 'Instância Iniciada',
        description:
          res.status === 'connected' ? 'Conectado com sucesso!' : 'Iniciada, aguardando conexão.',
      })
    } catch (err: any) {
      let msg = err.message || 'Falha ao iniciar instância.'
      if (err.status === 401 || err.status === 403 || msg.toLowerCase().includes('unauthorized')) {
        msg = 'Erro de Autenticação: Verifique se o Admin Token e Token estão corretos e válidos.'
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar instância',
        description: msg,
      })
    } finally {
      setLoading(false)
      checkStatus()
    }
  }

  const checkStatus = async () => {
    if (!user || !formData.uazapi_instance_number) return
    setRefreshing(true)
    try {
      await pb.send(`/backend/v1/uazapi/status/${formData.uazapi_instance_number}`, {
        method: 'GET',
      })
      toast({ title: 'Status atualizado' })
    } catch (err: any) {
      let msg = err.message || 'Erro ao verificar status'
      if (err.status === 401 || err.status === 403) msg = 'Acesso negado. Verifique os Tokens.'
      toast({ variant: 'destructive', title: 'Erro de Status', description: msg })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4 animate-fade-in">
      <h1 className="text-3xl font-bold mb-6 text-foreground tracking-tight">Configurações</h1>

      <Tabs defaultValue="uazapi" className="w-full">
        <TabsList className="mb-6 bg-secondary/50">
          <TabsTrigger value="uazapi" className="data-[state=active]:bg-background">
            <Smartphone className="w-4 h-4 mr-2" />
            WhatsApp (Uazapi)
          </TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-background">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uazapi">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-secondary/20 pb-4">
              <CardTitle>Integração Uazapi</CardTitle>
              <CardDescription>
                Configure as credenciais da sua instância Uazapi para habilitar o envio e
                recebimento de mensagens.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {status === 'unauthorized' && (
                <Alert
                  variant="destructive"
                  className="animate-fade-in bg-destructive/10 text-destructive border-destructive/20"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Não Autorizado (Unauthorized)</AlertTitle>
                  <AlertDescription>
                    {errorMsg ||
                      'Suas credenciais (Token / Admin Token) são inválidas ou expiraram. Verifique os dados abaixo e tente novamente.'}
                  </AlertDescription>
                </Alert>
              )}

              {status === 'error' && (
                <Alert
                  variant="destructive"
                  className="animate-fade-in bg-destructive/10 text-destructive border-destructive/20"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro na Instância</AlertTitle>
                  <AlertDescription>
                    {errorMsg || 'Ocorreu um erro ao comunicar com a API.'}
                  </AlertDescription>
                </Alert>
              )}

              {status === 'connected' && (
                <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>Conectado</AlertTitle>
                  <AlertDescription>A instância está conectada e operante.</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="uazapi_domain">URL da API (Domain)</Label>
                  <Input
                    id="uazapi_domain"
                    name="uazapi_domain"
                    placeholder="https://iabrfimveis.uazapi.com"
                    value={formData.uazapi_domain}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uazapi_instance_number">Nome/Número da Instância</Label>
                  <Input
                    id="uazapi_instance_number"
                    name="uazapi_instance_number"
                    placeholder="Ex: 5548992098050"
                    value={formData.uazapi_instance_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="uazapi_token">Token da Instância (API Key)</Label>
                  <Input
                    id="uazapi_token"
                    name="uazapi_token"
                    type="password"
                    placeholder="Insira o token global ou da instância"
                    value={formData.uazapi_token}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="uazapi_admin_token">Admin Token</Label>
                  <Input
                    id="uazapi_admin_token"
                    name="uazapi_admin_token"
                    type="password"
                    placeholder="Token administrativo para gerenciamento"
                    value={formData.uazapi_admin_token}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t bg-secondary/10">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={checkStatus}
                  disabled={refreshing || !formData.uazapi_instance_number}
                >
                  {refreshing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Verificar Status
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleStartInstance}
                  disabled={loading || !formData.uazapi_instance_number}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Iniciar Instância
                </Button>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Opções da sua conta e preferências do sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Mais opções em breve...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
