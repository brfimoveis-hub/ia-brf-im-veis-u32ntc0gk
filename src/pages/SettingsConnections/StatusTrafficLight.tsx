import { cn } from '@/lib/utils'

interface StatusTrafficLightProps {
  status?: string
  error?: string
}

export function StatusTrafficLight({ status, error }: StatusTrafficLightProps) {
  const s = (status || '').toLowerCase()
  const isActive = ['active', 'connected', 'valid'].includes(s)
  const isError = ['error', 'expired'].includes(s) || (!!error && !isActive)
  const label = isActive ? 'Conectado' : isError ? 'Erro' : 'Aguardando'
  const color = isActive ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-yellow-400'

  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-3 w-3 rounded-full', color, isActive && 'animate-pulse')} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export default StatusTrafficLight
