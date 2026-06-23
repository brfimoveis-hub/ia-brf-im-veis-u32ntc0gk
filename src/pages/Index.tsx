import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  User as UserIcon,
  Activity,
  Save,
  BrainCircuit,
  FileText,
  MessageSquare,
  Network,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { RecordModel } from 'pocketbase'

export default function Dashboard() {
  const { user: authUser } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [userSettings, setUserSettings] = useState<RecordModel | null>(null)
  const [customers, setCustomers] = useState<RecordModel[]>([])
  const [cadences, setCadences] = useState<RecordModel[]>([])

  const [biaInstructions, setBiaInstructions] = useState('')
  const [aiInstructions, setAiInstructions] = useState('')
  const [isSavingBia, setIsSavingBia] = useState(false)
  const [isSavingAi, setIsSavingAi] = useState(false)
  const [isApplyingPreset, setIsApplyingPreset] = useState<string | null>(null)

  const [isSyncing, setIsSyncing] = useState(false)

  const PRESETS = [
    {
      id: 'profissional',
      name: 'Bia Profissional',
      description: 'Meia idade, vestimenta de corretora profissional',
      tone: 'Profissional / Formal',
      voiceId: 'professional_female',
    },
    {
      id: 'amigavel',
      name: 'Bia Amigável',
      description: 'Comunicativa e acolhedora',
      tone: 'Amigável',
      voiceId: 'friendly_female',
    },
    {
      id: 'executiva',
      name: 'Bia Executiva',
      description: 'Focada em resultados e direta',
      tone: 'Executivo',
      voiceId: 'executive_female',
    },
  ]

  const loadData = async () => {
    if (!authUser?.id) return
    try {
      const [uRes, cRes, cadRes] = await Promise.all([
        pb.collection('users').getOne(authUser.id),
        pb.collection('customers').getFullList(),
        pb.collection('cadences').getFullList({ sort: 'order' }),
      ])
      setUserSettings(uRes)
      setBiaInstructions(uRes.bia_instructions || '')
      setAiInstructions(uRes.ai_instructions || '')
      setCustomers(cRes)
      setCadences(cadRes)
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
      setBiaInstructions(e.record.bia_instructions || '')
      setAiInstructions(e.record.ai_instructions || '')
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

  const handleSaveBia = async () => {
    if (!authUser?.id) return
    setIsSavingBia(true)
    try {
      await pb.collection('users').update(authUser.id, { bia_instructions: biaInstructions })
      toast({ title: 'Sucesso', description: 'Instruções da Bia atualizadas.' })
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar as instruções da Bia.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingBia(false)
    }
  }

  const handleSaveAi = async () => {
    if (!authUser?.id) return
    setIsSavingAi(true)
    try {
      await pb.collection('users').update(authUser.id, { ai_instructions: aiInstructions })
      toast({ title: 'Sucesso', description: 'Diretrizes da IA Mãe atualizadas.' })
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar as diretrizes da IA.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingAi(false)
    }
  }

  const handleApplyPreset = async (presetId: string) => {
    if (isApplyingPreset) return
    setIsApplyingPreset(presetId)
    try {
      await pb.send('/backend/v1/users/bia-preset', {
        method: 'POST',
        body: JSON.stringify({ presetId }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast({
        title: 'Persona Aplicada',
        description: 'A Bia foi atualizada com a nova persona e foto de perfil.',
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao aplicar persona.' })
    } finally {
      setIsApplyingPreset(null)
    }
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
        <p className="text-muted-foreground mt-1">Gerencie seu ambiente do CRM Inteligente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm lg:col-span-1 h-fit">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Conexão Uazapi
            </CardTitle>
            <CardDescription>Status da integração com WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Status da API</p>
                {isConnected ? (
                  <Badge
                    variant="default"
                    className="bg-green-500 hover:bg-green-600 font-medium px-3 py-1 text-sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="font-medium px-3 py-1 text-sm">
                    <XCircle className="h-4 w-4 mr-2" /> Offline / Desconectado
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-1">Instância</p>
                <p className="font-semibold text-lg">
                  {userSettings?.uazapi_instance_number || '---'}
                </p>
              </div>
            </div>

            {hasUazapiConfig && !isConnected && (
              <div className="pt-2">
                <Button
                  onClick={handleResync}
                  disabled={isSyncing}
                  variant="outline"
                  className="w-full h-11 border-primary/20 hover:bg-primary/5"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2 text-primary" />
                  )}
                  Re-sincronizar Conexão
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm flex flex-col">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                Bia Atendente
              </CardTitle>
              <CardDescription>Assistente de linha de frente no WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col space-y-6">
              <div className="flex gap-4 items-center">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-secondary flex items-center justify-center border-2 border-background shadow-sm shrink-0">
                  {userSettings?.ai_avatar ? (
                    <img
                      src={pb.files.getURL(userSettings, userSettings.ai_avatar)}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome da Assistente
                  </p>
                  <p className="font-bold text-lg">{userSettings?.ai_name || 'Bia'}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {isConnected ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Ativa / Conectada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Aguardando Conexão
                      </Badge>
                    )}
                    {userSettings?.ai_voice_id && (
                      <Badge variant="secondary" className="text-[10px]">
                        Tom:{' '}
                        {PRESETS.find((p) => p.voiceId === userSettings.ai_voice_id)?.tone ||
                          'Personalizado'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Personas Prontas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.id)}
                      className={cn(
                        'cursor-pointer border rounded-lg p-3 hover:border-primary/50 transition-all flex flex-col relative',
                        userSettings?.ai_voice_id === preset.voiceId
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card',
                        isApplyingPreset === preset.id && 'opacity-70 pointer-events-none',
                      )}
                    >
                      {isApplyingPreset === preset.id && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}
                      <p className="font-semibold text-sm">{preset.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 flex-1">
                        {preset.description}
                      </p>
                      <Badge variant="secondary" className="mt-2 w-fit text-[10px]">
                        {preset.tone}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-sm font-semibold mb-2 flex justify-between items-center">
                  Instruções de Atendimento
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Editável manualmente
                  </span>
                </label>
                <Textarea
                  value={biaInstructions}
                  onChange={(e) => setBiaInstructions(e.target.value)}
                  className="flex-1 min-h-[160px] resize-y text-sm"
                  placeholder="Instruções de como a Bia deve falar com o cliente..."
                />
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-6 px-6">
              <Button onClick={handleSaveBia} disabled={isSavingBia} className="w-full">
                {isSavingBia ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Instruções da Bia
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-sm flex flex-col border-primary/20">
            <CardHeader className="pb-4 border-b bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                IA Mãe (Gestora)
              </CardTitle>
              <CardDescription>Gestora de Informações e Orquestradora</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col space-y-4">
              <div className="bg-muted/50 rounded-md p-3 text-sm flex items-start gap-3">
                <Network className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed text-xs">
                  A <strong className="text-foreground">IA Mãe</strong> analisa os dados, arquivos e
                  histórico do CRM. Ela toma decisões e alimenta a{' '}
                  <strong className="text-foreground">Bia Atendente</strong> com o contexto e os
                  próximos passos.
                </p>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-sm font-semibold mb-2">Diretrizes da Gestora</label>
                <Textarea
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  className="flex-1 min-h-[160px] resize-y text-sm"
                  placeholder="Instruções para análise e gestão de informações..."
                />
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex justify-between items-center">
                  Base de Conhecimento
                  <Badge variant="secondary" className="font-mono">
                    {knowledgeFiles.length}
                  </Badge>
                </p>
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
                  <p className="text-xs text-muted-foreground">Nenhum arquivo global carregado.</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-6 px-6">
              <Button
                onClick={handleSaveAi}
                disabled={isSavingAi}
                variant="secondary"
                className="w-full"
              >
                {isSavingAi ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Diretrizes da IA Mãe
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Funil de Cadência Automatizado (10 Estágios)</CardTitle>
          <CardDescription>Movimentação automática guiada pelas interações da IA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stages.map((stage, idx) => (
              <div
                key={stage}
                className="bg-card border shadow-sm rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-primary/50 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-muted group-hover:bg-primary transition-colors duration-300" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  Etapa {idx + 1}
                </span>
                <span className="font-bold text-sm mb-3 text-card-foreground line-clamp-1">
                  {stage}
                </span>
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-xl font-black mb-1 transition-colors duration-300',
                    customerCountsByStage[stage] > 0
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {customerCountsByStage[stage] || 0}
                </div>
                <span className="text-[10px] text-muted-foreground uppercase">clientes</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
