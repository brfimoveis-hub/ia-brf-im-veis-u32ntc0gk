import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Send } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { createCustomer } from '@/services/customers'
import pb from '@/lib/pocketbase/client'

interface LeadFormProps {
  launchName: string
  launchSlug: string
}

export function LeadForm({ launchName, launchSlug }: LeadFormProps) {
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const formatPhone = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const isValid = nome.trim().length >= 2 && whatsapp.replace(/\D/g, '').length >= 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || loading) return
    setLoading(true)
    try {
      // 1. Tenta POST no endpoint backend /landing-lead (cria customer + conversa para Bia)
      let backendOk = false
      try {
        const res = await pb.send<{ ok: boolean }>('/backend/v1/landing-lead', {
          method: 'POST',
          body: {
            name: nome.trim(),
            phone: whatsapp.replace(/\D/g, ''),
            message: `[LANDING ${launchName} / ${launchSlug}] ${mensagem.trim() || 'Interesse no lançamento'}`,
          },
        })
        if (res && res.ok) {
          backendOk = true
        }
      } catch {
        backendOk = false
      }

      // 2. Se backend direto não responder, usa createCustomer via PocketBase SDK
      if (!backendOk) {
        await createCustomer({
          name: nome.trim(),
          phone: whatsapp.replace(/\D/g, ''),
          source: 'Landing Page Vistage',
          status: 'novo',
          notes: `[LANDING ${launchName} / ${launchSlug}] ${mensagem.trim() || 'Interesse no lançamento'}`,
          tags: ['landing_vistage'],
          lead_profile: 'investidor',
        })
      }
      setDone(true)
      toast({
        title: 'Recebido!',
        description: 'A Bia vai te chamar no WhatsApp em instantes.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar',
        description: err?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-300">Recebido! 🎉</p>
        <p className="mt-2 text-sm text-emerald-100/80">
          Obrigado, {nome.split(' ')[0]}. A Bia, consultora da BRF Imóveis, vai te chamar no
          WhatsApp com plantas, valores e condições.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="lead-nome" className="text-white/90">
          Seu nome
        </Label>
        <Input
          id="lead-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como você se chama?"
          required
          className="h-12 border-white/20 bg-white/5 text-white placeholder:text-white/40"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-whatsapp" className="text-white/90">
          Seu WhatsApp
        </Label>
        <Input
          id="lead-whatsapp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
          placeholder="(48) 99999-9999"
          inputMode="tel"
          required
          className="h-12 border-white/20 bg-white/5 text-white placeholder:text-white/40"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-msg" className="text-white/90">
          Mensagem (opcional)
        </Label>
        <Input
          id="lead-msg"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Ex.: quero 3 dormitórios garden"
          className="h-12 border-white/20 bg-white/5 text-white placeholder:text-white/40"
        />
      </div>
      <Button
        type="submit"
        disabled={!isValid || loading}
        size="lg"
        className="h-12 w-full bg-amber-500 text-base font-bold text-black hover:bg-amber-400"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        Quero conhecer o {launchName.split(' ')[0]}
      </Button>
      <p className="text-center text-xs text-white/50">
        Seus dados vão direto para a consultora Bia da BRF Imóveis. Sem spam.
      </p>
    </form>
  )
}

export default LeadForm
