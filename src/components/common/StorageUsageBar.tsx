import { HardDrive, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { type StorageUsageSummary } from '@/services/ai_knowledge_storage'

interface StorageUsageBarProps {
  usage: StorageUsageSummary | null
  loading?: boolean
  className?: string
  compact?: boolean
  showDetails?: boolean
}

export function StorageUsageBar({
  usage,
  loading = false,
  className = '',
  compact = false,
  showDetails = true,
}: StorageUsageBarProps) {
  if (loading || !usage) {
    return (
      <div className={`p-3 rounded-lg border bg-muted/20 animate-pulse space-y-2 ${className}`}>
        <div className="h-4 bg-muted/60 rounded w-1/3" />
        <div className="h-2 bg-muted/40 rounded w-full" />
      </div>
    )
  }

  const {
    formattedUsed,
    formattedLimit,
    formattedAvailable,
    usagePercentage,
    isFull,
    isNearFull,
    kbFilesCount,
    launchFilesCount,
  } = usage

  const statusColor = isFull
    ? 'text-rose-600 dark:text-rose-400'
    : isNearFull
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400'

  const progressColorClass = isFull
    ? '[&>div]:bg-rose-600'
    : isNearFull
      ? '[&>div]:bg-amber-500'
      : '[&>div]:bg-emerald-600'

  const badgeVariant = isFull ? 'destructive' : isNearFull ? 'outline' : 'secondary'

  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <HardDrive className={`w-3.5 h-3.5 ${statusColor}`} />
            Armazenamento Bia
          </span>
          <span className="font-semibold text-foreground text-[11px]">
            {formattedUsed} de {formattedLimit} ({usagePercentage}%)
          </span>
        </div>
        <Progress value={usagePercentage} className={`h-1.5 ${progressColorClass}`} />
        {isFull && (
          <p className="text-[11px] text-rose-600 font-medium">
            Espaço cheio: 1 GB atingido. Remova arquivos antigos para liberar espaço.
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-xs space-y-3 ${
        isFull
          ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20'
          : isNearFull
            ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10'
            : 'border-border'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg ${
              isFull
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                : isNearFull
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-primary/10 text-primary'
            }`}
          >
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-foreground">
                Capacidade de Armazenamento da Bia
              </span>
              <Badge variant={badgeVariant} className="text-[10px] h-5 px-1.5">
                Cota: {formattedLimit}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Espaço compartilhado entre documentos gerais e dossiês de todos os lançamentos (~50
              empreendimentos)
            </p>
          </div>
        </div>

        <div className="flex items-baseline sm:items-end flex-col">
          <div className="text-xs sm:text-sm font-bold text-foreground">
            <span className={statusColor}>{formattedUsed}</span>
            <span className="text-muted-foreground font-normal"> de {formattedLimit} usados</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {formattedAvailable} disponíveis ({100 - usagePercentage}%)
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <Progress value={usagePercentage} className={`h-2 ${progressColorClass}`} />
        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-0.5">
          <span>0 MB</span>
          <span className="font-medium text-foreground">{usagePercentage}% utilizado</span>
          <span>1 GB (1.024 MB)</span>
        </div>
      </div>

      {isFull ? (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <strong className="block font-semibold">Espaço cheio: 1 GB atingido.</strong>
            <span>
              Remova arquivos antigos para liberar espaço antes de enviar novos materiais.
            </span>
          </div>
        </div>
      ) : isNearFull ? (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong className="block font-semibold">Atenção: Quase 90% da cota utilizada.</strong>
            <span>Você ainda possui {formattedAvailable} livres para novos lançamentos.</span>
          </div>
        </div>
      ) : null}

      {showDetails && (
        <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-muted-foreground border-t border-border/40">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Base geral: <strong>{kbFilesCount} documento(s)</strong>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-blue-500" />
            Arquivos de lançamentos: <strong>{launchFilesCount} anexo(s)</strong>
          </span>
          <span>•</span>
          <span>
            Limite individual: <strong>até 200 MB</strong> por arquivo
          </span>
        </div>
      )}
    </div>
  )
}
