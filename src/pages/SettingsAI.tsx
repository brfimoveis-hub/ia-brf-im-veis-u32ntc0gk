import { useState, useEffect, useCallback } from 'react'
import { useBlocker } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Save, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const MAX_CHARS = 200000

export default function SettingsAI() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [biaInstructions, setBiaInstructions] = useState('')
  const [motherInstructions, setMotherInstructions] = useState('')

  const [initialBia, setInitialBia] = useState('')
  const [initialMother, setInitialMother] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    try {
      const record = await pb.collection('users').getOne(user.id)
      const bia = record.bia_instructions || ''
      const mother = record.ai_instructions || ''

      setBiaInstructions(bia)
      setMotherInstructions(mother)
      setInitialBia(bia)
      setInitialMother(mother)
      setIsDirty(false)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar instruções', variant: 'destructive' })
    }
  }, [user?.id, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (biaInstructions !== initialBia || motherInstructions !== initialMother) {
      setIsDirty(true)
    } else {
      setIsDirty(false)
    }
  }, [biaInstructions, motherInstructions, initialBia, initialMother])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        bia_instructions: biaInstructions, // Persona
        ai_instructions: motherInstructions, // Base Strategy
      })

      setInitialBia(biaInstructions)
      setInitialMother(motherInstructions)
      setIsDirty(false)

      toast({
        title: 'Sucesso',
        description: 'Instruções salvas com sucesso.',
      })
    } catch (err) {
      const errors = extractFieldErrors(err)
      toast({
        title: 'Erro ao salvar',
        description: Object.values(errors).join(', ') || 'Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty && !isSaving) {
          handleSave()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDirty, isSaving, handleSave])

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instruções da IA</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o comportamento, persona e regras de negócio globais da IA.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || isSaving} className="min-w-[120px]">
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      {isDirty && (
        <Alert variant="default" className="border-amber-500 bg-amber-500/10 text-amber-600">
          <AlertCircle className="h-4 w-4 stroke-amber-600" />
          <AlertTitle>Alterações não salvas</AlertTitle>
          <AlertDescription>
            Você possui alterações que ainda não foram salvas. Clique em Salvar para aplicá-las e
            evitar perda de dados.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="bia" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bia">Bia (Persona)</TabsTrigger>
          <TabsTrigger value="mother">IA Mãe (Estratégia)</TabsTrigger>
        </TabsList>

        <TabsContent value="bia" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bia - Instruções de Persona</CardTitle>
              <CardDescription>
                Defina como a Bia deve se comportar, seu tom de voz e como interagir com os leads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Você é a Bia, uma assistente imobiliária amigável..."
                className="min-h-[60vh] resize-y font-mono text-sm leading-relaxed"
                value={biaInstructions}
                onChange={(e) => setBiaInstructions(e.target.value)}
                maxLength={MAX_CHARS}
              />
              <div className="mt-2 text-xs text-muted-foreground text-right font-medium">
                {biaInstructions.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} caracteres
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mother" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>IA Mãe - Diretrizes Globais</CardTitle>
              <CardDescription>
                A IA Mãe atua como supervisora e base de conhecimento. Aqui ficam as regras de
                negócio globais e os limites.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Diretrizes Globais da Empresa..."
                className="min-h-[60vh] resize-y font-mono text-sm leading-relaxed"
                value={motherInstructions}
                onChange={(e) => setMotherInstructions(e.target.value)}
                maxLength={MAX_CHARS}
              />
              <div className="mt-2 text-xs text-muted-foreground text-right font-medium">
                {motherInstructions.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}{' '}
                caracteres
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {blocker.state === 'blocked' && (
        <AlertDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) blocker.reset?.()
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aviso: Alterações não salvas</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem alterações nas instruções da IA que não foram salvas. Tem certeza que
                deseja sair desta página? O que você alterou será perdido.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => blocker.reset?.()}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => blocker.proceed?.()}
                className="bg-destructive hover:bg-destructive/90"
              >
                Sair sem salvar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
