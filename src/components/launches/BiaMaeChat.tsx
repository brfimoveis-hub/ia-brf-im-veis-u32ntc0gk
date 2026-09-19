import { useState, useRef, useEffect } from 'react'
import { type Launch, type ChatMessage, chatWithBiaMae, updateLaunch } from '@/services/launches'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bot,
  Send,
  Sparkles,
  User,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  FileText,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface BiaMaeChatProps {
  launch: Launch
  onDossierUpdated: (updated: Launch) => void
}

export function BiaMaeChat({ launch, onDossierUpdated }: BiaMaeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Olá Mauro! Sou a Bia Mãe, sua Gerente de Lançamentos interna. Estou com o dossiê do "${launch.name}" aberto. Pode me colar qualquer material cru do empreendimento (tabela de unidades, valores, condições de pagamento, diferenciais, localização) ou pedir ajustes na cadência da Bia que eu formato e atualizo tudo para você.`,
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastSuggestedDossier, setLastSuggestedDossier] = useState<Partial<Launch> | null>(null)
  const [applying, setApplying] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: inputValue.trim() }
    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setInputValue('')
    setLoading(true)

    try {
      const res = await chatWithBiaMae({
        message: userMsg.content,
        launch_id: launch.id,
        history: nextHistory,
      })

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply,
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (res.suggested_dossier) {
        setLastSuggestedDossier(res.suggested_dossier)
      }
    } catch (err: any) {
      console.error('Erro ao conversar com Bia Mãe:', err)
      toast({
        title: 'Erro na resposta',
        description: err?.message || 'Não foi possível obter resposta da Bia Mãe.',
        variant: 'destructive',
      })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Desculpe, ocorreu um erro de conexão ao processar. Por favor, tente enviar novamente.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleApplySuggestion = async () => {
    if (!lastSuggestedDossier || applying) return
    setApplying(true)
    try {
      const payload: Partial<Launch> = {}
      if (lastSuggestedDossier.name) payload.name = lastSuggestedDossier.name
      if (lastSuggestedDossier.enterprise_name)
        payload.enterprise_name = lastSuggestedDossier.enterprise_name
      if (lastSuggestedDossier.headline) payload.headline = lastSuggestedDossier.headline
      if (lastSuggestedDossier.description) payload.description = lastSuggestedDossier.description
      if (lastSuggestedDossier.location) payload.location = lastSuggestedDossier.location
      if (lastSuggestedDossier.payment_terms)
        payload.payment_terms = lastSuggestedDossier.payment_terms
      if (lastSuggestedDossier.units) payload.units = lastSuggestedDossier.units
      if (lastSuggestedDossier.differentials)
        payload.differentials = lastSuggestedDossier.differentials
      if (lastSuggestedDossier.sales_arguments)
        payload.sales_arguments = lastSuggestedDossier.sales_arguments
      if (lastSuggestedDossier.specific_cadence)
        payload.specific_cadence = lastSuggestedDossier.specific_cadence

      if ((lastSuggestedDossier as any).suggest_ready_for_review && launch.status === 'rascunho') {
        payload.status = 'em_revisao'
      }

      const updated = await updateLaunch(launch.id, payload)
      onDossierUpdated(updated)
      setLastSuggestedDossier(null)

      toast({
        title: 'Dossiê atualizado!',
        description: 'As sugestões da Bia Mãe foram aplicadas às abas do lançamento.',
      })
    } catch (err: any) {
      console.error('Erro ao aplicar sugestões:', err)
      toast({
        title: 'Erro ao aplicar',
        description: 'Não foi possível gravar as alterações no lançamento.',
        variant: 'destructive',
      })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-xs">
      {/* Header do Chat */}
      <div className="p-3.5 border-b bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Bia Mãe (Gerente Interna)</span>
              <Badge
                variant="outline"
                className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                Agente Nativo
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Alimentação de dossiê, unidades e cadência em 10 passos
            </span>
          </div>
        </div>

        {lastSuggestedDossier && (
          <Button
            size="sm"
            onClick={handleApplySuggestion}
            disabled={applying}
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            {applying ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Aplicar no Dossiê
          </Button>
        )}
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1 p-4 bg-slate-50/30 dark:bg-slate-950/30">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((m, idx) => {
            const isAssistant = m.role === 'assistant'
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
              >
                {isAssistant && (
                  <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                    BM
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isAssistant
                      ? 'bg-white dark:bg-slate-800 border shadow-xs text-slate-900 dark:text-slate-100'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {/* Se houver bloco ```json_dossier escondemos a parte técnica e mostramos o badge */}
                  {m.content.replace(/```json_dossier[\s\S]*?```/g, '').trim() ||
                    'Estruturei as alterações do dossiê para você.'}
                </div>
                {!isAssistant && (
                  <div className="h-8 w-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                    MF
                  </div>
                )}
              </div>
            )
          })}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-muted-foreground p-2">
              <div className="h-8 w-8 rounded-full bg-emerald-600/50 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                BM
              </div>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                <span>Bia Mãe está organizando os dados e a cadência...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input de Envio */}
      <div className="p-3 border-t bg-white dark:bg-slate-900 space-y-2">
        <div className="relative flex items-center">
          <Textarea
            placeholder="Cole aqui a planilha de unidades, texto do folheto, valores, condições de pagamento ou peça: 'Bia, gere a cadência de 10 passos para este lançamento'..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            className="min-h-[70px] max-h-[160px] text-xs resize-none pr-12 bg-slate-50 dark:bg-slate-800"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || loading}
            className="absolute right-2.5 bottom-2.5 h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            title="Enviar para Bia Mãe (Ctrl+Enter)"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>Pressione Ctrl+Enter para enviar</span>
          <span>A Bia Mãe não atende clientes no WhatsApp — uso interno</span>
        </div>
      </div>
    </div>
  )
}
