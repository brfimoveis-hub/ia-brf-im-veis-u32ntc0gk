import { Layers, AlertCircle, CheckCircle2, Search, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { InstagramPortfolioPage } from '@/services/instagram'

interface InstagramPortfolioScanProps {
  scan: InstagramPortfolioPage[]
  error?: string | null
  targetUsername?: string
}

export function InstagramPortfolioScan({
  scan,
  error,
  targetUsername = 'mauro.brfimoveis',
}: InstagramPortfolioScanProps) {
  const cleanTarget = targetUsername.toLowerCase().replace(/^@/, '')

  const matchedPage = scan.find((p) => {
    if (!p.ig_username) return false
    const u = p.ig_username.toLowerCase().replace(/^@/, '')
    return u === cleanTarget || u.includes(cleanTarget) || cleanTarget.includes(u)
  })

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3.5 space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Search className="h-4 w-4 text-purple-600 shrink-0" />
          <span>Varredura do Portfólio — onde está o @{targetUsername}?</span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-background">
          {scan.length} {scan.length === 1 ? 'página' : 'páginas'} no portfólio
        </Badge>
      </div>

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Varredura automática em todas as Páginas do portfólio empresarial (via tokens de sistema /
        CAPI) para identificar onde o Instagram está conectado:
      </p>

      {/* Destaque de resultado quando o @ alvo é localizado */}
      {matchedPage && (
        <div className="p-2.5 rounded bg-green-500/15 border border-green-500/30 text-green-800 text-[11px] flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-green-900">
              Conta @{matchedPage.ig_username} encontrada na Página &quot;{matchedPage.page_name}
              &quot;!
            </p>
            <p className="text-green-800">
              ID da Página:{' '}
              <code className="font-mono bg-white/70 px-1 py-0.5 rounded">
                {matchedPage.page_id}
              </code>{' '}
              | ID do Instagram:{' '}
              <code className="font-mono bg-white/70 px-1 py-0.5 rounded">
                {matchedPage.ig_account_id}
              </code>
            </p>
          </div>
        </div>
      )}

      {/* Erro amigável se a consulta falhou */}
      {error && scan.length === 0 && (
        <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Não foi possível varrer o portfólio neste momento</span>
          </div>
          <p className="text-[11px] text-amber-700">{error}</p>
        </div>
      )}

      {/* Tabela de páginas do portfólio */}
      {scan.length > 0 ? (
        <div className="overflow-x-auto rounded border bg-background">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="py-1.5 px-2.5">Nome da Página</th>
                <th className="py-1.5 px-2.5">Instagram Vinculado</th>
                <th className="py-1.5 px-2.5">ID da Página</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {scan.map((page) => {
                const isMatch =
                  page.ig_username &&
                  (page.ig_username.toLowerCase().replace(/^@/, '') === cleanTarget ||
                    page.ig_username.toLowerCase().replace(/^@/, '').includes(cleanTarget) ||
                    cleanTarget.includes(page.ig_username.toLowerCase().replace(/^@/, '')))

                return (
                  <tr
                    key={page.page_id}
                    className={`transition-colors ${
                      isMatch
                        ? 'bg-green-500/15 font-medium'
                        : page.has_ig
                          ? 'bg-purple-500/5 hover:bg-purple-500/10'
                          : 'hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <td className="py-2 px-2.5">
                      <div className="flex items-center gap-1.5">
                        <Building2
                          className={`h-3 w-3 shrink-0 ${
                            isMatch
                              ? 'text-green-700'
                              : page.has_ig
                                ? 'text-purple-600'
                                : 'text-muted-foreground'
                          }`}
                        />
                        <span
                          className={`font-medium ${isMatch ? 'text-green-950 font-semibold' : 'text-foreground'}`}
                        >
                          {page.page_name}
                        </span>
                        {isMatch && (
                          <Badge className="bg-green-600 text-white text-[9px] px-1 py-0 h-4">
                            Conta Alvo!
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2.5">
                      {page.has_ig && page.ig_account_id ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={
                              isMatch ? 'text-green-900 font-bold' : 'text-purple-700 font-semibold'
                            }
                          >
                            @{page.ig_username || 'desconhecido'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            (ID: {page.ig_account_id})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Nenhum</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[10px] text-muted-foreground">
                      {page.page_id}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        !error && (
          <p className="text-muted-foreground text-[11px] italic">
            Nenhuma página listada no portfólio.
          </p>
        )
      )}

      {scan.length > 0 && !matchedPage && (
        <div className="p-2 rounded bg-muted/60 border text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>
            Nenhuma das {scan.length} páginas acima possui o Instagram @{targetUsername} vinculado.
            O vínculo precisa ser feito pelo app do Instagram.
          </span>
        </div>
      )}
    </div>
  )
}
