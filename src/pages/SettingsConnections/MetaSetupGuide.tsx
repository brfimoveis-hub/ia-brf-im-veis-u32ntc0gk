import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, ExternalLink } from 'lucide-react'

const STEPS = [
  'Acesse o Meta Developer Portal e selecione seu App do WhatsApp.',
  'Navegue até WhatsApp > Configuração.',
  'Clique em "Editar" e cole a URL do Webhook (Callback URL) fornecida acima.',
  'Cole o Token de Verificação fornecido acima.',
  'Clique em "Verificar e Salvar".',
  'Em "Campos do Webhook", clique em "Gerenciar" e inscreva-se em messages.',
]

export function MetaSetupGuide() {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Guia de Configuração Meta</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-3">
              <Badge
                variant="secondary"
                className="h-6 w-6 rounded-full p-0 text-xs flex items-center justify-center shrink-0"
              >
                {i + 1}
              </Badge>
              <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 pt-4 border-t">
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Abrir Meta Developer Portal <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

export default MetaSetupGuide
