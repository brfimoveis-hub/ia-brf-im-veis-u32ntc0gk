import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  BookOpen,
  Globe,
  Settings,
  MousePointerClick,
  Clipboard,
  KeyRound,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react'

interface MetaSetupGuideProps {
  webhookUrl?: string
  verifyToken?: string
}

const STEPS = [
  {
    icon: Globe,
    text: 'Acesse o Meta Developer Portal e faça login com suas credenciais de desenvolvedor.',
  },
  { icon: Settings, text: 'Navegue até WhatsApp > Configuration no menu lateral.' },
  { icon: MousePointerClick, text: 'Clique em "Editar" na seção de Webhooks.' },
  { icon: Clipboard, text: 'Cole a URL do Webhook no campo "Callback URL".' },
  { icon: KeyRound, text: 'Cole o Token de Verificação no campo "Verify Token".' },
  {
    icon: CheckCircle2,
    text: 'Selecione o campo "messages" em Webhook Subscriptions e clique em "Verificar e Salvar".',
  },
]

export function MetaSetupGuide({ webhookUrl, verifyToken }: MetaSetupGuideProps) {
  const { toast } = useToast()

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado` })
  }

  return (
    <Card>
      <CardHeader className="bg-muted/30 border-b">
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
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{step.text}</span>
                  {i === 3 && webhookUrl && (
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded text-xs break-all font-mono max-w-md inline-block">
                        {webhookUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copy(webhookUrl, 'URL do Webhook')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {i === 4 && verifyToken && (
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                        {verifyToken}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copy(verifyToken, 'Token de Verificação')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
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
