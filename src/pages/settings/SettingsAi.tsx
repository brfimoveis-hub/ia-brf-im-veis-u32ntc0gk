import { useState, useRef, useEffect, memo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import {
  Loader2,
  Upload,
  Sparkles,
  CheckCircle2,
  FileText,
  Trash2,
  BrainCircuit,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const BIA_FULL_SYSTEM_PROMPT = `Você é a Bia, assistente virtual de vendas da BRF Imóveis (www.brfimoveis.com.br).
Sua missão é conduzir o cliente por uma jornada estruturada de 10 cadências sequenciais, seguindo rigorosamente a metodologia de vendas imobiliárias de Eduardo Tevah, com inteligência adaptada à origem do lead (anúncio focado vs. fluxo geral).

PRINCÍPIO CENTRAL: conectar → entender → autoridade → valor → preço → fechamento

======================================================================
1. ESTRUTURA DE ATENDIMENTO EM DUAS CAMADAS
======================================================================

• CAMADA BASE (Sempre Ativa — Fluxo Geral):
A metodologia das 10 cadências sequenciais de Eduardo Tevah é a espinha dorsal de todo o relacionamento. Sem um playbook de anúncio casado, a Bia opera no modo geral: explora o catálogo completo de imóveis da BRF Imóveis, identifica a necessidade ampla do cliente (localização, dormitórios, faixa de investimento) e envia 2 a 3 opções de imóveis reais do catálogo com links oficiais.

• CAMADA PRIORITÁRIA (Ativa quando houver PLAYBOOK DE VENDA FOCADA casado ao anúncio Meta):
Quando o lead chega com tag de anúncio ou click-to-whatsapp identificado e houver um bloco [PLAYBOOK DE VENDA FOCADA — ANÚNCIO "..."] no contexto, O PLAYBOOK TEM PRIORIDADE MÁXIMA SOBRE O ROTEIRO GERAL. As 10 cadências CONTINUAM sendo a espinha dorsal da conversa, mas cada uma delas é executada EXCLUSIVAMENTE ATRAVÉS DA LENTE DO EMPREENDIMENTO DO ANÚNCIO:
  1. Conexão: cita imediatamente o anúncio e o empreendimento anunciado.
  2. Descoberta da Necessidade: investiga o objetivo específico do cliente com aquele empreendimento (morar, investir, rentabilidade via Airbnb/locação de temporada, segunda residência).
  3. Autoridade: utiliza os diferenciais competitivos e argumentos do pitch comercial do playbook.
  4. Apresentação de Valor: foca estritamente nas unidades, tipologias e atributos DAQUELE empreendimento anunciado.
  5. Comunicação do Preço: utiliza os valores de partida, cotas, fluxo e condições especiais definidos no playbook (ex.: cotas a preço de custo SPE, 40x sem entrada, correção CUB, etc.).
  6. Encaminhamento de Proposta: estrutura opções dentro do próprio empreendimento (ex.: studio vista mar vs. studio lateral; planta A, B ou C).
  7. Superação de Objeções: aborda as dúvidas e resistências com os argumentos de blindagem do empreendimento.
  8. Fechamento: conduz diretamente ao objetivo definido no playbook (ex.: agendar visita ao estande de vendas, plantão ou reunião com o Mauro) utilizando o CTA final do playbook.

REGRAS ANTI-DESFOQUE COM PLAYBOOK ATIVO:
- NUNCA ofereça outros imóveis do catálogo se houver playbook ativo, a menos que o cliente diga expressamente que aquele anúncio não serve de forma alguma para ele. As opções enviadas devem ser apenas unidades do empreendimento focado.
- Se o cliente desviar para assuntos paralelos ou outros bairros, responda brevemente com cordialidade e retome imediatamente o foco para o empreendimento do anúncio.
- NUNCA abandone o cliente, mas sempre reconduza ao objetivo de fechamento estipulado no playbook.
- Esta regra PRIORITÁRIA sobrepõe a Diretriz Operacional Geral nº 3 (envio de opções gerais do catálogo).

======================================================================
2. FLUXO DAS 10 CADÊNCIAS DE EDUARDO TEVAH (NUNCA pule etapas)
======================================================================

1. Primeiro Contato e Conexão — Criar vínculo emocional. Vender confiança, não o imóvel.
2. Descoberta da Necessidade — Identificar o que o cliente realmente valoriza.
3. Construção de Autoridade — Posicionar-se como especialista.
4. Apresentação de Valor — Criar valor antes de falar preço (técnicas CAB e Ferir e Curar).
5. Comunicação do Preço — Apresentar o investimento com técnica.
6. Encaminhamento do Orçamento/Proposta — Proposta visual e técnica (modelo A, B, C).
7. Superação de Objeções — Identificar a objeção real por trás da aparente.
8. Fechamento — Conduzir à conclusão com técnica de opções.
9. Recuperação de Cliente Indeciso — Reativar interesse sem ser invasivo.
10. Pós-venda e Indicações — Transformar comprador em promotor da marca.

======================================================================
3. DIRETRIZES OPERACIONAIS
======================================================================

1. Respeito ao Fluxo: JAMAIS pule para a Cadência 5 (Preço) se a Cadência 2 (Necessidade) não estiver mapeada.
2. Adaptação de Ritmo: Se o cliente for pragmático, acelere as cadências 1 a 3, mas mantenha a profundidade técnica.
3. Envio de Imóveis e Valores: Se o cliente perguntar ou exigir o preço ou opções, envie imediatamente 2 a 3 opções de imóveis reais do catálogo com código, valor, bairro e link oficial do site (ou as unidades do empreendimento focado se houver Playbook de Anúncio ativo). Nunca fique apenas fazendo perguntas.
4. Tom de Voz: Consultivo, seguro, empático e focado em solução.

REGISTRO OBRIGATÓRIO: Cada interação deve ser registrada para personalização das cadências futuras. O tempo de maturação de cada cliente deve ser respeitado, mas o fluxo nunca deve ser abandonado.

FORMATO DE RESPOSTA ADAPTATIVO: A Bia deve SEMPRE responder no mesmo formato em que o cliente se comunicou. Se o cliente enviou uma mensagem de texto, responda com texto. Se o cliente enviou um áudio, responda com áudio. Se o cliente enviou uma imagem ou vídeo, responda com texto + áudio descrevendo que recebeu o arquivo e dando continuidade à conversa. Essa adaptação é essencial para manter a naturalidade e o conforto do cliente em cada interação.

======================================================================
4. CANAL OFICIAL DO YOUTUBE DA BRF IMÓVEIS
======================================================================

- Nome do canal: BRFIMOVEIS EIRELI ME (Mauro Fengler - BRF Imóveis)
- Link oficial do canal: https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g
- Quando o cliente solicitar vídeos de imóveis, tours virtuais, gravações das unidades ou materiais audiovisuais, forneça cordialmente o link do canal oficial da BRF Imóveis (https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g) para que ele explore os vídeos e tours gravados pelo Mauro.
- NUNCA invente links de vídeos específicos que não existam ou não tenham sido fornecidos no contexto. Indique o canal oficial.

======================================================================
5. HANDOVER E ATENDIMENTO HUMANO
======================================================================

- Quando o cliente solicitar expressamente um corretor humano, visita presencial com o corretor responsável ou negociação comercial direta: faça o direcionamento cordial para o Mauro Fengler via WhatsApp oficial: https://wa.me/5548992098050 e inclua a tag [HANDOVER: Mauro].`

const DEFAULT_PRESETS = {
  bia_elegante: {
    id: 'bia_elegante',
    name: 'BIA Elegante',
    instructions: BIA_FULL_SYSTEM_PROMPT,
    voice_id: 'nova',
    avatar_url: 'https://img.usecurling.com/p/256/256?q=elegant%20young%20woman%20smiling',
  },
  bia_jovem: {
    id: 'bia_jovem',
    name: 'BIA Jovem',
    instructions: BIA_FULL_SYSTEM_PROMPT,
    voice_id: 'shimmer',
    avatar_url: 'https://img.usecurling.com/p/256/256?q=friendly%20young%20woman',
  },
  bia_executiva: {
    id: 'bia_executiva',
    name: 'BIA Executiva',
    instructions: BIA_FULL_SYSTEM_PROMPT,
    voice_id: 'alloy',
    avatar_url: 'https://img.usecurling.com/p/256/256?q=professional%20woman%20suit',
  },
}

type ProfileId = keyof typeof DEFAULT_PRESETS

const MAX_INSTRUCTIONS_LENGTH = 400000

const OptimizedTextarea = memo(
  ({
    id,
    value,
    onChange,
    placeholder,
    className,
    maxLength,
  }: {
    id?: string
    value: string
    onChange: (val: string) => void
    placeholder?: string
    className?: string
    maxLength: number
  }) => {
    const [localValue, setLocalValue] = useState(value)

    useEffect(() => {
      setLocalValue(value)
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalValue(e.target.value)
    }

    const handleBlur = () => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }

    return (
      <div className="space-y-1 w-full">
        <Textarea
          id={id}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={className}
          maxLength={maxLength}
        />
        <div
          className={cn(
            'text-right text-xs font-medium',
            localValue.length >= maxLength ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {localValue.length.toLocaleString('pt-BR')} / {maxLength.toLocaleString('pt-BR')}
        </div>
      </div>
    )
  },
)
OptimizedTextarea.displayName = 'OptimizedTextarea'

export function SettingsAi() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeProfileId, setActiveProfileId] = useState<ProfileId>('bia_elegante')
  const [profiles, setProfiles] = useState(DEFAULT_PRESETS)

  const [aiName, setAiName] = useState('')
  const [biaInstructions, setBiaInstructions] = useState('')
  const [aiInstructions, setAiInstructions] = useState('')
  const [aiVoiceId, setAiVoiceId] = useState('')

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [knowledgeFiles, setKnowledgeFiles] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState<string[]>([])
  const [filesToRemove, setFilesToRemove] = useState<string[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    const savedProfiles = localStorage.getItem('bia_profiles_custom')
    if (savedProfiles) {
      try {
        const parsed = JSON.parse(savedProfiles)
        if (!parsed.bia_elegante) {
          localStorage.removeItem('bia_profiles_custom')
        } else {
          setProfiles(parsed)
        }
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    if (user && !initialized.current) {
      setAiName(user.ai_name || profiles.bia_elegante.name)
      setBiaInstructions(user.bia_instructions || profiles.bia_elegante.instructions)
      setAiInstructions(user.ai_instructions || '')
      setAiVoiceId(user.ai_voice_id || profiles.bia_elegante.voice_id)
      setExistingFiles(user.ai_knowledge_files || [])

      if (user.ai_avatar) {
        setAvatarPreview(pb.files.getURL(user, user.ai_avatar))
      } else {
        setAvatarPreview(profiles.bia_elegante.avatar_url)
      }

      const found = Object.values(profiles).find((p) => p.name === user.ai_name)
      if (found) setActiveProfileId(found.id as ProfileId)

      initialized.current = true
    }
  }, [user, profiles])

  const handleSelectProfile = (profileId: ProfileId) => {
    setActiveProfileId(profileId)
    const profile = profiles[profileId]
    setAiName(profile.name)
    setBiaInstructions(profile.instructions)
    setAiVoiceId(profile.voice_id)
    setAvatarPreview(profile.avatar_url)
    setAvatarFile(null)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const objUrl = URL.createObjectURL(file)
      setAvatarPreview(objUrl)

      setProfiles((prev) => {
        const updated = {
          ...prev,
          [activeProfileId]: {
            ...prev[activeProfileId],
            avatar_url: objUrl,
          },
        }
        localStorage.setItem('bia_profiles_custom', JSON.stringify(updated))
        return updated
      })
    }
  }

  const handleDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setKnowledgeFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeNewFile = (index: number) => {
    setKnowledgeFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingFile = (filename: string) => {
    setExistingFiles((prev) => prev.filter((f) => f !== filename))
    setFilesToRemove((prev) => [...prev, filename])
  }

  const handleFieldChange = (field: string, value: string) => {
    if (field === 'name') setAiName(value)
    if (field === 'bia_instructions') setBiaInstructions(value)
    if (field === 'voice_id') setAiVoiceId(value)

    setProfiles((prev) => {
      const updated = {
        ...prev,
        [activeProfileId]: {
          ...prev[activeProfileId],
          [field]: value,
        },
      }
      localStorage.setItem('bia_profiles_custom', JSON.stringify(updated))
      return updated
    })
  }

  const handleSave = async () => {
    if (!user) return

    if (aiInstructions.length > MAX_INSTRUCTIONS_LENGTH) {
      toast({
        title: 'Erro de Validação',
        description: `As instruções da IA Mãe excedem o limite de ${MAX_INSTRUCTIONS_LENGTH.toLocaleString('pt-BR')} caracteres.`,
        variant: 'destructive',
      })
      return
    }

    if (biaInstructions.length > MAX_INSTRUCTIONS_LENGTH) {
      toast({
        title: 'Erro de Validação',
        description: `As instruções da Persona excedem o limite de ${MAX_INSTRUCTIONS_LENGTH.toLocaleString('pt-BR')} caracteres.`,
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    setFieldErrors({})
    try {
      const formData = new FormData()
      formData.append('ai_name', aiName)
      formData.append('bia_instructions', biaInstructions)
      formData.append('ai_instructions', aiInstructions)
      formData.append('ai_voice_id', aiVoiceId)

      if (avatarFile) {
        formData.append('ai_avatar', avatarFile)
      } else if (
        avatarPreview &&
        avatarPreview.startsWith('http') &&
        !avatarPreview.includes(pb.baseUrl)
      ) {
        try {
          const res = await fetch(avatarPreview)
          const blob = await res.blob()
          formData.append('ai_avatar', new File([blob], 'avatar.jpg', { type: blob.type }))
        } catch (e) {
          console.error('Failed to fetch preset avatar', e)
        }
      }

      knowledgeFiles.forEach((file) => {
        formData.append('ai_knowledge_files', file)
      })

      filesToRemove.forEach((filename) => {
        formData.append('ai_knowledge_files-', filename)
      })

      const updatedUser = await pb.collection('users').update(user.id, formData)

      try {
        await pb.collection('system_logs').create({
          user_id: user.id,
          type: 'ai_evolution',
          message: 'AI Persona & Mother AI Updated',
          details: `Persona mudou para: ${aiName}`,
          payload: { ai_name: aiName, bia_instructions: biaInstructions },
        })
      } catch {
        // ignore
      }

      pb.authStore.save(pb.authStore.token, updatedUser)

      if (updatedUser.ai_avatar) {
        const newAvatarUrl = pb.files.getURL(updatedUser, updatedUser.ai_avatar)
        setAvatarPreview(newAvatarUrl)

        setProfiles((prev) => {
          const updated = {
            ...prev,
            [activeProfileId]: {
              ...prev[activeProfileId],
              avatar_url: newAvatarUrl,
            },
          }
          localStorage.setItem('bia_profiles_custom', JSON.stringify(updated))
          return updated
        })
      }

      setKnowledgeFiles([])
      setFilesToRemove([])
      setExistingFiles(updatedUser.ai_knowledge_files || [])

      toast({
        title: 'Sucesso',
        description:
          'Configurações da IA salvas com sucesso! A nova capacidade de processamento está ativa.',
      })
    } catch (err) {
      console.error(err)
      const errors = extractFieldErrors(err)
      setFieldErrors(errors)
      toast({
        title: 'Erro',
        description: 'Verifique os erros nos campos e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="h-6 w-6 text-primary" />
            <CardTitle>IA Mãe - Base de Conhecimento</CardTitle>
          </div>
          <CardDescription>
            Defina o conhecimento central e diretrizes globais de negócio. Isso alimenta a
            inteligência de todas as interações e sobrepõe-se à persona. Suporta até{' '}
            {MAX_INSTRUCTIONS_LENGTH.toLocaleString('pt-BR')} caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="aiInstructions" className="text-base font-semibold">
              Instruções da IA Mãe
            </Label>
            <p className="text-sm text-muted-foreground">
              Descreva como a IA deve tratar o negócio, produtos, objeções frequentes e regras de
              funil.
            </p>
            <OptimizedTextarea
              id="aiInstructions"
              value={aiInstructions}
              onChange={setAiInstructions}
              placeholder="Ex: Somos a construtora BRF. Nossos empreendimentos possuem alto padrão..."
              className={`min-h-[180px] resize-y ${fieldErrors.ai_instructions ? 'border-destructive' : ''}`}
              maxLength={MAX_INSTRUCTIONS_LENGTH}
            />
            {fieldErrors.ai_instructions && (
              <p className="text-xs text-destructive">{fieldErrors.ai_instructions}</p>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-semibold">Arquivos de Conhecimento</Label>
            <p className="text-sm text-muted-foreground">
              Faça o upload de tabelas de preços, e-books e scripts (PDF, TXT, CSV, XLSX).
            </p>

            <div className="flex flex-col gap-4">
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.csv,.xlsx"
                className="hidden"
                ref={docInputRef}
                onChange={handleDocsChange}
              />
              <Button
                variant="outline"
                onClick={() => docInputRef.current?.click()}
                className="w-fit border-dashed border-2 hover:bg-muted/50"
              >
                <Upload className="mr-2 h-4 w-4" /> Adicionar Arquivos
              </Button>

              <div className="grid gap-2 mt-2">
                {existingFiles.map((filename) => (
                  <div
                    key={filename}
                    className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border text-sm"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{filename}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive/90"
                      onClick={() => removeExistingFile(filename)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {knowledgeFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20 text-sm"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive/90"
                      onClick={() => removeNewFile(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle>Comportamento e Persona da BIA</CardTitle>
          </div>
          <CardDescription>
            Selecione e ajuste o tom de voz e a imagem da sua assistente virtual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(profiles).map((profile) => (
              <Card
                key={profile.id}
                className={cn(
                  'cursor-pointer transition-all',
                  activeProfileId === profile.id
                    ? 'border-primary shadow-md ring-1 ring-primary/30 bg-primary/5'
                    : 'border-border/50 hover:border-primary/50',
                )}
                onClick={() => handleSelectProfile(profile.id as ProfileId)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                  <Avatar
                    className={cn(
                      'h-16 w-16 border-2',
                      activeProfileId === profile.id ? 'border-primary' : 'border-transparent',
                    )}
                  >
                    <AvatarImage src={profile.avatar_url} className="object-cover" />
                    <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold flex items-center justify-center gap-1.5 text-sm">
                      {activeProfileId === profile.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                      {profile.name}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="pt-6 border-t space-y-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0 items-center sm:items-start">
              <Avatar className="h-24 w-24 border shadow-sm">
                <AvatarImage src={avatarPreview || ''} alt="AI Avatar" className="object-cover" />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {aiName?.charAt(0) || 'IA'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-3 text-center sm:text-left">
                <div>
                  <Label className="text-base">Foto de Perfil</Label>
                  <p className="text-sm text-muted-foreground">
                    Esta imagem representará a IA nas conversas.
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={avatarInputRef}
                  onChange={handleAvatarChange}
                />
                <Button
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-fit mx-auto sm:mx-0"
                  size="sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Carregar Imagem
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aiName">Nome da Persona</Label>
                  <Input
                    id="aiName"
                    value={aiName}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Ex: BIA Executiva"
                    className={fieldErrors.ai_name ? 'border-destructive' : ''}
                  />
                  {fieldErrors.ai_name && (
                    <p className="text-xs text-destructive">{fieldErrors.ai_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aiVoiceId">ID da Voz (Síntese)</Label>
                  <Input
                    id="aiVoiceId"
                    value={aiVoiceId}
                    onChange={(e) => handleFieldChange('voice_id', e.target.value)}
                    placeholder="Ex: pJ23x..."
                    className={fieldErrors.ai_voice_id ? 'border-destructive' : ''}
                  />
                  {fieldErrors.ai_voice_id && (
                    <p className="text-xs text-destructive">{fieldErrors.ai_voice_id}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="biaInstructions">Instruções da Persona (Bia)</Label>
                <OptimizedTextarea
                  id="biaInstructions"
                  value={biaInstructions}
                  onChange={(val) => handleFieldChange('bia_instructions', val)}
                  placeholder="Instruções de tom de voz e comportamento da IA..."
                  className={`min-h-[120px] resize-y ${fieldErrors.bia_instructions ? 'border-destructive' : ''}`}
                  maxLength={MAX_INSTRUCTIONS_LENGTH}
                />
                {fieldErrors.bia_instructions && (
                  <p className="text-xs text-destructive">{fieldErrors.bia_instructions}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 pt-4 flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            )}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
