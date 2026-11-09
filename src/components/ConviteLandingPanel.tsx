import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2, Rocket, ShieldAlert, Link2, CheckCircle2, Copy } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'

// Texto do convite definido pelo Mauro, verbatim (com as correções de digitação acordadas)
export const CONVITE_TEXTO_MAURO =
  'Como você já está na nossa lista de contatos, tomamos a liberdade de enviar um convite para conhecer esse lançamento. Talvez seja o seu momento de investir ou adquirir seu primeiro imóvel.'

const CONVITE_KEY = 'convite_vistage_ativo'

export interface ConviteSettings {
  id: string
  is_active: boolean
  paused_by: string
  paused_at: string
}

export function ConviteLandingPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [saving, setSaving] = useState(false)

  const { data, refetch, isLoading } = useQuery<ConviteSettings | null>({
    queryKey: ['convite_vistage_settings'],
    queryFn: async () => {
      const rec = await pb
        .collection('app_controls')
        .getFirstListItem<Record<string, any>>(`key = "${CONVITE_KEY}"`)
        .catch(() => null)
      return rec as ConviteSettings | null
    },
  })

  const isActive = !!data?.is_active
  const landingUrl = `${window.location.origin}/lancamento/vistage`

  const setActive = async (active: boolean) => {
    setSaving(true)
    try {
      if (data) {
        await pb.collection('app_controls').update(data.id, {
          is_active: active,
          paused_by: active ? '' : 'Mauro Fengler',
          paused_at: active ? '' : new Date().toISOString().replace('T', ' ').substring(0, 19),
          resumed_by: active ? 'Mauro Fengler' : '',
          resumed_at: active ? new Date().toISOString().replace('T', ' ').substring(0, 19) : '',
        })
      } else {
        await pb.collection('app_controls').create({
          key: CONVITE_KEY,
          name: 'Convite Vistage — disparo da régua de convites',
          is_active: active,
        })
      }
      toast({
        title: active ? 'Disparo ATIVADO' : 'Disparo PAUSADO',
        description: active
          ? 'O cron começará a enviar o convite pela régua (ordem alfabética).'
          : 'Nenhum convite será enviado até a próxima ativação.',
      })
      refetch()
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar',
        description: e?.message || 'Falha ao atualizar o estado do disparo.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
      setConfirmOpen(false)
      setConfirmText('')
    }
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Disparo do Convite Vistage Residence (com landing page)</CardTitle>
            <CardDescription>
              Mensagem de convite + link da landing page, enviada pela régua em ordem alfabética a
              partir da letra A. Respeita janela 8h–18h, só avança com entrega confirmada e nunca
              dispara retroativo em massa.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="convite-switch" className="text-base font-semibold">
              Estado do disparo
            </Label>
            <p className="text-sm text-muted-foreground">
              {isActive ? 'ATIVO — disparos em andamento' : 'PAUSADO — nada será enviado'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'ATIVO' : 'PAUSADO'}
            </Badge>
            <Switch
              id="convite-switch"
              checked={isActive}
              onCheckedChange={(next) => {
                if (!next) setActive(false)
                else setConfirmOpen(true)
              }}
              disabled={saving || isLoading}
            />
          </div>
        </div>

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Regra Meta — Messenger fora da janela de 24h</AlertTitle>
          <AlertDescription>
            Contatos no Messenger da Página que não conversaram nas últimas 24h NÃO recebem o
            disparo (política Meta / App Review). Ficam registrados como "fora da janela" e são
            retomados quando houver resposta do cliente. WhatsApp segue a régua normal.
          </AlertDescription>
        </Alert>

        <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Texto do convite (definido pelo Mauro)
          </p>
          <p className="text-sm leading-relaxed">{CONVITE_TEXTO_MAURO}</p>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Link da landing page anexado à mensagem
          </p>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <code className="flex-1 break-all text-sm">{landingUrl}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(landingUrl)
                toast({ title: 'Link copiado' })
              }}
            >
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Rota pública (sem login): <code>/lancamento/vistage</code> — também atende{' '}
            <code>/vistage</code> e <code>/site</code>.
          </p>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ativar o disparo do convite?</DialogTitle>
              <DialogDescription>
                Ao ativar, o cron da régua começará a enviar a mensagem de convite + link para a
                lista, em ordem alfabética a partir da letra A, dentro da janela 8h–18h. Digite
                ATIVAR para confirmar.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Digite ATIVAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText.trim().toUpperCase() !== 'ATIVAR' || saving}
                onClick={() => setActive(true)}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirmar ativação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default ConviteLandingPanel
