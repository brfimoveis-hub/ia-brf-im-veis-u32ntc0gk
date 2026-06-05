import { DiagnosticCenter } from '@/components/DiagnosticCenter'

export default function ConfiguracoesCore() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Configurações e Diagnósticos
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie as integrações do sistema, visualize a saúde dos serviços e monitore logs de
          atividades em tempo real.
        </p>
      </div>
      <DiagnosticCenter />
    </div>
  )
}
