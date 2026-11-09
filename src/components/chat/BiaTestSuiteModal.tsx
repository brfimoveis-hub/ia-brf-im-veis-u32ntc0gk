import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { runBiaTestSuiteV6, BiaTestSuiteResponse } from '../../services/bia_test_suite'
import { useToast } from '../../hooks/use-toast'

interface BiaTestSuiteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const BiaTestSuiteModal: React.FC<BiaTestSuiteModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [testResult, setTestResult] = useState<BiaTestSuiteResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'passed' | 'failed'>('all')

  const handleRunTests = async () => {
    setIsRunning(true)
    try {
      const res = await runBiaTestSuiteV6()
      setTestResult(res)
      if (res.sucesso) {
        toast({
          title: 'Bateria de Testes v6.0 Aprovada!',
          description: `Todos os ${res.total_cenarios} cenários passaram com sucesso em ${res.duracao_ms}ms.`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Falhas detectadas na bateria v6.0',
          description: `${res.reprovados} de ${res.total_cenarios} cenários reprovaram.`,
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao rodar testes',
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsRunning(false)
    }
  }

  const filteredResults = testResult?.resultados.filter((r) => {
    if (activeTab === 'passed') return r.status === 'PASSOU'
    if (activeTab === 'failed') return r.status === 'FALHOU'
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Validador da Constituição Bia v6.0 Soberana</span>
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300">
                    22 Cenários Canônicos
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Simulação segura contra o motor real do CRM sem enviar mensagens externas ou
                  disparar régua.
                </DialogDescription>
              </div>
            </div>

            <Button
              onClick={handleRunTests}
              disabled={isRunning}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm font-semibold"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  <span>Rodando Testes...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Executar Bateria</span>
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {testResult ? (
          <div className="space-y-4 py-2 flex-1 flex flex-col overflow-hidden">
            {/* KPI Cards do Resultado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Status Geral
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {testResult.sucesso ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-600">100% Aprovado</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span className="text-sm font-bold text-rose-600">Com Falhas</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Aprovados
                </span>
                <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
                  {testResult.aprovados} / {testResult.total_cenarios}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Reprovados
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {testResult.reprovados}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Tempo de Execução
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {testResult.duracao_ms} ms
                  </span>
                </div>
              </div>
            </div>

            {/* Abas de Filtro */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Todos ({testResult.total_cenarios})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('passed')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    activeTab === 'passed'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Aprovados ({testResult.aprovados})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('failed')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    activeTab === 'failed'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Reprovados ({testResult.reprovados})
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground">
                Constituição: {testResult.constituicao_ativa?.titulo || 'v6.0 Soberana'}
              </span>
            </div>

            {/* Lista dos Cenários */}
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-2.5">
                {filteredResults?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border bg-white dark:bg-slate-900/60 shadow-xs space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #{String(item.indice).padStart(2, '0')}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.nome}
                        </span>
                      </div>
                      <Badge
                        className={
                          item.status === 'PASSOU'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 font-bold'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 font-bold'
                        }
                      >
                        {item.status === 'PASSOU' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1 inline" />
                        )}
                        {item.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                          Entrada Simulada
                        </span>
                        <p className="font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                          {item.entrada_simulada}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                          Resposta Capturada / Validação
                        </span>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {item.resposta_capturada || '(Sem resposta)'}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                      <strong className="not-italic font-semibold text-slate-700 dark:text-slate-300">
                        Veredito:&nbsp;
                      </strong>
                      {item.detalhe}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Bateria de Validação da Bia v6.0 Pronta
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mt-1">
                Clique no botão &quot;Executar Bateria&quot; para disparar a validação completa dos
                22 cenários da v6 contra a Constituição Soberana ativa, guarda anti-bot e motor de
                IA.
              </p>
            </div>
            <Button
              onClick={handleRunTests}
              disabled={isRunning}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-semibold shadow-sm"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Executar Todos os 22 Cenários</span>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
