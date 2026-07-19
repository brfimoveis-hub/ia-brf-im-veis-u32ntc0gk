import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  ExternalLink,
  Globe,
  Settings,
  MousePointerClick,
  Clipboard,
  KeyRound,
  CheckCircle2,
} from 'lucide-react'

const STEPS = [
  {
    icon: Globe,
    text: 'Acesse o Meta Developer Portal e faça login com suas credenciais de desenvolvedor.',
  },
  {
    icon: Settings,
    text: 'Navegue até WhatsApp > Configuração no menu lateral.',
  },
  {
    icon: MousePointerClick,
    text: 'Clique em "Editar" na seção de Webhooks.',
  },
  {
    icon: Clipboard,
    text: 'Cole a URL do Webhook fornecida no CRM no campo "Callback URL".',
  },
  {
    icon: KeyRound,
    text: 'Cole o Token de Verificação fornecido no CRM no campo "Verify Token".',
  },
  {
    icon: CheckCircle2,
    text: 'Clique em "Verificar e Salvar" e certifique-se de que o campo "messages" está inscrito em "Campos do Webhook".',
  },
]

export function MetaSetupGuide() {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Guia de Configuração Meta — Passo a Passo</CardTitle>
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
              <div className="flex items-start gap-2 pt-0.5">
                <step.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{step.text}</span>
              </div>
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
