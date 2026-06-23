import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Activity,
  Save,
  BrainCircuit,
  FileText,
  MessageSquare,
  Network,
  Sparkles,
  InfoIcon,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { RecordModel } from 'pocketbase'

const VOICES = [
  { id: 'professional_female', name: 'Feminina - Clara e Profissional' },
  { id: 'friendly_female', name: 'Feminina - Acolhedora e Cordial' },
  { id: 'executive_female', name: 'Feminina - Formal e Executiva' },
  { id: 'custom', name: 'Personalizado' },
]

const PERSONAS = [
  {
    id: 'profissional',
    name: 'Bia Profissional',
    description: 'Eficiente, clara e focada no mercado imobiliário.',
    voiceId: 'professional_female',
    avatarUrl:
      'https://img.usecurling.com/p/256/256?q=smiling%20elegant%20middle-aged%20woman%20blazer%20office',
    instructions:
      'Aja como uma corretora de imóveis experiente e profissional de meia-idade. Seja clara, objetiva e atenciosa. Evite gírias e foque em entender a necessidade do cliente para oferecer as melhores opções.',
  },
  {
    id: 'cordial',
    name: 'Bia Cordial',
    description: 'Empática, acolhedora e pronta para ajudar.',
    voiceId: 'friendly_female',
    avatarUrl:
      'https://img.usecurling.com/p/256/256?q=friendly%20smiling%20middle-aged%20woman%20conservative%20professional',
    instructions:
      'Aja como uma corretora de imóveis acolhedora e empática de meia-idade. Mostre entusiasmo genuíno em ajudar o cliente a encontrar o lar dos sonhos. Use um tom amigável e acessível, mantendo o profissionalismo.',
  },
  {
    id: 'formal',
    name: 'Bia Formal',
    description: 'Precisa, de alto padrão e focada em negócios.',
    voiceId: 'executive_female',
    avatarUrl:
      'https://img.usecurling.com/p/256/256?q=confident%20middle-aged%20executive%20woman%20suit',
    instructions:
      'Aja como uma corretora de imóveis focada no segmento de alto padrão. Utilize um vocabulário formal e culto. Vá direto ao ponto, priorize informações técnicas, valores e métricas de investimento imobiliário.',
  },
]

