import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Checkbox } from '@/components/ui/checkbox'

const DAYS = [
  { id: 'monday', label: 'Segunda-feira' },
  { id: 'tuesday', label: 'Terça-feira' },
  { id: 'wednesday', label: 'Quarta-feira' },
  { id: 'thursday', label: 'Quinta-feira' },
  { id: 'friday', label: 'Sexta-feira' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' },
]

export function DeliverySettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [enabled, setEnabled] = useState(true)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('18:00')
  const [interval, setInterval] = useState(5)
  const [days, setDays] = useState<string[]>([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && open) {
      setEnabled(user.delivery_enabled ?? true)
      setStartTime(user.delivery_start_time || '08:00')
      setEndTime(user.delivery_end_time || '18:00')
      setInterval(user.delivery_interval ?? 5)
      setDays(user.delivery_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    }
  }, [user, open])

  const handleSave = async () => {
    if (startTime >= endTime) {
      toast({
        title: 'Horário inválido',
        description: 'O horário de início deve ser anterior ao de término.',
        variant: 'destructive',
      })
      return
    }

    if (!user) return
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, {
        delivery_enabled: enabled,
        delivery_start_time: startTime,
        delivery_end_time: endTime,
        delivery_interval: interval,
        delivery_days: days,
      })
      toast({ title: 'Configurações salvas com sucesso' })
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (dayId: string) => {
    setDays((prev) => (prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações de Envio</DialogTitle>
          <DialogDescription>
            Controle os horários e o intervalo das mensagens automáticas para manter um fluxo
            natural.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Envio Automático Ativo</Label>
              <div className="text-sm text-muted-foreground">
                Permitir envios da IA globalmente.
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horário de Início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Horário de Término</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Intervalo Mínimo (minutos)</Label>
            <Input
              type="number"
              min={0}
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value))}
            />
            <div className="text-xs text-muted-foreground">
              Tempo de espera entre envios sucessivos.
            </div>
          </div>

          <div className="space-y-3">
            <Label>Dias de Envio</Label>
            <div className="grid grid-cols-2 gap-3">
              {DAYS.map((day) => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.id}`}
                    checked={days.includes(day.id)}
                    onCheckedChange={() => toggleDay(day.id)}
                  />
                  <label
                    htmlFor={`day-${day.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
