import { useRouteError, Link } from 'react-router-dom'
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function GlobalError() {
  const error = useRouteError() as any

  return (
    <div className="flex h-full min-h-[80vh] w-full flex-col items-center justify-center p-4 md:p-8">
      <Card className="max-w-md w-full shadow-elevation border-destructive/20 animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Oops! Algo deu errado.</CardTitle>
          <CardDescription className="text-base mt-2">
            Encontramos um erro inesperado ao carregar esta interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-6">
          {error && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md overflow-auto max-h-[120px] text-left font-mono whitespace-pre-wrap break-words">
              {error.message || error.statusText || JSON.stringify(error)}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            className="w-full sm:w-auto gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
          <Button asChild className="w-full sm:w-auto gap-2">
            <Link to="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
