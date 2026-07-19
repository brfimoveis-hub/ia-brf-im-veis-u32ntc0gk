import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, Copy } from 'lucide-react'

interface MaskedInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function MaskedInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: MaskedInputProps) {
  const [show, setShow] = useState(false)
  const { toast } = useToast()

  const copy = () => {
    navigator.clipboard.writeText(value)
    toast({ title: `${label} copiado` })
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <Button variant="outline" size="icon" onClick={() => setShow(!show)} type="button">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={copy} disabled={!value} type="button">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default MaskedInput
