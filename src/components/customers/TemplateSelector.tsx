import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCadences, type Cadence } from '@/services/cadences'
import { FileText } from 'lucide-react'

interface TemplateSelectorProps {
  onSelect: (content: string, title: string) => void
  disabled?: boolean
}

export function TemplateSelector({ onSelect, disabled }: TemplateSelectorProps) {
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCadences()
      .then((data) => setCadences(data.filter((c) => c.is_active)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Select
      disabled={disabled || loading}
      onValueChange={(value) => {
        const cadence = cadences.find((c) => c.id === value)
        if (cadence) onSelect(cadence.content || '', cadence.title)
      }}
    >
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={loading ? 'Carregando...' : 'Selecionar template...'} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {cadences.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
