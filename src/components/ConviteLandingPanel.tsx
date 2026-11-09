import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
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
import { Loader2, Rocket, ShieldAlert, Link2, CheckCircle2, Copy } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// Texto EXATO do convite, palavras do Mauro — constante imutável
export const CONVITE_TEXTO_MAURO =
  'Como você já está na nossa lista de contatos, tomamos a liberdade de enviar um convite para conhecer esse lançamento. Talvez seja o seu momento de investir ou adquirir seu primeiro imóvel.'

const CONVITE_KEY = 'convite_vistage'

export interface ConviteSettings {
  id: string
  key: string
  is_active: boolean
  metadata?: string | Record<string, unknown>
  description?: string
}

function parseMetadata(raw: ConviteSettings['metadata']): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * Painel do disparo do convite Vistage (rota /settings/connections).
 * Mostra o texto exato, campo do link da landing e o botão ligar/desligar
 * (estado persistido em app_controls key='convite_vistage', is_active=false por padrão).
 */
export function ConviteLandingPanel() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [saving, setSaving] = useState(false)

  const { data, refetch, isLoading } = useQuery<ConviteSettings | null>({
    queryKey: ['convite_vistage_settings'],
    queryFn: async () => {
      try {
        const rec = await pb
          .collection('app_controls')
          .getFirstListItem<ConviteSettings>(`key = "${CONVITE_KEY}"`)
        return rec
      } catch {
        return null
      }
    },
  })

  const meta = parseMetadata(data?.metadata)
  const isActive = !!data?.is_active
  const landingUrl = String(meta.link || '') || `${window.location.origin}/lancamento/vistage`
  const [linkDraft, setLinkDraft] = useState('')
  const [linkDirty, setLinkDirty] = useState(false)

  useEffect(() => {
    if (!linkDirty) {
      setLinkDraft(landingUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id, data?.metadata])

  const saveLink = useCallback(
    async (url: string) => {
      setSaving(true)
      try {
        if (data) {
          await pb.collection('app_controls').update(data.id, {
            metadata: JSON.stringify({ ...meta, link: url }),
          })
        } else {
          await pb.collection('app_controls').create({
            key: CONVITE_KEY,
            name: 'Disparo do Convite Vistage (com link da landing page)',
            is_active: false,
            description: 'PAUSADO por padrão. Ativar SOMENTE pelo painel após aprovação do Mauro.',
            metadata: JSON.stringify({
              mensagem: CONVITE_TEXTO_MAURO,
              link: url,
              cursor_nome: '',
              total_enviados: 0,
            }),
          })
        }
        toast({
          title: 'Link salvo',
          description: 'O link da landing page foi gravado no controle do disparo.',
        })
        setLinkDirty(false)
        refetch()
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Falha ao salvar o link.'
        toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' })
      } finally {
        setSaving(false)
      }
    },
    [data, meta, refetch, toast],
  )

  const setActive = useCallback(
    async (active: boolean) => {
      // Guarda: NÃO permite ligar o disparo sem o link preenchido
      const currentLink = String(parseMetadata(data?.metadata).link || '').trim()
      if (active && !currentLink) {
        toast({
          title: 'Link obrigatório',
          description:
            'Cole o link da landing page antes de ativar o disparo — ele é anexado à mensagem.',
          variant: 'destructive',
        })
        return
      }
      setSaving(true)
      try {
        if (data) {
          await pb.collection('app_controls').update(data.id, { is_active: active })
        } else {
          await pb.collection('app_controls').create({
            key: CONVITE_KEY,
            name: 'Disparo do Convite Vistage (com link da landing page)',
            is_active: active,
            description: 'PAUSADO por padrão. Ativar SOMENTE pelo painel após aprovação do Mauro.',
            metadata: JSON.stringify({
              mensagem: CONVITE_TEXTO_MAURO,
              link: currentLink,
              cursor_nome: '',
              total_enviados: 0,
            }),
          })
        }
        toast({
          title: active ? 'Disparo ATIVADO' : 'Disparo PAUSADO',
          description: active
            ? 'O cron começará a enviar o convite (ordem alfabética, a partir da letra A, janela 8h–18h).'
            : 'Nenhum convite será enviado até a próxima ativação.',
        })
        setConfirmOpen(false)
        setConfirmText('')
        refetch()
        queryClient.invalidateQueries({ queryKey: ['convite_vistage_settings'] })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Falha ao atualizar o estado do disparo.'
        toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' })
      } finally {
        setSaving(false)
      }
    },
    [data, refetch, toast, queryClient],
  )

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
              {isActive ? 'ATIVO — disparos em andamento' : 'DESLIGADO — nada será enviado'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'ATIVO' : 'DESLIGADO'}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={linkDraft}
              onChange={(e) => {
                setLinkDraft(e.target.value)
                setLinkDirty(true)
              }}
              placeholder={`${window.location.origin}/lancamento/vistage`}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(linkDraft)
                toast({ title: 'Link copiado' })
              }}
            >
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Rota pública (sem login): <code>/lancamento/vistage</code> — ou o link final de produção
            (brfimoveis.com.br). O disparo só inicia com o link preenchido.
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => saveLink(linkDraft.trim())} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Salvar link
            </Button>
          </div>
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
