import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCustomer, updateCustomer, Customer } from '@/services/customers'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export function LeadDialog({
  open,
  onOpenChange,
  defaultValues,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  defaultValues?: Customer | null
}) {
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    status: 'Novo',
    source: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setErrors({})
      if (defaultValues) {
        setFormData({
          name: defaultValues.name || '',
          first_name: defaultValues.first_name || '',
          last_name: defaultValues.last_name || '',
          phone: defaultValues.phone || '',
          email: defaultValues.email || '',
          status: defaultValues.status || 'Novo',
          source: defaultValues.source || '',
          notes: defaultValues.notes || '',
        })
      } else {
        setFormData({
          name: '',
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          status: 'Novo',
          source: '',
          notes: '',
        })
      }
    }
  }, [defaultValues, open])

  const handleFirstNameChange = (val: string) => {
    setFormData((prev) => {
      const prevConstructed = [prev.first_name, prev.last_name].filter(Boolean).join(' ').trim()
      const newConstructed = [val, prev.last_name].filter(Boolean).join(' ').trim()
      const isNameSyncing =
        !prev.name || prev.name === prevConstructed || prev.name.toLowerCase() === 'sem nome'

      return {
        ...prev,
        first_name: val,
        name: isNameSyncing ? newConstructed : prev.name,
      }
    })
  }

  const handleLastNameChange = (val: string) => {
    setFormData((prev) => {
      const prevConstructed = [prev.first_name, prev.last_name].filter(Boolean).join(' ').trim()
      const newConstructed = [prev.first_name, val].filter(Boolean).join(' ').trim()
      const isNameSyncing =
        !prev.name || prev.name === prevConstructed || prev.name.toLowerCase() === 'sem nome'

      return {
        ...prev,
        last_name: val,
        name: isNameSyncing ? newConstructed : prev.name,
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const dataToSubmit = { ...formData, name: formData.name.trim() }

      // Fallback for name before submit, to avoid empty name error
      if (!dataToSubmit.name) {
        const constructed = [dataToSubmit.first_name, dataToSubmit.last_name]
          .filter(Boolean)
          .join(' ')
          .trim()
        if (constructed) {
          dataToSubmit.name = constructed
        } else if (dataToSubmit.email) {
          dataToSubmit.name = dataToSubmit.email
        } else if (dataToSubmit.phone) {
          dataToSubmit.name = dataToSubmit.phone
        } else {
          dataToSubmit.name = 'Sem nome'
        }
      }

      if (defaultValues?.id) {
        await updateCustomer(defaultValues.id, dataToSubmit)
        toast({ title: 'Lead atualizado com sucesso!' })
      } else {
        await createCustomer({ ...dataToSubmit, tags: ['Manual'] })
        toast({ title: 'Lead adicionado com sucesso!' })
      }
      onOpenChange(false)
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) {
        toast({ title: 'Erro ao salvar', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Editar Lead' : 'Adicionar Lead'}</DialogTitle>
          <DialogDescription>
            {defaultValues
              ? 'Atualize as informações do cliente.'
              : 'Preencha as informações do novo cliente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome (Primeiro)</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="Ex: João"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="Ex: da Silva"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo (Exibição) *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: João da Silva"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ex: +55 11 99999-9999"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Ex: joao@email.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Origem</Label>
            <Input
              id="source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="Ex: Facebook Ads, Indicação"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Anotações</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações importantes"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
