import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export function DashboardMetaBanner({ show, message }: { show: boolean; message?: string }) {
  if (!show) return null

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 animate-fade-in-down">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">
            {message
              ? `Conexão com Meta API instável — ${message}`
              : 'Conexão com Meta API instável — acesse Configurações para revalidar o token'}
          </p>
        </div>
        <Link
          to="/settings/connections"
          className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline whitespace-nowrap flex-shrink-0"
        >
          Configurações
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
