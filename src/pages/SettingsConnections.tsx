import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

export default function SettingsConnections() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Conexões</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrações do Sistema</CardTitle>
          <CardDescription>
            Gerencie suas conexões com Uazapi, Meta CAPI e outras integrações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-8 rounded-lg flex flex-col items-center justify-center text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-slate-700">Módulo em Desenvolvimento</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              A interface de gerenciamento de conexões será disponibilizada aqui em breve. Por
              favor, acompanhe o status no painel lateral.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
