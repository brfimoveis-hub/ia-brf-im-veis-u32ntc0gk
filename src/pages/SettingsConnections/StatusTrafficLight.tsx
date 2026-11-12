import { cn } from '@/lib/utils'

interface StatusTrafficLightProps {
  status?: string
  error?: string
}

export function StatusTrafficLight({ status, error }: StatusTrafficLightProps) {
  const s = (status || '').toLowerCase()
  const isActive = ['active', 'connected', 'valid', 'ok'].includes(s)
  const isPendingToken = ['configured_waiting_token'].includes(s)
  const isPendingRegistration = ['pending', 'pending_registration'].includes(s)
  const isNotConfigured = ['not_configured'].includes(s)
  // 'expired' = token morto (código 190 da Meta): VERMELHO "Token expirado" (v0.0.1411)
  const isExpired = s === 'expired'
  const isError =
    ['error'].includes(s) ||
    (!!error &&
      !isActive &&
      !isNotConfigured &&
      !isPendingToken &&
      !isPendingRegistration &&
      !isExpired)
  const label = isActive
    ? 'Conectado'
    : isPendingRegistration
      ? 'Pendente de Registro (PIN)'
      : isPendingToken
        ? 'Aguardando Token'
        : isExpired
          ? 'Token expirado'
          : isError
            ? 'Erro'
            : isNotConfigured
              ? 'Não Configurado'
              : 'Aguardando'
  const color = isActive
    ? 'bg-green-500'
    : isPendingRegistration
      ? 'bg-amber-500'
      : isPendingToken
        ? 'bg-blue-500'
        : isExpired
          ? 'bg-red-500'
          : isError
            ? 'bg-red-500'
            : isNotConfigured
              ? 'bg-gray-400'
              : 'bg-yellow-400'

  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-3 w-3 rounded-full', color, isActive && 'animate-pulse')} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export default StatusTrafficLight
