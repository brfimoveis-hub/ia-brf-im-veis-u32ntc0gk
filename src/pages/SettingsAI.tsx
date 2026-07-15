import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
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
import { toast } from 'sonner'
import { Loader2, Bot, Save, Building2 } from 'lucide-react'

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
  const [aiName, setAiName] = useState('Bia')
  const [biaInstructions, setBiaInstructions] = useState('')
  const [aiInstructions, setAiInstructions] = useState('')
  const [projectData, setProjectData] = useState<ProjectData>({ ...DEFAULT_PROJECT })

  useEffect(() => {
    if (user) {
      setAiName(user.ai_name || 'Bia')
      setBiaInstructions(user.bia_instructions || '')
      setAiInstructions(user.ai_instructions || '')
      setProjectData(parseProjectData(user.project_data))
      setLoading(false)
    }
  }, [user])

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

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <Label htmlFor="biaInstructions">Metodologia dos 10 Passos (BIA)</Label>
            <Textarea
              id="biaInstructions"
              value={biaInstructions}
              onChange={(e) => setBiaInstructions(e.target.value)}
              placeholder="Descreva a metodologia de atendimento: SPIN, 5 Whys, tratamento de objeções, gatilhos mentais..."
              className="min-h-[200px]"
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
