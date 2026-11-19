import { Instagram, CheckCircle2, AlertCircle, XCircle, RefreshCw, Link2, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type {
  InstagramWebhookSubscription,
  InstagramPageLinkedAccount,
  InstagramGraphError,
} from '@/services/instagram'

interface InstagramDiagExtrasProps {
  webhookSubscription?: InstagramWebhookSubscription | null
  pagesLookup?: {
    ok: boolean
    attempted?: boolean
    http_status?: number
    proof_enviado?: string
    error?: InstagramGraphError | null
    skipped_reason?: string
    via?: string
  } | null
  pageLinkedInstagram?: InstagramPageLinkedAccount | null
}

/**
 * Blocos de diagnóstico v0.0.1428 do cartão Instagram Business:
 *
 *  - Vínculo Instagram ↔ Página (pages_lookup + page_linked_instagram):
 *    mostra o @/ID do Instagram business vinculado à Página www.brfimoveis.com.br.
 *  - Assinatura de webhooks da Página (webhook_subscription): status simples —
 *    antes/depois/reassinado — em português, sem jargão técnico.
 */
export function InstagramDiagExtras({
  webhookSubscription,
  pagesLookup,
  pageLinkedInstagram,
}: InstagramDiagExtrasProps) {
  if (!webhookSubscription && !pagesLookup && !pageLinkedInstagram) return null

  // --- Vínculo Instagram ↔ Página -----------------------------------------
  const igLinked = !!pageLinkedInstagram?.linked
  const igUsername = pageLinkedInstagram?.username || ''
  const igId = pageLinkedInstagram?.id || ''
  const pageName = pageLinkedInstagram?.page_name || ''

  // --- Assinatura de webhook ----------------------------------------------
  const sub = webhookSubscription || null
  const subOk = !!sub?.ok && (sub?.error ? false : true)
  const afterCount = sub?.after?.length ?? 0
  const missingCount = sub?.missing_fields?.length ?? 0

  return (
    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3 text-xs">
      {/* 1) Vínculo Instagram Business ↔ Página ---------------------------- */}
      {pageLinkedInstagram !== undefined && pageLinkedInstagram !== null && (
        <div
          className={`p-3 rounded border flex items-start gap-2.5 ${
            igLinked ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          {igLinked ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
              <Instagram className="h-3.5 w-3.5 shrink-0" />
              Instagram vinculado à Página
              {pageName ? (
                <span className="font-normal text-muted-foreground">“{pageName}”</span>
              ) : null}
            </p>
            {igLinked ? (
              <p className="text-muted-foreground leading-relaxed">
                A Página está publicando como o Instagram{' '}
                <strong className="text-foreground">@{igUsername || 'desconhecido'}</strong>
                {igId ? (
                  <>
                    {' '}
                    <code className="font-mono text-[11px] bg-background px-1 py-0.5 rounded border text-foreground">
                      ID: {igId}
                    </code>
                  </>
                ) : null}
                . As mensagens do Direct chegam na Bia normalmente.
              </p>
            ) : (
              <p className="text-amber-800 leading-relaxed">
                Nenhuma conta do Instagram está vinculada a essa Página na Meta. Vincule a conta{' '}
                <strong>@brf_imoveis_</strong> à Página no Instagram (Configurações → Empresa →
                Conectar uma Página) e clique em Verificar Agora.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 2) Assinatura de webhooks da Página ------------------------------- */}
      {sub && (
        <div
          className={`p-3 rounded border flex items-start gap-2.5 ${
            subOk ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          {subOk ? (
            <Bell className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
              Recebimento de mensagens da Página (webhook)
              {subOk && afterCount > 0 ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30"
                >
                  Ativo
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30"
                >
                  Atenção
                  {(sub?.error || !sub?.ok) && ' — falha na leitura'}
                </Badge>
              )}
            </p>
            {subOk ? (
              <>
                <p className="text-muted-foreground leading-relaxed">
                  {sub?.subscribed_now
                    ? 'A inscrição foi renovada agora — a Página já está recebendo as mensagens do Instagram e do Messenger no CRM.'
                    : afterCount > 0
                      ? 'A Página já está inscrita para receber as mensagens do Instagram e do Messenger no CRM.'
                      : 'Leitura OK, mas a Página não está inscrita em nenhum campo de mensagens.'}
                </p>
                {afterCount > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(sub?.after || []).map((f) => (
                      <code
                        key={f}
                        className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono text-muted-foreground"
                      >
                        {f}
                      </code>
                    ))}
                  </div>
                )}
                {!!sub?.subscribed_now && (
                  <p className="text-[11px] text-green-700 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 shrink-0" />
                    Reassinado automaticamente nesta verificação.
                  </p>
                )}
                {missingCount > 0 && (
                  <p className="text-[11px] text-amber-700 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Campos que faltavam (reassinados): {(sub?.missing_fields || []).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-amber-800 leading-relaxed">
                Não foi possível confirmar a inscrição de webhooks da Página na Meta
                {sub?.error?.message ? ` — motivo: ${sub.error.message}` : '.'} O CRM continua
                funcionando, mas vale conferir as permissões da Página no Meta Business Suite.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default InstagramDiagExtras
