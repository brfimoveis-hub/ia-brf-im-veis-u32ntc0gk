import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Phone, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatDisplayPhone } from '@/lib/meta-format'
import { cn } from '@/lib/utils'

interface WhatsAppIdentityCardProps {
  tokenStatus: string
  displayNumber: string
}

export function WhatsAppIdentityCard({ tokenStatus, displayNumber }: WhatsAppIdentityCardProps) {
  const isActive = tokenStatus === 'active'
  const isError = tokenStatus === 'error'
  const formatted = formatDisplayPhone(displayNumber)

  const statusLabel = isActive ? 'Conectado' : isError ? 'Erro de Conexão' : 'Aguardando'
  const statusColor = isActive ? 'text-green-600' : isError ? 'text-red-600' : 'text-yellow-600'

  const Icon = isActive ? CheckCircle2 : isError ? AlertCircle : MessageCircle

  return (
    <Card className="animate-fade-in">
      <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Número WhatsApp Ativo</p>
            {isActive && formatted ? (
              <div className="flex items-center gap-2 mt-0.5">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="text-lg font-bold font-mono">{formatted}</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-muted-foreground">Não configurado</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', statusColor)} />
          <div>
            <p className="text-xs text-muted-foreground">Meta API Status</p>
            <Badge
              variant={isActive ? 'default' : isError ? 'destructive' : 'secondary'}
              className="mt-0.5"
            >
              {statusLabel}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default WhatsAppIdentityCard
