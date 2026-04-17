import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  BookOpen,
  DollarSign,
  FileText,
  Plus,
  Save,
  Trash2,
  AlertTriangle,
  Link as LinkIcon,
  Library,
} from 'lucide-react'

interface Ebook {
  id: string
  title: string
  url: string
}

export default function KnowledgeBase() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [priceTable, setPriceTable] = useState('')
  const [orientations, setOrientations] = useState('')
  const [ebooks, setEbooks] = useState<Ebook[]>([
    { id: '1', title: 'Guia Prático de Vendas 2026', url: 'https://exemplo.com/guia.pdf' },
  ])

  const addEbook = () => {
    setEbooks([...ebooks, { id: Date.now().toString(), title: '', url: '' }])
  }

  const removeEbook = (id: string) => {
    setEbooks(ebooks.filter((e) => e.id !== id))
  }

  const updateEbook = (id: string, field: 'title' | 'url', value: string) => {
    setEbooks(ebooks.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
  }

  const handleSave = () => {
    setIsSaving(true)

    // Mocking API call to save knowledge base context
    const payload = {
      priceTable,
      orientations,
      ebooks,
    }
    console.log('Saving knowledge base payload:', payload)

    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: 'Base de Conhecimento Salva',
        description: 'As informações foram atualizadas no contexto da IA com sucesso.',
      })
    }, 1200)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-secondary">Base de Conhecimento</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Forneça informações vitais como preços, materiais e diretrizes para treinar sua IA.
        </p>
      </div>

      <Alert className="bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-sm">
        <AlertTriangle className="h-4 w-4" color="currentColor" />
        <AlertTitle className="text-amber-800 font-semibold">Aviso Importante</AlertTitle>
        <AlertDescription className="text-amber-700/90 mt-1">
          Information entered here is temporary and will be lost on page refresh unless a database
          (Supabase/Skip Cloud) is connected.
        </AlertDescription>
      </Alert>

      <div className="grid gap-8">
        {/* Price Table Module */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-green-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Tabela de Preços e Condições</CardTitle>
                <CardDescription>
                  Detalhe os planos, valores, descontos permitidos e formas de pagamento.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label htmlFor="price-table" className="text-sm font-semibold text-secondary">
                Estrutura de Preços
              </Label>
              <Textarea
                id="price-table"
                placeholder="Ex: Plano Básico: R$ 97/mês (sem desconto). Plano Pro: R$ 197/mês (até 10% de desconto à vista)..."
                className="min-h-[150px] resize-y bg-card"
                value={priceTable}
                onChange={(e) => setPriceTable(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ebooks & Resources */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-blue-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Library className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Ebooks e Materiais de Apoio</CardTitle>
                <CardDescription>
                  Links para PDFs, apresentações e conteúdos ricos que a IA pode enviar aos leads.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {ebooks.map((ebook) => (
              <div
                key={ebook.id}
                className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-4 border rounded-xl bg-muted/10"
              >
                <div className="flex-1 w-full space-y-2">
                  <Label className="text-xs text-muted-foreground">Título do Material</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ex: Ebook Mapeamento de Vendas"
                      className="pl-9"
                      value={ebook.title}
                      onChange={(e) => updateEbook(ebook.id, 'title', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 w-full space-y-2">
                  <Label className="text-xs text-muted-foreground">URL de Acesso</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://..."
                      className="pl-9"
                      value={ebook.url}
                      onChange={(e) => updateEbook(ebook.id, 'url', e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-6 sm:mt-6 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  onClick={() => removeEbook(ebook.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addEbook}
              className="w-full border-dashed border-2 mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Novo Link
            </Button>
          </CardContent>
        </Card>

        {/* Orientations */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-purple-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Diretrizes e Orientações de Negócio</CardTitle>
                <CardDescription>
                  Regras específicas, objeções comuns e tom de voz detalhado para o assistente.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label htmlFor="orientations" className="text-sm font-semibold text-secondary">
                Business Orientations & Guidelines
              </Label>
              <Textarea
                id="orientations"
                placeholder="Descreva aqui o comportamento esperado, como contornar objeções frequentes, e limites da negociação..."
                className="min-h-[180px] resize-y bg-card"
                value={orientations}
                onChange={(e) => setOrientations(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border flex justify-end md:pl-[var(--sidebar-width)] z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl w-full mx-auto flex justify-end items-center gap-4 px-4 md:px-0">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="shadow-md px-8 h-11 hover:scale-105 transition-transform"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2 font-medium">
                <Save className="h-5 w-5" />
                Salvar Base de Conhecimento
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
