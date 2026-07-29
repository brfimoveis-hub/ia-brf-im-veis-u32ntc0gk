import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { reportError } from '@/lib/error-reporter'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  logType?: string
  title?: string
  message?: string
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)

    reportError({
      type: this.props.logType || 'frontend_error',
      message: error.message || 'React Rendering Error',
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        title: this.props.title,
      },
    })

    toast.error(this.props.title || 'Erro ao carregar', {
      description:
        this.props.message ||
        error.message ||
        'Ocorreu um erro inesperado ao renderizar este componente.',
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onRetry?.()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback
      }
      return (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex flex-col items-center justify-center text-center w-full min-h-[120px] animate-in fade-in zoom-in-95">
          <AlertCircle className="h-8 w-8 mb-2 opacity-80" />
          {this.props.title && <h3 className="font-semibold text-base mb-1">{this.props.title}</h3>}
          <p className="text-sm opacity-80 mb-3 max-w-[400px]">
            {this.props.message || 'Alguns dados não puderam ser carregados. Tente novamente.'}
          </p>
          {this.props.onRetry && (
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
