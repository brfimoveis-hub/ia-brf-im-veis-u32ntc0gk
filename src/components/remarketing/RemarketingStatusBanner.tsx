import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, XCircle, Wifi } from 'lucide-react'

interface RemarketingStatusBannerProps {
  hasAccessToken: boolean
  tokenStatus: string
  capiStatus: string
  appId: string
}

export function RemarketingStatusBanner({
  hasAccessToken,
  tokenStatus,
  capiStatus,
  appId,
}: RemarketingStatusBannerProps) {
  const tokenValid = hasAccessToken && tokenStatus === 'valid'
  const capiConnected = capiStatus === 'connected'
  const isFullyConnected = tokenValid && capiConnected
  const isPartial = (tokenValid || capiConnected) && !isFullyConnected
  const isPending = hasAccessToken && tokenStatus !== 'valid' && !capiConnected

  const config = isFullyConnected
    ? {
        label: 'Totalmente Conectado',
        desc: 'Token válido e CAPI ativa — sincronização pronta',
        icon: CheckCircle2,
        cls: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400',
      }
    : isPartial
      ? {
          label: 'Conexão Parcial',
          desc: 'Token ou CAPI ativos, mas não ambos — verifique as Conexões',
          icon: AlertTriangle,
          cls: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-900/50 dark:text-yellow-400',
        }
      : isPending
        ? {
            label: 'Aguardando Validação',
            desc: 'Token presente mas não validado',
            icon: AlertTriangle,
            cls: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-900/50 dark:text-yellow-400',
          }
        : {
            label: 'Desconectado',
            desc: 'Configure o Access Token e CAPI nas Conexões',
            icon: XCircle,
            cls: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400',
          }

  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border animate-fade-in',
        config.cls,
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 shrink-0" />
        <div>
          <p className="font-semibold">Remarketing Status: {config.label}</p>
          <p className="text-sm opacity-80">{config.desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-end text-sm opacity-80">
          <span className="font-medium">Token: {tokenValid ? '✓ Válido' : '✗'}</span>
          <span className="font-medium">CAPI: {capiConnected ? '✓ Ativo' : '✗'}</span>
        </div>
        {appId && (
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Wifi className="h-4 w-4" />
            App ID: {appId}
          </div>
        )}
      </div>
    </div>
  )
}
