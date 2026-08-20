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
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private toastTimer: ReturnType<typeof setTimeout> | null = null

  public state: State = {
    hasError: false,
    retryCount: 0,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)

    if (this.toastTimer) clearTimeout(this.toastTimer)

    this.toastTimer = setTimeout(() => {
      if (!this.state.hasError) return

      const logType = this.props.logType || 'frontend_error'
      const title = this.props.title
      const message =
        this.props.message ||
        error.message ||
        'Ocorreu um erro inesperado ao renderizar este componente.'

      reportError({
        type: logType,
        message: error.message || 'React Rendering Error',
        details: {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          title,
        },
      })

      toast.error(title || 'Erro ao carregar', {
        description: message,
      })
    }, 1500)
  }

  public componentWillUnmount() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer)
      this.toastTimer = null
    }
  }

  private handleRetry = () => {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer)
      this.toastTimer = null
    }
    this.setState((prev) => ({
      hasError: false,
      error: undefined,
      retryCount: prev.retryCount + 1,
    }))
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
          <p className="text-sm opacity-80 mb-3 max-w-[400px] break-words">
            {this.props.message ||
              this.state.error?.message ||
              'Ocorreu um erro inesperado ao renderizar este componente.'}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      )
    }

    return <div key={this.state.retryCount}>{this.props.children}</div>
  }
}
