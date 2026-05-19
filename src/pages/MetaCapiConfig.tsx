import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import {
  saveMetaCapiSettings,
  executeCapiVerification,
  updateMetaCapiStatus,
} from '@/services/meta_capi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function MetaCapiConfig() {
  const { user } = useAuth()
  const [businessId, setBusinessId] = useState('')
  const [pixelId, setPixelId] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    businessId?: string
    pixelId?: string
    token?: string
  }>({})

  useEffect(() => {
    // Context Purge: Clear any "ghost" states or cache from previous integration attempts
    sessionStorage.removeItem('meta-capi-cache')
    localStorage.removeItem('meta-capi-draft-config')

    let mounted = true
    const loadFreshData = async () => {
      if (user) {
        try {
          const freshAuth = await pb.collection('users').authRefresh()
          if (!mounted) return
          const freshUser = freshAuth.record
          setBusinessId(freshUser.meta_whatsapp_business_id || '')
          setPixelId(freshUser.meta_pixel_id || '')
          setToken(freshUser.meta_capi_token || '')
        } catch (error) {
          if (!mounted) return
          setBusinessId(user.meta_whatsapp_business_id || '')
          setPixelId(user.meta_pixel_id || '')
          setToken(user.meta_capi_token || '')
        }
      }
    }
    loadFreshData()
    return () => {
      mounted = false
    }
  }, [user?.id])

  const handleSaveAndTest = async () => {
    if (!user) return

    let valid = true
    const errors: any = {}
    if (!pixelId.trim()) {
      errors.pixelId = 'Pixel ID é obrigatório'
      valid = false
    }
    if (!token.trim()) {
      errors.token = 'Token de Acesso é obrigatório'
      valid = false
    }
    if (!valid) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    setFieldErrors({})

    try {
      // 1. Save settings
      await saveMetaCapiSettings(user.id, businessId, pixelId, token)

      // 2. Test Connection
      await executeCapiVerification(user.id, businessId, pixelId, token)

      await updateMetaCapiStatus(user.id, 'valid')
      await pb.collection('users').authRefresh()
      toast.success('Configurações salvas e conexão verificada com sucesso!')
    } catch (error: any) {
      await pb
        .collection('users')
        .authRefresh()
        .catch(() => {})
      const errMsg = error.message || 'Erro desconhecido'
      const errLower = errMsg.toLowerCase()

      const newFieldErrors: any = {}

      if (errLower.includes('parâmetro inválido') || errLower.includes('invalid parameter')) {
        newFieldErrors.pixelId = 'Parâmetro inválido. Verifique se o Pixel ID está correto.'
        newFieldErrors.token = 'Parâmetro inválido. Verifique as permissões do Token.'
      } else if (errLower.includes('pixel') || errLower.includes('dataset')) {
        newFieldErrors.pixelId = errMsg
      } else if (
        errLower.includes('token') ||
        errLower.includes('oauth') ||
        errLower.includes('permissão') ||
        errLower.includes('permission') ||
        errLower.includes('invalid token') ||
        errMsg.includes('Permissões insuficientes') ||
        errMsg.includes('Erro no Token de Acesso')
      ) {
        newFieldErrors.token = errMsg
      } else if (errLower.includes('business')) {
        newFieldErrors.businessId = errMsg
      } else {
        // generic
        toast.error(errMsg)
      }

      if (Object.keys(newFieldErrors).length > 0) {
        setFieldErrors(newFieldErrors)
        toast.error('Ocorreu um erro na validação. Verifique os campos destacados.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 p-4 gap-6">
      <div className="w-full max-w-2xl">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/configuracoes">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar para Configurações
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-2xl border-none shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle>Meta Conversions API (CAPI)</CardTitle>
          <CardDescription>
            Configure suas credenciais da Meta para rastreamento de eventos no servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-0 md:px-6">
          {user?.meta_token_status && (
            <div
              className={`p-3 rounded-md flex items-center gap-2 text-sm font-medium ${
                user.meta_token_status === 'active' || user.meta_token_status === 'valid'
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-red-500/10 text-red-600'
              }`}
            >
              {user.meta_token_status === 'active' || user.meta_token_status === 'valid' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>
                Status Atual:{' '}
                {user.meta_token_status === 'active' || user.meta_token_status === 'valid'
                  ? 'Conectado e Operante'
                  : user.meta_token_status}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="businessId">
              Business ID{' '}
              <span className="text-muted-foreground font-normal">(Opcional para CAPI puro)</span>
            </Label>
            <Input
              id="businessId"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="Ex: 950541937872426"
              className={
                fieldErrors.businessId ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.businessId && (
              <p className="text-xs text-destructive">{fieldErrors.businessId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixelId">
              Pixel ID / Dataset ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pixelId"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="Ex: 1522162279584545"
              required
              className={
                fieldErrors.pixelId ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.pixelId && (
              <p className="text-xs text-destructive">{fieldErrors.pixelId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">
              Access Token (Token de Acesso) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Ex: EAAzbADOLSAoBRWEHCILX1hx..."
              required
              className={
                fieldErrors.token ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.token && <p className="text-xs text-destructive">{fieldErrors.token}</p>}
            <p className="text-[10px] text-muted-foreground mt-1 break-all line-clamp-2">
              Token atual termina com: {token.length > 10 ? '...' + token.slice(-10) : 'N/A'}
            </p>
          </div>
        </CardContent>
        <CardFooter className="px-0 md:px-6">
          <Button onClick={handleSaveAndTest} disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar e Testar Conexão
          </Button>
        </CardFooter>
      </Card>

      <Card className="w-full max-w-2xl border-none shadow-none md:border md:shadow-sm">
        <CardHeader className="px-0 md:px-6">
          <CardTitle>Como Configurar</CardTitle>
          <CardDescription>
            Siga os passos abaixo para gerar seu Access Token corretamente no Gerenciador de
            Negócios da Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step-1">
              <AccordionTrigger>1. Criar um Usuário do Sistema</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal pl-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    Acesse as <strong>Configurações do Negócio</strong> na Meta.
                  </li>
                  <li>
                    No menu lateral esquerdo, vá em <strong>Usuários</strong> &gt;{' '}
                    <strong>Usuários do sistema</strong>.
                  </li>
                  <li>
                    Clique em <strong>Adicionar</strong>.
                  </li>
                  <li>
                    Dê um nome ao usuário (ex: &quot;Integração CAPI&quot;) e selecione a função{' '}
                    <strong>Administrador do sistema</strong>.
                  </li>
                  <li>
                    Clique em <strong>Criar usuário do sistema</strong>.
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="step-2">
              <AccordionTrigger>2. Atribuir Ativos (Pixel/Conjunto de Dados)</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal pl-4 space-y-2 text-sm text-muted-foreground">
                  <li>Selecione o usuário do sistema recém-criado.</li>
                  <li>
                    Clique em <strong>Adicionar ativos</strong>.
                  </li>
                  <li>
                    No menu lateral, selecione <strong>Conjuntos de dados</strong> (ou Pixels).
                  </li>
                  <li>
                    Marque o Pixel/Dataset que deseja usar (o mesmo ID que você colocará no
                    formulário).
                  </li>
                  <li>Dê controle total (Gerenciar conjunto de dados) e salve.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="step-3">
              <AccordionTrigger>3. Gerar o Token de Acesso</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal pl-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    Ainda no usuário do sistema, clique em <strong>Gerar novo token</strong>.
                  </li>
                  <li>Selecione o seu aplicativo na lista (ou crie um se não tiver).</li>
                  <li>
                    Role a página até a lista de permissões e marque <strong>exatamente</strong>{' '}
                    estas 3 permissões:
                    <ul className="list-disc pl-4 mt-2 font-mono text-xs space-y-1">
                      <li>ads_management</li>
                      <li>business_management</li>
                      <li>ads_read</li>
                    </ul>
                  </li>
                  <li>
                    Clique em Gerar Token. Copie a string gerada e cole no campo &quot;Access
                    Token&quot; acima.
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
