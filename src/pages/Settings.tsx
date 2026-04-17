import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  UploadCloud,
  Save,
  Key,
  FileText,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Settings() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [prompt, setPrompt] = useState(
    'Você é um assistente virtual de vendas especializado em produtos SaaS. Seja sempre educado, objetivo e utilize emojis ocasionalmente.',
  )

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: 'Configurações salvas!',
        description: 'As alterações foram aplicadas com sucesso na instância 55 48 992098050.',
      })
    }, 1500)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-secondary">Configurações da IA</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie o comportamento e o conhecimento do seu agente inteligente.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Cadence Management */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-purple-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <SettingsIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Gerenciamento de Cadências (Pipeline CRM)</CardTitle>
                <CardDescription>
                  Configure os gatilhos e objetivos para as 10 fases do seu processo comercial
                  automático.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 p-4 border rounded-xl bg-muted/20">
                <Label className="text-sm font-semibold text-secondary">
                  Gatilho Fase 1 para 2 (Contato Inicial)
                </Label>
                <Input defaultValue="Cliente enviou a primeira mensagem (Lead Novo)" />
                <p className="text-xs text-muted-foreground">
                  Regra avaliada pela IA para iniciar a primeira tentativa de contato.
                </p>
              </div>
              <div className="space-y-3 p-4 border rounded-xl bg-muted/20">
                <Label className="text-sm font-semibold text-secondary">
                  Gatilho Fase 4 para 5 (Qualificação)
                </Label>
                <Input defaultValue="IA identificou dor de negócio e confirmou budget" />
                <p className="text-xs text-muted-foreground">
                  Critério de sucesso estabelecido para marcar como Qualificado.
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-2 font-medium">
              Ver e editar todas as 10 configurações de cadência
            </Button>
          </CardContent>
        </Card>

        {/* AI Personality */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-primary w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <SettingsIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Personalidade e Comportamento</CardTitle>
                <CardDescription>
                  Defina o prompt do sistema que guiará as respostas da IA.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <Label htmlFor="system-prompt" className="text-sm font-semibold text-secondary">
                Prompt do Sistema
              </Label>
              <Textarea
                id="system-prompt"
                placeholder="Ex: Você é um atendente..."
                className="min-h-[180px] resize-y bg-card border-muted-foreground/20 font-mono text-sm shadow-inner focus-visible:ring-primary"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="bg-primary/5 rounded-lg p-3 flex items-start gap-2 border border-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-primary font-semibold">Dica:</strong> Especifique o tom de
                  voz, o idioma padrão, restrições de assunto e como a IA deve lidar com situações
                  que não sabe responder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card className="border-border shadow-elevation">
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Base de Conhecimento</CardTitle>
                <CardDescription>
                  Faça upload de documentos para dar contexto especializado à IA.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-10 text-center bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer group">
              <div className="mx-auto w-16 h-16 bg-background shadow-sm border rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h4 className="text-base font-semibold text-secondary">
                Clique ou arraste arquivos aqui
              </h4>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                A IA lerá estes documentos para responder perguntas dos clientes. Suporta PDF, TXT e
                CSV. Max 10MB.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                Arquivos Ativos{' '}
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px]">
                  1 arquivo
                </span>
              </Label>
              <div className="flex items-center justify-between p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-secondary">
                      catalogo_produtos_2026.pdf
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      2.4 MB • Adicionado em 10/04/2026
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Remover
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations & API */}
        <Card className="border-border shadow-elevation">
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração e Chaves de API</CardTitle>
                <CardDescription>
                  Configure as chaves de acesso do Uazapi e do provedor de inteligência.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="uazapi-token" className="font-semibold text-secondary">
                  Uazapi Token
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="uazapi-token"
                    type="password"
                    placeholder="••••••••••••••••"
                    defaultValue="token_simulation_123"
                    className="pl-10 h-11 bg-muted/30 focus-visible:ring-amber-500"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="openai-key" className="font-semibold text-secondary">
                  OpenAI API Key
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-••••••••••••••••"
                    defaultValue="sk-simulation_456"
                    className="pl-10 h-11 bg-muted/30 focus-visible:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border flex justify-end md:pl-[var(--sidebar-width)] z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl w-full mx-auto flex justify-end items-center gap-4 px-4 md:px-0">
          <span className="text-sm text-muted-foreground hidden sm:inline-block">
            Modificações não salvas
          </span>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="shadow-md px-8 h-11 hover:scale-105 transition-transform"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                Aplicando...
              </span>
            ) : (
              <span className="flex items-center gap-2 font-medium">
                <Save className="h-5 w-5" />
                Salvar Alterações
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
