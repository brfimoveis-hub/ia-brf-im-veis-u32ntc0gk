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
import {
  Loader2,
  Rocket,
  ShieldAlert,
  Link2,
  CheckCircle2,
  Copy,
  Users,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// Texto EXATO do convite, palavras do Mauro — constante imutável
export const CONVITE_TEXTO_MAURO =
  'Como você já está na nossa lista de contatos, tomamos a liberdade de enviar um convite para conhecer esse lançamento. Talvez seja o seu momento de investir ou adquirir seu primeiro imóvel.'

export const CONVITE_KEY = 'convite_vistage'
export const CONVITE_DEFAULT_LINK = 'https://ia-uazapi-6d79e--preview.goskip.app/lancamento/vistage'

export interface ConviteSettings {
  id: string
  key: string
  is_active: boolean
  metadata?: string | Record<string, unknown>
  description?: string
}

interface CustomerQueueItem {
  id: string
  name: string
  phone: string
}

interface SystemLogItem {
  id: string
  created: string
  type: string
  message: string
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
 * Painel do disparo do convite Vistage (rota /configuracoes / SettingsConnections).
 * Exibe:
 * - Texto exato de convite (verbatim Mauro)
 * - Campo para o link da landing page (default https://ia-uazapi-6d79e--preview.goskip.app/lancamento/vistage)
 * - Botão ligar/desligar do disparo (persistido em app_controls key='convite_vistage', is_active=false por padrão)
 * - Status do cursor (próximos da fila em ordem alfabética)
 * - Histórico de erros / logs de envio e política 24h Meta
 */
export function ConviteLandingPanel() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [saving, setSaving] = useState(false)

  // 1. Carrega controle em app_controls
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
  const cursorNome = String(meta.cursor_nome || '').trim()
  const ultimoEnviadoNome = String(meta.ultimo_enviado_nome || '').trim()
  const totalEnviados = Number(meta.total_enviados || 0)

  const landingUrl =
    String(meta.link || '').trim() ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/lancamento/vistage`
      : CONVITE_DEFAULT_LINK)

  const [linkDraft, setLinkDraft] = useState('')
  const [linkDirty, setLinkDirty] = useState(false)

  useEffect(() => {
    if (!linkDirty) {
      setLinkDraft(landingUrl)
    }
  }, [data?.id, landingUrl, linkDirty])

  // 2. Carrega contagem total de clientes válidos na base
  const { data: totalBaseCount } = useQuery<number>({
    queryKey: ['convite_vistage_total_customers'],
    queryFn: async () => {
      try {
        const res = await pb.collection('customers').getList(1, 1, {
          filter: "phone != '' && is_blocked = false",
          count: true,
        })
        return res.totalItems
      } catch {
        return 0
      }
    },
    staleTime: 60000,
  })

  // 3. Carrega os próximos contatos da fila de acordo com o cursor atual
  const { data: nextQueue, refetch: refetchQueue } = useQuery<CustomerQueueItem[]>({
    queryKey: ['convite_vistage_queue', cursorNome],
    queryFn: async () => {
      try {
        const filterStr = cursorNome
          ? `name >= "${cursorNome.replace(/"/g, '\\"')}" && phone != '' && is_blocked = false`
          : `phone != '' && is_blocked = false`
        const res = await pb.collection('customers').getList<CustomerQueueItem>(1, 5, {
          filter: filterStr,
          sort: 'name',
          fields: 'id,name,phone',
        })
        return res.items
      } catch {
        return []
      }
    },
    staleTime: 15000,
  })

  // 4. Carrega logs recentes de envio e erros
  const { data: recentLogs, refetch: refetchLogs } = useQuery<SystemLogItem[]>({
    queryKey: ['convite_vistage_logs'],
    queryFn: async () => {
      try {
        const res = await pb.collection('system_logs').getList<SystemLogItem>(1, 6, {
          filter:
            "type = 'convite_vistage_falha' || type = 'convite_vistage_fora_janela' || type = 'convite_vistage_sucesso'",
          sort: '-created',
          fields: 'id,created,type,message',
        })
        return res.items
      } catch {
        return []
      }
    },
    staleTime: 15000,
  })

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

  const resetCursor = useCallback(async () => {
    if (!data) return
    setSaving(true)
    try {
      await pb.collection('app_controls').update(data.id, {
        metadata: JSON.stringify({
          ...meta,
          cursor_nome: '',
          ultimo_enviado_nome: '',
        }),
      })
      toast({
        title: 'Fila reiniciada',
        description: 'O cursor voltou ao início da base de contatos.',
      })
      refetch()
      refetchQueue()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao reiniciar fila.'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [data, meta, refetch, refetchQueue, toast])

  const setActive = useCallback(
    async (active: boolean) => {
      const currentLink = String(parseMetadata(data?.metadata).link || linkDraft || '').trim()
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
          await pb.collection('app_controls').update(data.id, {
            is_active: active,
            metadata: JSON.stringify({ ...meta, link: currentLink }),
          })
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
            ? 'O cron enviará o convite em lotes para TODOS os contatos (ordem alfabética, janela 8h–18h).'
            : 'Nenhum convite será enviado até a próxima ativação manual.',
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
    [data, linkDraft, meta, refetch, toast, queryClient],
  )

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Disparo do Convite Vistage Residence (com landing page)</CardTitle>
            <CardDescription>
              Mensagem de convite + link da landing page enviada para toda a base de clientes
              (~6.356 contatos), respeitando janela comercial 8h–18h e guarda de 24h da Meta.
              Disparo nasce DESLIGADO.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle Ligar / Desligar */}
        <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
          <div className="space-y-1">
            <Label htmlFor="convite-switch" className="text-base font-semibold">
              Estado do disparo
            </Label>
            <p className="text-sm text-muted-foreground">
              {isActive
                ? 'ATIVO — disparos em andamento (janela 8h–18h, lotes a cada 15 min)'
                : 'DESLIGADO — nada será enviado até o Mauro aprovar e ligar'}
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

        {/* Alerta de Política Meta 24h */}
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Regra Meta — Messenger fora da janela de 24h</AlertTitle>
          <AlertDescription>
            Contatos cuja última conversa é Messenger ou Instagram Direct fora da janela de 24h NÃO
            recebem o disparo (política oficial Meta). São registrados como &quot;fora da
            janela&quot; para evitar bloqueio da Página. WhatsApp da WABA oficial segue normal.
          </AlertDescription>
        </Alert>

        {/* Texto do Convite Verbatim Mauro */}
        <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Texto do convite (palavras exatas do Mauro — imutável)
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                navigator.clipboard?.writeText(CONVITE_TEXTO_MAURO)
                toast({ title: 'Texto copiado' })
              }}
            >
              <Copy className="h-3 w-3 mr-1" /> Copiar texto
            </Button>
          </div>
          <p className="text-sm leading-relaxed font-medium bg-background/80 p-3 rounded border">
            &ldquo;{CONVITE_TEXTO_MAURO}&rdquo;
          </p>
        </div>

        {/* Link da Landing Page */}
        <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Link da landing page anexado ao convite
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={linkDraft}
              onChange={(e) => {
                setLinkDraft(e.target.value)
                setLinkDirty(true)
              }}
              placeholder={CONVITE_DEFAULT_LINK}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(linkDraft)
                toast({ title: 'Link copiado' })
              }}
            >
              <Copy className="h-3 w-3 mr-1" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Rota pública do CRM: <code>/lancamento/vistage</code>. Default recomendado:{' '}
            <code className="text-xs">{CONVITE_DEFAULT_LINK}</code>. O disparo não inicia sem o link
            preenchido.
          </p>
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => saveLink(linkDraft.trim())} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Salvar link
            </Button>
          </div>
        </div>

        {/* Status do Cursor e Fila da Campanha */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">
                Status da fila de envio (toda a base de clientes)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Total base: {totalBaseCount ?? '...'} contatos
              </Badge>
              <Badge variant="outline" className="text-xs">
                Enviados: {totalEnviados}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={resetCursor}
                disabled={saving || !cursorNome}
                title="Reiniciar cursor para a primeira letra da base"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar fila
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded border bg-muted/20 p-2.5 space-y-1">
              <span className="text-muted-foreground font-semibold">
                Cursor atual (próximo contato):
              </span>
              <p className="font-mono text-foreground font-medium">
                {cursorNome ? `"${cursorNome}"` : 'Início da lista (letra A)'}
              </p>
              {ultimoEnviadoNome && (
                <p className="text-muted-foreground text-[11px]">
                  Último enviado com sucesso:{' '}
                  <span className="text-foreground">{ultimoEnviadoNome}</span>
                </p>
              )}
            </div>

            <div className="rounded border bg-muted/20 p-2.5 space-y-1">
              <span className="text-muted-foreground font-semibold">Próximos 5 na fila:</span>
              {nextQueue && nextQueue.length > 0 ? (
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {nextQueue.map((item, idx) => (
                    <li key={item.id} className="truncate">
                      {idx + 1}. {item.name || 'Sem nome'} (
                      {item.phone
                        ? `${item.phone.slice(0, 4)}...${item.phone.slice(-4)}`
                        : 'sem fone'}
                      )
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground italic">
                  Nenhum próximo contato ou final da fila atingido.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Histórico Recente de Erros / Logs do Disparo */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-semibold">Histórico de envio e erros (system_logs)</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                refetchLogs()
                refetchQueue()
              }}
            >
              Atualizar
            </Button>
          </div>

          {recentLogs && recentLogs.length > 0 ? (
            <div className="space-y-1.5">
              {recentLogs.map((log) => {
                const isFail = log.type === 'convite_vistage_falha'
                const isMetaGuarded = log.type === 'convite_vistage_fora_janela'
                return (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-2 rounded border p-2 text-xs bg-muted/10"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={isFail ? 'destructive' : isMetaGuarded ? 'secondary' : 'default'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {isFail ? 'Falha envio' : isMetaGuarded ? 'Meta 24h guarda' : 'Sucesso'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(log.created).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-foreground leading-snug">{log.message}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic py-1">
              Nenhum erro de envio registrado até o momento.
            </p>
          )}
        </div>

        {/* Diálogo de confirmação para ligar */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ativar o disparo do convite para toda a base?</DialogTitle>
              <DialogDescription>
                O cron começará a enviar a mensagem de convite + link para toda a base de clientes
                (~6.356 contatos), em lotes pequenos a cada 15 minutos dentro da janela comercial
                8h–18h. Digite <strong>ATIVAR</strong> para confirmar.
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
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
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