export default function Dashboard() {
  const { user: authUser } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [userSettings, setUserSettings] = useState<RecordModel | null>(null)
  const [customers, setCustomers] = useState<RecordModel[]>([])

  const [isSyncing, setIsSyncing] = useState(false)
  const [isSavingAI, setIsSavingAI] = useState(false)

  const [aiSettings, setAiSettings] = useState({
    aiName: 'Bia',
    aiInstructions: '',
    biaInstructions: '',
    aiVoiceId: 'professional_female',
    avatarPreview: PERSONAS[0].avatarUrl,
  })

  const loadData = async () => {
    if (!authUser?.id) return
    try {
      const [uRes, cRes] = await Promise.all([
        pb.collection('users').getOne(authUser.id),
        pb.collection('customers').getFullList(),
      ])
      setUserSettings(uRes)
      setCustomers(cRes)
      setAiSettings({
        aiName: uRes.ai_name || 'Bia',
        aiInstructions: uRes.ai_instructions || '',
        biaInstructions: uRes.bia_instructions || '',
        aiVoiceId: uRes.ai_voice_id || 'professional_female',
        avatarPreview: uRes.ai_avatar
          ? pb.files.getURL(uRes, uRes.ai_avatar)
          : PERSONAS[0].avatarUrl,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [authUser?.id])

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === authUser?.id) {
      setUserSettings(e.record)
    }
  })

  useRealtime('customers', () => {
    pb.collection('customers').getFullList().then(setCustomers).catch(console.error)
  })

  const handleResync = async () => {
    setIsSyncing(true)
    try {
      await pb.send('/backend/v1/uazapi/resync', { method: 'POST' })
      toast({ title: 'Sincronização concluída', description: 'Status atualizado com sucesso.' })
    } catch (err) {
      toast({
        title: 'Falha na sincronização',
        description: 'Não foi possível conectar ao Uazapi.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveAI = async () => {
    if (!authUser?.id) return
    if (!aiSettings.biaInstructions.trim()) {
      toast({
        title: 'Atenção',
        description: 'As instruções da Bia não podem estar vazias.',
        variant: 'destructive',
      })
      return
    }
    if (!aiSettings.aiInstructions.trim()) {
      toast({
        title: 'Atenção',
        description: 'As diretrizes da IA Mãe não podem estar vazias.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingAI(true)
    try {
      const formData = new FormData()
      formData.append('ai_name', aiSettings.aiName)
      formData.append('ai_instructions', aiSettings.aiInstructions)
      formData.append('bia_instructions', aiSettings.biaInstructions)
      formData.append('ai_voice_id', aiSettings.aiVoiceId)

      if (
        aiSettings.avatarPreview.startsWith('http') &&
        !aiSettings.avatarPreview.includes(pb.baseUrl)
      ) {
        try {
          const response = await fetch(aiSettings.avatarPreview)
          const blob = await response.blob()
          formData.append('ai_avatar', blob, 'avatar.jpg')
        } catch (err) {
          console.error('Failed to fetch avatar preview:', err)
        }
      }

      const updatedUser = await pb.collection('users').update(authUser.id, formData)

      setAiSettings((prev) => ({
        ...prev,
        avatarPreview: updatedUser.ai_avatar
          ? pb.files.getURL(updatedUser, updatedUser.ai_avatar)
          : prev.avatarPreview,
      }))

      toast({ title: 'Sucesso', description: 'Configurações de IA salvas com sucesso!' })
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar as configurações de IA.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingAI(false)
    }
  }

  const applyPersona = (persona: (typeof PERSONAS)[0]) => {
    setAiSettings((prev) => ({
      ...prev,
      biaInstructions: persona.instructions,
      aiVoiceId: persona.voiceId,
      avatarPreview: persona.avatarUrl,
    }))
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-lg font-medium text-muted-foreground animate-pulse">
          Carregando CRM Inteligente...
        </span>
      </div>
    )
  }

  const stages = [
    'Novo',
    'lead',
    'contact',
    'Qualificação',
    'Engajamento',
    'Demo Realiz.',
    'Visita',
    'Proposta',
    'Fechamento',
    'closed',
  ]

  const customerCountsByStage = stages.reduce(
    (acc, stage) => {
      acc[stage] = customers.filter(
        (c) => c.status === stage || (stage === 'lead' && c.status === 'Lead Novo'),
      ).length
      return acc
    },
    {} as Record<string, number>,
  )

  const hasUazapiConfig = !!(userSettings?.uazapi_token || userSettings?.uazapi_domain)
  const isConnected = userSettings?.uazapi_status === 'connected'

  const knowledgeFiles = userSettings?.ai_knowledge_files
    ? Array.isArray(userSettings.ai_knowledge_files)
      ? userSettings.ai_knowledge_files
      : [userSettings.ai_knowledge_files]
    : []

  const activePersona = PERSONAS.find(
    (p) => p.voiceId === aiSettings.aiVoiceId && p.instructions === aiSettings.biaInstructions,
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span>Painel de Controle</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          <span>Gerencie seu CRM Inteligente e o Cérebro Estratégico</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm lg:col-span-1 flex flex-col h-full">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span>Conexão Uazapi</span>
            </CardTitle>
            <CardDescription>
              <span>Status da integração com WhatsApp</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col justify-center space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  <span>Status da API</span>
                </p>
                {isConnected ? (
                  <Badge
                    variant="default"
                    className="bg-green-500 hover:bg-green-600 font-medium px-3 py-1 text-sm inline-flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> <span>Conectado</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="destructive"
                    className="font-medium px-3 py-1 text-sm inline-flex items-center"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> <span>Offline / Desconectado</span>
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  <span>Instância</span>
                </p>
                <p className="font-semibold text-lg">
                  <span>{userSettings?.uazapi_instance_number || '---'}</span>
                </p>
              </div>
            </div>

            {hasUazapiConfig && !isConnected && (
              <div className="pt-2">
                <Button
                  onClick={handleResync}
                  disabled={isSyncing}
                  variant="outline"
                  className="w-full h-11 border-primary/20 hover:bg-primary/5 inline-flex items-center justify-center"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2 text-primary" />
                  )}
                  <span>Re-sincronizar Conexão</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2 flex flex-col h-full">
          <CardHeader>
            <CardTitle>
              <span>Funil de Cadência Automatizado (10 Estágios)</span>
            </CardTitle>
            <CardDescription>
              <span>Movimentação automática guiada pelas interações da IA</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {stages.map((stage, idx) => (
                <div
                  key={stage}
                  className="bg-card border shadow-sm rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-primary/50 transition-all duration-300"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-muted group-hover:bg-primary transition-colors duration-300" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                    <span>Etapa {idx + 1}</span>
                  </span>
                  <span className="font-bold text-sm mb-3 text-card-foreground line-clamp-1">
                    <span>
                      {stage === 'lead'
                        ? 'Lead Novo'
                        : stage === 'closed'
                          ? 'Fechado'
                          : stage === 'contact'
                            ? 'Contato'
                            : stage}
                    </span>
                  </span>
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-xl font-black mb-1 transition-colors duration-300',
                      customerCountsByStage[stage] > 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <span>{customerCountsByStage[stage] || 0}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    <span>clientes</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span>Configuração do Sistema de IA</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            <span>Defina as diretrizes de negócio e a persona de atendimento.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm flex flex-col border-primary/20">
            <CardHeader className="pb-4 border-b bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <span>IA Mãe (Cérebro Estratégico)</span>
              </CardTitle>
              <CardDescription>
                <span>
                  Alimente o sistema com conhecimento global, regras de negócio e estratégias da sua
                  imobiliária.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col space-y-5">
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm flex items-start gap-3">
                <Network className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed text-xs">
                  <span>
                    A <strong className="text-foreground">IA Mãe</strong> atua como o cérebro da
                    operação. Ela avalia o contexto, analisa documentos, histórico de leads e define
                    os próximos passos, enviando apenas as orientações finais para a Bia executar no
                    atendimento.
                  </span>
                </p>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="text-sm font-semibold mb-2 flex items-center justify-between">
                  <span>Instruções Estratégicas e Conhecimento</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Descreva detalhes da imobiliária, regras de qualificação de leads,
                          horários de atendimento e políticas internas. Este conhecimento é
                          exclusivo da IA Mãe.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  value={aiSettings.aiInstructions}
                  onChange={(e) => setAiSettings({ ...aiSettings, aiInstructions: e.target.value })}
                  className="flex-1 min-h-[250px] resize-y text-sm leading-relaxed"
                  placeholder="Ex: Somos uma imobiliária de alto padrão. Nossos corretores trabalham das 09h às 18h..."
                />
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex justify-between items-center">
                  <span>Base de Conhecimento (Arquivos Globais)</span>
                  <Badge variant="secondary" className="font-mono inline-flex items-center">
                    <span>{knowledgeFiles.length}</span>
                  </Badge>
                </div>
                {knowledgeFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {knowledgeFiles.map((file: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 bg-secondary px-2 py-1 rounded text-xs"
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[120px]" title={file}>
                          {file}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <span>Nenhum arquivo global carregado.</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm flex flex-col">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                <span>Configuração da Bia (Atendimento)</span>
              </CardTitle>
              <CardDescription>
                <span>
                  Defina a persona, aparência, voz e regras de comunicação para o cliente final.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col space-y-6">
              <div className="flex gap-4 items-center">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-secondary border-2 border-border shadow-sm shrink-0">
                  <img
                    src={aiSettings.avatarPreview}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                    <span>Nome da Assistente</span>
                  </Label>
                  <Input
                    value={aiSettings.aiName}
                    onChange={(e) => setAiSettings({ ...aiSettings, aiName: e.target.value })}
                    className="font-bold text-lg h-9 w-full max-w-[200px]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Personas de Atendimento Prontas</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PERSONAS.map((p) => {
                    const isActive = activePersona?.id === p.id
                    return (
                      <div
                        key={p.id}
                        onClick={() => applyPersona(p)}
                        className={cn(
                          'cursor-pointer border rounded-xl p-3 hover:border-primary/50 transition-all flex flex-col items-center text-center gap-2 relative',
                          isActive
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border bg-card',
                        )}
                      >
                        {isActive && (
                          <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                        )}
                        <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border border-background shadow-sm">
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-xs leading-tight">
                            <span>{p.name}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                            <span>{p.description}</span>
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  <span>Tom de Voz (Áudio)</span>
                </Label>
                <Select
                  value={aiSettings.aiVoiceId}
                  onValueChange={(val) => setAiSettings({ ...aiSettings, aiVoiceId: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a voz" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="text-sm font-semibold mb-2 flex justify-between items-center">
                  <span>Instruções da Bia</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Regras de comunicação
                  </span>
                </div>
                <Textarea
                  value={aiSettings.biaInstructions}
                  onChange={(e) =>
                    setAiSettings({ ...aiSettings, biaInstructions: e.target.value })
                  }
                  className="flex-1 min-h-[140px] resize-y text-sm leading-relaxed"
                  placeholder="Instruções de como a Bia deve falar com o cliente..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end mt-8 border-t pt-6">
          <Button
            onClick={handleSaveAI}
            disabled={isSavingAI}
            size="lg"
            className="w-full sm:w-auto text-sm font-semibold px-8 h-12 shadow-md"
          >
            {isSavingAI ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            <span>Salvar Configurações de IA</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
