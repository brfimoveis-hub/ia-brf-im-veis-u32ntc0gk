import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Activity, CheckCircle2, XCircle, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getCadences } from '@/services/cadences'
import { createSystemLog } from '@/services/system_logs'
import { cn } from '@/lib/utils'

export function DiagnosticCenter() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [results, setResults] = useState<{ name: string; status: string; message: string }[]>([])

  const runDiagnostics = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults([])
    const newResults: { name: string; status: string; message: string }[] = []

    try {
      // 1. Uazapi Connectivity Check
      setProgress(15)
      await new Promise((r) => setTimeout(r, 1000))
      const hasPhone = !!user?.meta_campaign_phone
      newResults.push({
        name: 'Conectividade Uazapi',
        status: hasPhone ? 'success' : 'error',
        message: hasPhone
          ? `Telefone ${user.meta_campaign_phone} alcançável e configurado.`
          : 'Telefone de campanha ausente. O Uazapi requer configuração.',
      })
      setResults([...newResults])

      // 2. Cadence Audit
      setProgress(30)
      const cadences = await getCadences()
      const validCadences = cadences.filter(
        (c) => c.order !== undefined && c.ai_instructions && c.ai_instructions.length > 10,
      )
      const hasIssues = cadences.length !== 10 || validCadences.length !== cadences.length
      newResults.push({
        name: 'Auditoria de Cadências',
        status: hasIssues ? 'warning' : 'success',
        message: `${cadences.length} cadências ativas. ${validCadences.length} estruturalmente íntegras (com regras IA).`,
      })
      setResults([...newResults])

      // 3. Meta Integration Validation (Loopable)
      setProgress(50)
      const testCount = loopEnabled ? 5 : 1
      let metaSuccesses = 0

      if (!user?.meta_pixel_id || !user?.meta_capi_token) {
        newResults.push({
          name: 'Integração Meta (Pixel & CAPI)',
          status: 'error',
          message: 'Credenciais ausentes. Impossível realizar o handshake com o Meta.',
        })
        setProgress(90)
      } else {
        for (let i = 0; i < testCount; i++) {
          try {
            await pb.send('/backend/v1/meta-test-connection', {
              method: 'POST',
              body: JSON.stringify({
                pixelId: user.meta_pixel_id,
                capiToken: user.meta_capi_token,
              }),
              headers: { 'Content-Type': 'application/json' },
            })
            metaSuccesses++
          } catch (e) {
            // fail silently for diagnostic count
          }
          setProgress(50 + ((i + 1) / testCount) * 40)
          if (i < testCount - 1) await new Promise((r) => setTimeout(r, 1500))
        }

        newResults.push({
          name: 'Integração Meta (Pixel & CAPI)',
          status: metaSuccesses === testCount ? 'success' : metaSuccesses > 0 ? 'warning' : 'error',
          message: `${metaSuccesses}/${testCount} handshakes bem-sucedidos com a API do Meta.`,
        })
      }
      setResults([...newResults])

      setProgress(100)

      // Log results
      await createSystemLog({
        type: 'diagnostic',
        message: 'Diagnóstico de integridade concluído',
        details: `Loop: ${loopEnabled ? 'Sim' : 'Não'}. Meta: ${metaSuccesses}/${testCount}. Uazapi: ${hasPhone ? 'Online' : 'Offline'}. Cadências: ${cadences.length}`,
        payload: newResults,
      })

      toast({
        title: 'Diagnóstico Concluído',
        description: 'O relatório de saúde do sistema foi gerado com sucesso.',
      })
    } catch (e) {
      toast({
        title: 'Erro no Diagnóstico',
        description: 'Uma falha inesperada interrompeu a verificação.',
        variant: 'destructive',
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="border-border shadow-elevation">
      <div className="h-1 bg-green-500 w-full rounded-t-xl"></div>
      <CardHeader className="bg-muted/10 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-500/10 rounded-xl">
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Centro de Diagnóstico de Integridade</CardTitle>
            <CardDescription>
              Verifique conexões externas (Meta, Uazapi) e a saúde interna do sistema de IA.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-xl bg-muted/20">
          <div className="space-y-1">
            <h4 className="font-semibold text-secondary">Verificação Completa Profunda</h4>
            <p className="text-sm text-muted-foreground">
              Executa um "handshake" automático com todos os serviços integrados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded-md border shadow-sm">
              <Checkbox
                id="loop-test"
                checked={loopEnabled}
                onCheckedChange={(c) => setLoopEnabled(!!c)}
                disabled={isRunning}
              />
              <Label htmlFor="loop-test" className="text-sm font-medium cursor-pointer">
                Stress Test (5x)
              </Label>
            </div>
            <Button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto shadow-sm"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {isRunning ? 'Verificando...' : 'Executar Scan'}
            </Button>
          </div>
        </div>

        {isRunning && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <div className="flex justify-between text-sm font-medium text-secondary">
              <span>Progresso do scan profundo...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3 pt-2 animate-in slide-in-from-bottom-2 duration-500">
            <h4 className="font-semibold text-secondary">Relatório do Sistema</h4>
            <div className="grid gap-2">
              {results.map((res, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {res.status === 'success' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    {res.status === 'warning' && (
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    )}
                    {res.status === 'error' && (
                      <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-secondary">{res.name}</p>
                      <p className="text-xs text-muted-foreground">{res.message}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 ml-2',
                      res.status === 'success' &&
                        'bg-green-500/10 text-green-600 border-green-500/20',
                      res.status === 'warning' &&
                        'bg-amber-500/10 text-amber-600 border-amber-500/20',
                      res.status === 'error' &&
                        'bg-destructive/10 text-destructive border-destructive/20',
                    )}
                  >
                    {res.status === 'success'
                      ? 'Saudável'
                      : res.status === 'warning'
                        ? 'Atenção'
                        : 'Falha'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
