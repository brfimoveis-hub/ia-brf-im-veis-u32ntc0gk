import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, Save } from 'lucide-react'

export default function SettingsAI() {
  const { user } = useAuth()
  const [aiInstructions, setAiInstructions] = useState('')
  const [biaInstructions, setBiaInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setAiInstructions(user.ai_instructions || '')
      setBiaInstructions(user.bia_instructions || '')
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      await pb.collection('users').update(user.id, {
        ai_instructions: aiInstructions,
        bia_instructions: biaInstructions,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Settings (Bia)</h1>
          <p className="text-muted-foreground mt-2">
            Configure instructions and specific rules for the AI Agent.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-md animate-in slide-in-from-top-2 fade-in duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">
            Configurações salvas com sucesso! A IA já está operando com as novas diretrizes.
          </span>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Global AI Instructions (IA Mãe)</CardTitle>
          <CardDescription>
            Regras de negócio globais, supervisão e diretrizes de contorno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value)}
            className="min-h-[250px] resize-y font-mono text-sm"
            maxLength={200000}
            placeholder="Ex: A IA Mãe sempre valida se o script de vendas está sendo cumprido..."
          />
          <div className="text-right text-xs font-medium text-muted-foreground mt-2">
            {aiInstructions.length.toLocaleString()} / 200,000
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Bia Persona Instructions</CardTitle>
          <CardDescription>
            Personalidade, scripts de atendimento e tom de voz específico da Bia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={biaInstructions}
            onChange={(e) => setBiaInstructions(e.target.value)}
            className="min-h-[250px] resize-y font-mono text-sm"
            maxLength={200000}
            placeholder="Ex: Você é a Bia, especialista em imóveis de alto padrão..."
          />
          <div className="text-right text-xs font-medium text-muted-foreground mt-2">
            {biaInstructions.length.toLocaleString()} / 200,000
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
