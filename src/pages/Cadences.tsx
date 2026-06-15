import { useEffect, useState } from 'react'
import { getCadences } from '@/services/cadences'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { RecordModel } from 'pocketbase'

export default function Cadences() {
  const [cadences, setCadences] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedCadence, setSelectedCadence] = useState<RecordModel | null>(null)

  const loadData = async () => {
    try {
      setError(false)
      const data = await getCadences()
      setCadences(data)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('cadences', () => {
    loadData()
  })

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-slate-700">Erro ao carregar cadências.</p>
        <Button onClick={loadData}>Tentar Novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Cadências</h1>

      {cadences.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Nenhuma Cadência Encontrada</h2>
          <p className="text-muted-foreground text-center mt-2 max-w-md">
            Você não possui cadências configuradas no momento.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cadences.map((cadence) => (
            <Card
              key={cadence.id}
              className="flex flex-col shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2 gap-4">
                  <CardTitle className="text-lg leading-tight">{cadence.title}</CardTitle>
                  <Badge variant={cadence.is_active ? 'default' : 'secondary'} className="shrink-0">
                    {cadence.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {cadence.description || 'Sem descrição'}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedCadence(cadence)}
                >
                  Ver Detalhes e Fluxo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedCadence} onOpenChange={(open) => !open && setSelectedCadence(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Fluxo de Mensagens: {selectedCadence?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-2">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                Conteúdo da Cadência
              </h3>
              <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap border">
                {selectedCadence?.content || 'Nenhum conteúdo principal definido.'}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                Passos Configurados (JSON)
              </h3>
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto font-mono border border-slate-800">
                {JSON.stringify(selectedCadence?.steps || {}, null, 2)}
              </pre>
            </div>
            {selectedCadence?.ai_instructions && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                  Instruções para a IA
                </h3>
                <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap border">
                  {selectedCadence.ai_instructions}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
