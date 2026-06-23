import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Check, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const AVATAR_PRESETS = [
  { id: 'prof1', url: 'https://img.usecurling.com/p/256/256?q=mature%20woman%20blazer' },
  { id: 'prof2', url: 'https://img.usecurling.com/p/256/256?q=professional%20woman%20smiling' },
  { id: 'prof3', url: 'https://img.usecurling.com/p/256/256?q=corporate%20woman%20portrait' },
  { id: 'prof4', url: 'https://img.usecurling.com/p/256/256?q=elegant%20business%20woman' },
]

export default function SettingsBia() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [aiName, setAiName] = useState('Bia')
  const [biaInstructions, setBiaInstructions] = useState('')
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null)
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setAiName(user.ai_name && user.ai_name !== 'Bia Jovem' ? user.ai_name : 'Bia')
      setBiaInstructions(user.bia_instructions || '')

      if (user.ai_avatar) {
        const url = pb.files.getURL(user, user.ai_avatar)
        setSavedAvatarUrl(url)
      } else {
        setSavedAvatarUrl(null)
      }
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)

    try {
      const finalName = aiName.trim().toLowerCase() === 'bia jovem' ? 'Bia' : aiName.trim() || 'Bia'

      const formData = new FormData()
      formData.append('ai_name', finalName)
      formData.append('bia_instructions', biaInstructions)

      if (selectedAvatarUrl) {
        const res = await fetch(selectedAvatarUrl)
        const blob = await res.blob()
        formData.append('ai_avatar', blob, 'avatar.jpg')
      }

      await pb.collection('users').update(user.id, formData)

      setAiName(finalName)
      setSelectedAvatarUrl(null)

      await pb.collection('users').authRefresh()

      if (pb.authStore.record?.ai_avatar) {
        setSavedAvatarUrl(pb.files.getURL(pb.authStore.record, pb.authStore.record.ai_avatar))
      }

      toast({
        title: 'Identidade atualizada',
        description: 'As configurações da Bia foram salvas com sucesso.',
      })
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar a identidade da Bia.',
      })
    } finally {
      setLoading(false)
    }
  }

  const previewAvatar = selectedAvatarUrl || savedAvatarUrl || AVATAR_PRESETS[0].url
  const displayAiName = aiName.trim() || 'Bia'

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Identidade da Bia</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Configure a aparência profissional e o comportamento da sua assistente virtual
          imobiliária.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle>Aparência da Assistente</CardTitle>
              <CardDescription>
                Selecione um avatar que transmita confiança, maturidade e profissionalismo.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatarUrl(preset.url)}
                    className={cn(
                      'relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 transition-all duration-300 hover:opacity-90 hover:scale-[1.02]',
                      selectedAvatarUrl === preset.url
                        ? 'border-primary ring-4 ring-primary/20 ring-offset-2'
                        : 'border-slate-200 hover:border-primary/50',
                    )}
                  >
                    <img
                      src={preset.url}
                      alt="Opção de avatar profissional"
                      className="h-full w-full object-cover"
                    />
                    {selectedAvatarUrl === preset.url && (
                      <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md animate-in fade-in zoom-in-50">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {!selectedAvatarUrl && savedAvatarUrl && (
                <div className="mt-8 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-slate-200 shadow-sm">
                    <img
                      src={savedAvatarUrl}
                      alt="Avatar atual"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Avatar Atual</p>
                    <p className="text-sm text-slate-500">
                      Este é o avatar profissional exibido para seus clientes atualmente.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle>Informações de Atendimento</CardTitle>
              <CardDescription>
                Defina o nome e as instruções de como a Bia deve conduzir as conversas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="aiName" className="font-semibold text-slate-700">
                  Nome da Assistente
                </Label>
                <Input
                  id="aiName"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="Ex: Bia"
                  className="max-w-md bg-white"
                />
                <p className="text-sm text-slate-500">
                  Recomendamos manter "Bia" para consistência da marca. O sistema corrigirá
                  automaticamente referências incorretas.
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="biaInstructions" className="font-semibold text-slate-700">
                  Instruções de Atendimento (Bia)
                </Label>
                <Textarea
                  id="biaInstructions"
                  value={biaInstructions}
                  onChange={(e) => setBiaInstructions(e.target.value)}
                  placeholder="Instruções de comportamento, tom de voz cordial, saudações corporativas..."
                  className="min-h-[180px] bg-white resize-y"
                />
                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 border border-blue-100 flex items-start gap-3">
                  <div className="mt-0.5">ℹ️</div>
                  <p>
                    <strong>Atenção:</strong> Estas instruções não interferem na "IA Mãe"
                    (estrategista). Elas são usadas apenas para definir a personalidade da atendente
                    final durante a comunicação.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-slate-100 bg-slate-50/50 p-6">
              <Button onClick={handleSave} disabled={loading} size="lg" className="px-8 shadow-sm">
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Check className="mr-2 h-5 w-5" />
                )}
                Salvar Identidade
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6 overflow-hidden border-slate-200 shadow-md">
            <div className="bg-[#075E54] p-4 text-white shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-full bg-white/20 border border-white/20 shadow-sm">
                  <img
                    src={previewAvatar}
                    alt="Preview Avatar"
                    className="h-full w-full object-cover transition-opacity duration-300"
                  />
                </div>
                <div>
                  <h3 className="font-semibold leading-none text-[15px]">{displayAiName}</h3>
                  <p className="text-xs text-white/80 mt-1">Conta comercial</p>
                </div>
              </div>
            </div>

            <div className="bg-[#E5DDD5] p-5 min-h-[400px] relative flex flex-col gap-5">
              <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                  backgroundImage:
                    'url("https://img.usecurling.com/p/512/512?q=whatsapp%20pattern")',
                }}
              />

              <div className="relative z-10 self-center rounded-lg bg-[#E1F3FB] px-3 py-1.5 text-[11px] uppercase tracking-wide font-medium text-slate-600 shadow-sm">
                Hoje
              </div>

              <div className="relative z-10 flex w-[90%] flex-col gap-1.5 self-start rounded-2xl rounded-tl-none bg-white p-3.5 shadow-sm animate-in slide-in-from-left-4 fade-in duration-500">
                <p className="text-[15px] leading-relaxed text-slate-800">
                  Olá! Sou a <strong>{displayAiName}</strong>, assistente virtual da imobiliária.
                  Como posso ajudar você a encontrar o imóvel ideal hoje?
                </p>
                <span className="self-end text-[11px] text-slate-400 font-medium">10:00</span>
              </div>

              <div className="relative z-10 flex w-[90%] flex-col gap-1.5 self-end rounded-2xl rounded-tr-none bg-[#DCF8C6] p-3.5 shadow-sm animate-in slide-in-from-right-4 fade-in duration-500 delay-150 fill-mode-both">
                <p className="text-[15px] leading-relaxed text-slate-800">
                  Olá {displayAiName}, estou procurando um apartamento de alto padrão com 3 suítes
                  no centro.
                </p>
                <div className="flex items-center gap-1.5 self-end">
                  <span className="text-[11px] text-slate-500 font-medium">10:02</span>
                  <Check className="h-3.5 w-3.5 text-blue-500" />
                </div>
              </div>

              <div className="relative z-10 flex w-[90%] flex-col gap-1.5 self-start rounded-2xl rounded-tl-none bg-white p-3.5 shadow-sm animate-in slide-in-from-left-4 fade-in duration-500 delay-300 fill-mode-both">
                <p className="text-[15px] leading-relaxed text-slate-800">
                  Perfeito. Temos excelentes opções exclusivas com esse perfil. Posso fazer algumas
                  perguntas rápidas para refinar as opções e enviar as melhores oportunidades?
                </p>
                <span className="self-end text-[11px] text-slate-400 font-medium">10:03</span>
              </div>
            </div>

            <div className="bg-[#F0F0F0] p-3.5 flex items-center gap-3">
              <div className="flex-1 bg-white rounded-full px-5 py-3 text-[15px] text-slate-400 shadow-sm flex items-center">
                Mensagem
              </div>
              <div className="h-12 w-12 rounded-full bg-[#00A884] flex items-center justify-center text-white shadow-sm hover:bg-[#009677] transition-colors cursor-pointer">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
