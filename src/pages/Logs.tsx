import { useLocation } from 'react-router-dom'
import { DiagnosticCenter } from '@/components/DiagnosticCenter'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Activity } from 'lucide-react'

const Logs = () => {
  const location = useLocation()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Logs do Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Monitore eventos, diagnósticos e integrações do sistema em tempo real.
          </p>
        </div>
      </div>

      {/*
        Keying the ErrorBoundary and DiagnosticCenter with location.key 
        ensures a completely clean mount (clean slate) on every navigation to this page.
        This resets all state and purges any detached DOM nodes.
      */}
      <ErrorBoundary key={`eb-${location.key}`}>
        <DiagnosticCenter key={`dc-${location.key}`} />
      </ErrorBoundary>
    </div>
  )
}

export default Logs
