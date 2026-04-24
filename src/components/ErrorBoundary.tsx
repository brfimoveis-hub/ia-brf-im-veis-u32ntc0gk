import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
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
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="p-6 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex flex-col items-center justify-center text-center w-full min-h-[200px] animate-in fade-in zoom-in-95">
          <AlertCircle className="h-10 w-10 mb-3 opacity-80" />
          <h2 className="font-semibold text-lg mb-1">Algo deu errado</h2>
          <p className="text-sm opacity-80 mb-4 max-w-[400px]">
            {this.state.error?.message ||
              'Ocorreu um erro inesperado ao renderizar este componente.'}
          </p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false })}>
            Tentar novamente
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
