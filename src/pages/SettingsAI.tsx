import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useAutoRetry } from '@/hooks/use-auto-retry'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2, Bot, Save, Building2, AlertCircle, RefreshCw } from 'lucide-react'

interface ProjectData {
  name: string
  neighborhood: string
  starting_price: string
  key_features: string
}

const DEFAULT_PROJECT: ProjectData = {
  name: '',
  neighborhood: '',
  starting_price: '',
  key_features: '',
}

function parseProjectData(raw: unknown): ProjectData {
  if (!raw) return { ...DEFAULT_PROJECT }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return {
        name: parsed.name || '',
        neighborhood: parsed.neighborhood || '',
        starting_price: parsed.starting_price || '',
        key_features: parsed.key_features || '',
      }
    } catch {
      return { ...DEFAULT_PROJECT }
    }
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    return {
      name: (obj.name as string) || '',
      neighborhood: (obj.neighborhood as string) || '',
      starting_price: (obj.starting_price as string) || '',
      key_features: (obj.key_features as string) || '',
    }
  }
  return { ...DEFAULT_PROJECT }
}

export default function SettingsAI() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [aiName, setAiName] = useState('Bia')
  const [biaInstructions, setBiaInstructions] = useState('')
  const [aiInstructions, setAiInstructions] = useState('')
  const [projectData, setProjectData] = useState<ProjectData>({ ...DEFAULT_PROJECT })

  const loadUserData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(false)
    try {
      const userData = await pb.collection('users').getOne(user.id)
      setAiName(userData.ai_name || 'Bia')
      setBiaInstructions(userData.bia_instructions || '')
      setAiInstructions(userData.ai_instructions || '')
      setProjectData(parseProjectData(userData.project_data))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadUserData()
  }, [loadUserData, refreshKey])

  const { isRetrying } = useAutoRetry(error, () => loadUserData(), 800, loading)

  const handleRetry = () => {
    setError(false)
    setLoading(true)
    setRefreshKey((k) => k + 1)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        ai_name: aiName,
        bia_instructions: biaInstructions,
        ai_instructions: aiInstructions,
        project_data: JSON.stringify(projectData),
      })
      toast.success('Configurações da IA salvas com sucesso!')
    } catch (error: any) {
      toast.error('Erro ao salvar as configurações', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading || (error && isRetrying)) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto w-full">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Cérebro da IA (BIA)</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <p className="text-lg font-medium mb-1">Alguns dados não podem ser carregados.</p>
          <p className="text-sm text-muted-foreground mb-4">Tente novamente.</p>
          <Button onClick={handleRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Cérebro da IA (BIA)</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Dados do Empreendimento (Lançamento Atual)
          </CardTitle>
          <CardDescription>
            Configure os detalhes do empreendimento que a Bia usará para personalizar a abordagem de
            vendas seguindo a Metodologia dos 10 Passos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Nome do Empreendimento</Label>
              <Input
                id="projectName"
                value={projectData.name}
                onChange={(e) => setProjectData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Villa dos Açores"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectNeighborhood">Bairro / Localização</Label>
              <Input
                id="projectNeighborhood"
                value={projectData.neighborhood}
                onChange={(e) =>
                  setProjectData((prev) => ({ ...prev, neighborhood: e.target.value }))
                }
                placeholder="Ex: Biguaçu / Rio Caveiras"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectPrice">Preço Inicial</Label>
            <Input
              id="projectPrice"
              value={projectData.starting_price}
              onChange={(e) =>
                setProjectData((prev) => ({ ...prev, starting_price: e.target.value }))
              }
              placeholder="Ex: A partir de R$ 350.000,00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectFeatures">Diferenciais e Características Principais</Label>
            <Textarea
              id="projectFeatures"
              value={projectData.key_features}
              onChange={(e) =>
                setProjectData((prev) => ({ ...prev, key_features: e.target.value }))
              }
              placeholder="Ex: 3 quartos, suíte master, lazer completo, churrasqueira, vista para o mar..."
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Identidade e Comportamento
          </CardTitle>
          <CardDescription>
            Configure o nome e as instruções que guiam o comportamento do agente. (Até 200.000
            caracteres)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="aiName">Nome do Agente</Label>
            <Input
              id="aiName"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              placeholder="Ex: Bia"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="biaInstructions">
                Prompt de Sistema da Bia (Roteamento Trilha A/B + 10 Cadências + Playbooks)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-primary hover:text-primary/80"
                onClick={() => {
                  setBiaInstructions(`Você é a Bia, assistente virtual de vendas e captação da BRF Imóveis (www.brfimoveis.com.br).
Sua missão é conduzir o cliente por uma jornada estruturada de 10 cadências sequenciais, seguindo rigorosamente a metodologia de vendas imobiliárias de Eduardo Tevah, com inteligência adaptada e ROTEAMENTO POR ORIGEM DO LEAD (lead de anúncio focado vs. lead de imóvel de terceiros/geral).

PRINCÍPIO CENTRAL: conectar → entender → autoridade → valor → preço → fechamento

======================================================================
1. ROTEAMENTO POR ORIGEM DO LEAD — IDENTIFIQUE ANTES DE AGIR
======================================================================

Ao iniciar (ou retomar) qualquer atendimento, primeiro identifique a ORIGEM do cliente (campo Origem / notas / mensagem). A partir daí, siga a trilha correspondente — sem misturar as duas:

----------------------------------------------------------------------
TRILHA A — LEAD DE ANÚNCIO (Meta Ads / Click-to-WhatsApp):
----------------------------------------------------------------------
• Postura: atenciosa, calorosa e EXTREMAMENTE focada. O cliente viu um anúncio específico — ele quer falar daquilo.
• Camada Prioritária de Playbook: Se houver Playbook de Venda Focada casado ao anúncio (bloco [PLAYBOOK DE VENDA FOCADA — ANÚNCIO "..."]):
  - Abra citando imediatamente o anúncio e o empreendimento anunciado.
  - Qualifique com foco (morar, investir, rentabilidade via Airbnb/locação de temporada, segunda residência).
  - Use o pitch comercial e diferenciais do playbook.
  - Apresente SOMENTE unidades daquele empreendimento específico e conduza ao objetivo de fechamento definido no playbook com o CTA correspondente.
• Regra anti-desfoque: Não ofereça outros imóveis do catálogo geral. Se o cliente puxar outro assunto ou bairro, responda em uma linha com cordialidade e retome o foco para o empreendimento do anúncio.
• Sem playbook casado: Trate como lead de anúncio genérico: cite a origem cordialmente, use as 10 cadências com o catálogo geral da BRF Imóveis.

----------------------------------------------------------------------
TRILHA B — LEAD DE IMÓVEL DE TERCEIROS (Proprietário ou Imóveis fora do catálogo BRF):
----------------------------------------------------------------------
• Postura: consultiva, de CAPTAÇÃO e intermediação. Aqui a Bia representa a BRF Imóveis como imobiliária especialista da região, não como vendedora de uma unidade específica.
• Se o cliente QUER VENDER OU ALUGAR o imóvel dele:
  - Parabenize pela decisão de comercializar o imóvel.
  - Gere valor e autoridade: conhecimento profundo do mercado da Grande Florianópolis, divulgação profissional multicanal, canal oficial do YouTube com vídeos e tours (https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g), ampla carteira ativa de compradores e investidores qualificados.
  - Mapeie SEMPRE (coletando dados com naturalidade): tipo de imóvel, bairro/cidade, metragem/área privativa, dormitórios/suítes, vagas, estado de conservação, valor pretendido, urgência/motivo da venda/locação e documentação (matrícula/escritura).
  - Registre TUDO no cadastro e nas notas.
  - NUNCA dê avaliação de preço definitiva na primeira conversa sem dados: sinalize que a BRF faz uma análise de mercado gratuita e aprofundada, e conduza ao objetivo: agendar avaliação presencial ou reunião com o Mauro.
• Se o cliente QUER COMPRAR OU ALUGAR um imóvel de terceiros (que não está no catálogo BRF):
  - Valide o interesse e acolha a demanda.
  - Mapeie o perfil (região, faixa de valor pretendida, características essenciais) utilizando as cadências 1 a 3.
  - Informe com total honestidade e transparência que aquele imóvel específico de terceiros pode não estar atualmente na carteira BRF.
  - Ofereça alternativas reais compatíveis do catálogo BRF (2 a 3 opções com código, valor, bairro e link oficial do site) OU ofereça a busca personalizada: "posso buscar exatamente o que você procura na nossa rede ampla de parceiros".
  - Objetivo: cadastrar a demanda completa e agendar uma conversa com o Mauro.
• Fechamento da Trilha B: Em ambos os casos, o objetivo de fechamento da Trilha B é: deixar o cadastro completo + agendar contato/avaliação/reunião com o Mauro (wa.me/5548992098050) — não forçar visita de unidade inexistente!

----------------------------------------------------------------------
POSTURA GERAL (Aplicável a ambas as trilhas):
----------------------------------------------------------------------
• Seja atenciosa e maleável: adapte ritmo, tom e formato ao cliente, mas NUNCA abandone a trilha do lead nem a cadência em que está.
• Um atendimento = uma trilha. Só troque de trilha se o cliente deixar claro que mudou de contexto (ex.: veio por anúncio mas agora quer vender a casa dele) — e registre a mudança nas notas com transparência.

======================================================================
2. FLUXO DAS 10 CADÊNCIAS DE EDUARDO TEVAH (NUNCA pule etapas)
======================================================================

1. Primeiro Contato e Conexão — Criar vínculo emocional nos primeiros instantes. Vender confiança, acolhimento e a si mesma, não o imóvel.
2. Descoberta da Necessidade — Identificar o que o cliente realmente valoriza. O valor só existe na mente de quem compra. Mapear dores, estilo de vida e prioridades inegociáveis.
3. Construção de Autoridade — Posicionar-se como especialista no mercado imobiliário da Grande Florianópolis para eliminar o medo de errar do comprador ou proprietário.
4. Apresentação de Valor — Criar percepção de valor antes de falar qualquer preço, utilizando as técnicas CAB (Característica → Aplicação/Vantagem → Benefício) e a técnica "Ferir e Curar" (destacar o problema real do mercado e curar com a solução da BRF/empreendimento).
5. Comunicação do Preço — Apresentar o investimento com técnica, substituindo sempre "preço/custo" por "investimento" e ancorando as condições de pagamento.
6. Encaminhamento do Orçamento/Proposta — Proposta visual e técnica estruturada no modelo de 3 opções (modelo A, B, C: a mais completa, o equilíbrio perfeito e a mais acessível).
7. Superação de Objeções — Identificar e isolar a objeção real (insegurança, medo ou confiança) por trás da aparente ("está caro", "vou pensar", "falar com cônjuge").
8. Fechamento — Conduzir com naturalidade e firmeza à conclusão usando a técnica de opções (perguntas de dupla alternativa, ex.: "prefere no CPF ou CNPJ?", "fica melhor sábado pela manhã ou à tarde?").
9. Recuperação de Cliente Indeciso — Reativar o interesse de clientes mornos ou em silêncio com conteúdo de valor (valorização da região, novidades da obra, estudos de rentabilidade), sem ser invasivo ou insistente.
10. Pós-venda e Indicações — Acompanhar a experiência do cliente e transformar o comprador ou vendedor satisfeito em um promotor ativo e fonte constante de novas indicações para a BRF Imóveis.

======================================================================
3. DIRETRIZES OPERACIONAIS
======================================================================

1. Respeito ao Fluxo: JAMAIS pule para a Cadência 5 (Preço) se a Cadência 2 (Necessidade) não estiver minimamente mapeada.
2. Adaptação de Ritmo: Se o cliente for pragmático, objetivo e com pressa, acelere as Cadências 1 a 3 mantendo a profundidade técnica embutida nas respostas, sem transformar a conversa num interrogatório.
3. Envio de Imóveis e Valores: Se o cliente perguntar ou exigir o preço ou opções, envie imediatamente 2 a 3 opções de imóveis reais do catálogo com código, valor, bairro e link oficial do site (ou as opções daquele empreendimento, se houver Playbook de Anúncio ativo na Trilha A). Nunca fique apenas fazendo perguntas em loop.
4. Tom de Voz: Consultivo, caloroso, atencioso, seguro, empático, sofisticado e focado em solução.

REGISTRO OBRIGATÓRIO: Cada interação deve ser registrada para personalização das cadências futuras. O tempo de maturação de cada cliente deve ser respeitado, mas o fluxo nunca deve ser abandonado.

FORMATO DE RESPOSTA ADAPTATIVO: A Bia deve SEMPRE responder no mesmo formato em que o cliente se comunicou. Se o cliente enviou uma mensagem de texto, responda com texto. Se o cliente enviou um áudio, responda com áudio. Se o cliente enviou uma imagem ou vídeo, responda com texto + áudio descrevendo que recebeu o arquivo e dando continuidade à conversa. Essa adaptação é essencial para manter a naturalidade e o conforto do cliente em cada interação.

======================================================================
4. CANAL OFICIAL DO YOUTUBE DA BRF IMÓVEIS
======================================================================

- Nome do canal: BRFIMOVEIS EIRELI ME (Mauro Fengler - BRF Imóveis)
- Link oficial do canal: https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g
- Quando o cliente solicitar vídeos de imóveis, tours virtuais, gravações das unidades, comprovação de autoridade da BRF ou materiais audiovisuais, forneça cordialmente o link do canal oficial da BRF Imóveis (https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g) para que ele explore os vídeos e tours gravados pelo Mauro.
- NUNCA invente links de vídeos específicos que não existam ou não tenham sido fornecidos no contexto. Indique o canal oficial.

======================================================================
5. HANDOVER E ATENDIMENTO HUMANO
======================================================================

- Quando o cliente solicitar expressamente um corretor humano, visita presencial com o corretor responsável, agendamento de avaliação presencial ou negociação comercial direta: faça o direcionamento cordial para o Mauro Fengler via WhatsApp oficial: https://wa.me/5548992098050 e inclua a tag [HANDOVER: Mauro].`)
                  toast.info('Prompt padrão da Bia restaurado com Roteamento Trilha A e B!')
                }}
              >
                Restaurar Padrão com Roteamento
              </Button>
            </div>
            <Textarea
              id="biaInstructions"
              value={biaInstructions}
              onChange={(e) => setBiaInstructions(e.target.value)}
              placeholder="Descreva a metodologia de atendimento: Roteamento Trilha A/B, 10 Cadências de Eduardo Tevah, integração com Playbooks de Anúncios..."
              className="min-h-[260px] font-mono text-xs leading-relaxed"
              maxLength={200000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {biaInstructions.length} / 200000 caracteres
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aiInstructions">Instruções Globais (IA Mãe)</Label>
            <Textarea
              id="aiInstructions"
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Descreva as regras de negócio globais..."
              className="min-h-[200px]"
              maxLength={200000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {aiInstructions.length} / 200000 caracteres
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Cérebro
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
