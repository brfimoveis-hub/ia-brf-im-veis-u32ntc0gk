import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CUSTOMER_STAGES, SOURCE_OPTIONS, LEAD_PROFILE_OPTIONS } from '@/lib/customer-filters'

interface Props {
  searchInput: string
  onSearchInputChange: (v: string) => void
  statusFilter: string
  onStatusChange: (v: string) => void
  sourceFilter: string
  onSourceChange: (v: string) => void
  neighborhood: string
  onNeighborhoodChange: (v: string) => void
  leadProfile: string
  onLeadProfileChange: (v: string) => void
  urgencyFilter: string
  onUrgencyChange: (v: string) => void
  noSend: boolean
  onNoSendChange: (v: boolean) => void
  tags: string
  onTagsChange: (v: string) => void
  onClear: () => void
  hasActiveFilters: boolean
}

export function CustomerFilterBar({
  searchInput,
  onSearchInputChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  neighborhood,
  onNeighborhoodChange,
  leadProfile,
  onLeadProfileChange,
  urgencyFilter,
  onUrgencyChange,
  noSend,
  onNoSendChange,
  tags,
  onTagsChange,
  onClear,
  hasActiveFilters,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-background p-3">
      <div className="flex flex-col lg:flex-row gap-2 lg:items-center flex-wrap">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, email ou notas..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {CUSTOMER_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={onSourceChange}>
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Origens</SelectItem>
            {SOURCE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={leadProfile} onValueChange={onLeadProfileChange}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Perfis</SelectItem>
            {LEAD_PROFILE_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={onUrgencyChange}>
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Urgência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda Urgência</SelectItem>
            <SelectItem value="high">Alta (7+)</SelectItem>
            <SelectItem value="medium">Média (4-6)</SelectItem>
            <SelectItem value="low">Baixa (1-3)</SelectItem>
            <SelectItem value="none">Sem urgência</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Bairro..."
          className="w-full lg:w-40"
          value={neighborhood}
          onChange={(e) => onNeighborhoodChange(e.target.value)}
        />
        <Input
          placeholder="Tags..."
          className="w-full lg:w-40"
          value={tags}
          onChange={(e) => onTagsChange(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap cursor-pointer select-none px-2">
          <Checkbox checked={noSend} onCheckedChange={(v) => onNoSendChange(!!v)} />
          Sem Envio
        </label>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={onClear}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>
    </div>
  )
}
