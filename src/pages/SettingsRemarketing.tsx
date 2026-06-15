import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw } from 'lucide-react'

export default function SettingsRemarketing() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Remarketing</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
          <CardDescription>
            Funcionalidades de remarketing em breve estarão disponíveis nesta tela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-8 rounded-lg flex flex-col items-center justify-center text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-slate-700">Módulo em Desenvolvimento</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              Esta seção está sendo restaurada e logo permitirá a visualização e gestão de campanhas
              de remarketing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
