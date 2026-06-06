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
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Server, Bot, Activity, AlertTriangle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'

export default function ConfiguracoesCore() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [status, setStatus] = useState<'success' | 'error' | 'warning' | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  // Uazapi
  const [domain, setDomain] = useState('')
  const [instance, setInstance] = useState('')
  const [token, setToken] = useState('')
  const [adminToken, setAdminToken] = useState('')

  // IA
  const [aiName, setAiName] = useState('')
  const [aiInstructions, setAiInstructions] = useState('')
  const [aiVoiceId, setAiVoiceId] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [kbFile, setKbFile] = useState<File | null>(null)

  useEffect(() => {
    if (user) {
      setDomain(user.uazapi_domain || '')
      setInstance(user.uazapi_instance_number || '')
      setToken(user.uazapi_token || '')
      setAdminToken(user.uazapi_admin_token || '')

      setAiName(user.ai_name || '')
      setAiInstructions(user.ai_instructions || '')
      setAiVoiceId(user.ai_voice_id || '')

      if (user.uazapi_status === 'Saudável' || user.uazapi_status === 'connected') {
        setStatus('success')
        setStatusMsg('Conectado')
      } else if (user.uazapi_status === 'error' || user.uazapi_status === 'offline') {
        setStatus('error')
        setStatusMsg(user.uazapi_error || 'Desconectado')
      }
    }
  }, [user])

  useRealtime(
    'users',
    (e) => {
      if (e.action === 'update' && e.record.id === user?.id) {
        if (e.record.uazapi_status === 'Saudável' || e.record.uazapi_status === 'connected') {
          setStatus('success')
          setStatusMsg('Conectado')
        } else if (e.record.uazapi_status === 'error' || e.record.uazapi_status === 'offline') {
          setStatus('error')
          setStatusMsg(e.record.uazapi_error || 'Desconectado')
        }
      }
    },
    !!user?.id,
  )

  const handleSaveUazapi = async () => {
    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, {
        uazapi_domain: domain,
        uazapi_instance_number: instance,
        uazapi_token: token,
        uazapi_admin_token: adminToken,
      })
      toast({
        title: 'Configurações salvas',
        description: 'Credenciais Uazapi atualizadas com sucesso.',
      })
    } catch (err: unknown) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!domain || !instance || !token) {
      toast({
        title: 'Campos incompletos',
        description: 'Preencha o domínio, instância e token antes de testar.',
        variant: 'destructive',
      })
      return
    }
    setTestLoading(true)
    setStatus(null)
    setStatusMsg('')
    try {
      await pb.send('/backend/v1/uazapi/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain,
          instance,
          token,
          admin_token: adminToken,
        }),
      })
      setStatus('success')
      setStatusMsg('Conexão estabelecida com sucesso!')
      toast({ title: 'Sucesso', description: 'A conexão com Uazapi foi validada.' })

      if (user) {
        await pb.collection('users').update(user.id, {
          uazapi_status: 'Saudável',
          uazapi_error: '',
        })
      }
    } catch (err: any) {
      setStatus('error')
      const errorData = err.response?.data || err.response || {}
      const originalStatus = errorData.originalStatus || err.status

      let suggestion = 'Verifique suas credenciais.'
      if (originalStatus === 404) {
        suggestion =
          'Instância não encontrada (404). Verifique se o "Instance Number" e "Base Domain" estão corretos.'
      } else if (originalStatus === 401 || originalStatus === 403) {
        suggestion = 'Acesso negado (401/403). Verifique se o "Instance Token" está correto.'
      }

      const msg = errorData.error || errorData.message || getErrorMessage(err)
      setStatusMsg(msg)

      toast({
        title: 'Falha na Conexão',
        description: suggestion,
        variant: 'destructive',
      })

      if (user) {
        await pb.collection('users').update(user.id, {
          uazapi_status: 'error',
          uazapi_error: msg,
        })
      }
    } finally {
      setTestLoading(false)
    }
  }

  const handleSaveAi = async () => {
    if (!user) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('ai_name', aiName)
      formData.append('ai_instructions', aiInstructions)
      formData.append('ai_voice_id', aiVoiceId)

      if (avatarFile) formData.append('ai_avatar', avatarFile)
      if (kbFile) formData.append('ai_knowledge_files', kbFile)

      await pb.collection('users').update(user.id, formData)
      toast({
        title: 'Configurações IA salvas',
        description: 'Os parâmetros da IA Mãe foram atualizados.',
      })
      setAvatarFile(null)
      setKbFile(null)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar IA',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as conexões de API e os parâmetros da inteligência artificial.
        </p>
      </div>

      <Tabs defaultValue="uazapi" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto bg-transparent p-0">
          <TabsTrigger
            value="uazapi"
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3"
          >
            <Server className="h-4 w-4 mr-2" />
            Conexão Uazapi
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3"
          >
            <Bot className="h-4 w-4 mr-2" />
            IA Mãe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uazapi" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração Uazapi</CardTitle>
              <CardDescription>
                Parâmetros para conexão com a API de WhatsApp (Uazapi / Evolution).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Base Domain</Label>
                <Input
                  id="domain"
                  placeholder="https://sua-api.uazapi.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instance">Instance Number (ID)</Label>
                <Input
                  id="instance"
                  placeholder="ex: 5548992098050"
                  value={instance}
                  onChange={(e) => setInstance(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">Instance Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="Token de autenticação (Bearer)"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admintoken">Admin / Master Token (Opcional)</Label>
                <Input
                  id="admintoken"
                  type="password"
                  placeholder="Necessário para operações administrativas"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                />
              </div>

              {statusMsg && (
                <div
                  className={cn(
                    'p-4 rounded-md mt-4 text-sm flex items-start gap-3',
                    status === 'success'
                      ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20',
                  )}
                >
                  {status === 'success' ? (
                    <Activity className="h-5 w-5 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {status === 'success' ? 'Status: Saudável' : 'Status: Erro na Conexão'}
                    </p>
                    <p className="mt-1">{statusMsg}</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" onClick={handleTestConnection} disabled={testLoading}>
                {testLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Testar Conexão
              </Button>
              <Button onClick={handleSaveUazapi} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Credenciais
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração da IA Mãe</CardTitle>
              <CardDescription>
                Defina a identidade e o comportamento base da sua Inteligência Artificial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ainame">Nome da IA</Label>
                <Input
                  id="ainame"
                  placeholder="Ex: Assistente BRF"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiinst">Instruções de Comportamento (System Prompt)</Label>
                <Textarea
                  id="aiinst"
                  placeholder="Você é um assistente especializado em..."
                  className="min-h-[150px]"
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aivoice">ID da Voz (ElevenLabs/OpenAI)</Label>
                <Input
                  id="aivoice"
                  placeholder="ID da voz para síntese de áudio"
                  value={aiVoiceId}
                  onChange={(e) => setAiVoiceId(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t mt-6">
                <div className="space-y-2">
                  <Label>Avatar da IA (Imagem)</Label>
                  <div className="flex items-center gap-4">
                    {user?.ai_avatar && !avatarFile && (
                      <img
                        src={pb.files.getURL(user, user.ai_avatar)}
                        alt="Avatar"
                        className="h-16 w-16 rounded-full object-cover border"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">PNG ou JPG (Max 5MB)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Base de Conhecimento (PDF/TXT/DOCX)</Label>
                  <div className="flex items-center gap-4">
                    {user?.ai_knowledge_files && !kbFile && (
                      <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center border shrink-0">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept=".pdf,.txt,.docx"
                        onChange={(e) => setKbFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Material de referência para RAG
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t p-6">
              <Button onClick={handleSaveAi} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar IA Mãe
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
