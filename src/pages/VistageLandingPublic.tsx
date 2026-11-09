import { useMemo } from 'react'
import { useLocation, useParams, Navigate } from 'react-router-dom'
import { Loader2, MapPin, CheckCircle2, MessageCircle, Building2 } from 'lucide-react'
import { useLaunchDossier } from '@/hooks/use-launch-dossier'
import { LeadForm } from '@/components/landing/LeadForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const PLACEHOLDER_IMG =
  'https://img.usecurling.com/p/1200/700?q=modern%20apartment%20building%20facade'

function buildWhatsAppCta(launch: { cta_whatsapp_number?: string; cta_default_message?: string }) {
  const digits = (launch.cta_whatsapp_number || '').replace(/\D/g, '')
  const msg = encodeURIComponent(
    launch.cta_default_message || 'Olá! Vim pela landing page e quero saber mais.',
  )
  if (!digits) return null
  return `https://wa.me/${digits}?text=${msg}`
}

export default function VistageLandingPublic() {
  const { slug: slugParam } = useParams()
  const location = useLocation()
  const slug = slugParam || 'vistage'

  const { data: launch, isLoading, isError } = useLaunchDossier(slug)

  const heroImg = useMemo(() => {
    if (!launch) return PLACEHOLDER_IMG
    const first = launch.images?.[0]
    if (!first) return PLACEHOLDER_IMG
    return first.startsWith('http') ? first : first // file url built below
  }, [launch])

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (isError || !launch) {
    return <Navigate to="/404" replace />
  }

  const fileBase = launch.collectionId
    ? `${import.meta.env.VITE_POCKETBASE_URL || ''}/api/files/${launch.collectionId}`
    : null
  const resolveImg = (f: string) => {
    if (/^https?:\/\//.test(f)) return f
    if (fileBase) return `${fileBase}/${launch.id}/${f}`
    return PLACEHOLDER_IMG
  }

  const gallery = (launch.images || []).slice(0, 6)
  const whatsUrl = buildWhatsAppCta(launch)

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white">
      {/* HERO */}
      <section className="relative min-h-[85dvh] overflow-hidden">
        <img
          src={resolveImg(heroImg)}
          alt={launch.enterprise_name || launch.name}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-neutral-950" />
        <div className="relative z-10 mx-auto flex min-h-[85dvh] w-full max-w-5xl flex-col justify-end px-5 pb-14 pt-24">
          <Badge className="mb-4 w-fit border-amber-500/40 bg-amber-500/15 text-amber-300">
            {launch.status === 'publicado' ? 'LANÇAMENTO' : 'PRÉ-LANÇAMENTO'}
          </Badge>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            {launch.enterprise_name || launch.name}
          </h1>
          {launch.location && (
            <p className="mt-3 flex items-center gap-2 text-lg text-white/80">
              <MapPin className="h-5 w-5 text-amber-500" />
              {launch.location}
            </p>
          )}
          {launch.headline && (
            <p className="mt-4 max-w-2xl text-lg text-white/90 sm:text-xl">{launch.headline}</p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {whatsUrl && (
              <Button
                asChild
                size="lg"
                className="h-14 bg-amber-500 text-base font-bold text-black hover:bg-amber-400"
              >
                <a href={whatsUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-5 w-5" /> Falar com a Bia no WhatsApp
                </a>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 border-white/30 text-base font-semibold text-white hover:bg-white/10"
            >
              <a href="#interesse">Ver plantas e valores</a>
            </Button>
          </div>
        </div>
      </section>

      {/* PROPOSTA DE VALOR */}
      {launch.description && (
        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Um novo jeito de morar em {launch.location?.split(',')[0] || 'São José'}
          </h2>
          <p className="mt-4 whitespace-pre-line text-lg text-white/70">{launch.description}</p>
        </section>
      )}

      {/* DIFERENCIAIS */}
      {!!launch.differentials?.length && (
        <section className="mx-auto max-w-5xl px-5 pb-16">
          <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">Diferenciais</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {launch.differentials.map((d, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <span className="text-sm text-white/85">{d}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GALERIA / PLANTAS */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <h2 className="mb-2 text-center text-2xl font-bold sm:text-3xl">Plantas & Galeria</h2>
        <p className="mb-8 text-center text-sm text-white/50">2 e 3 dormitórios + opções garden</p>
        {gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-8 text-center">
            <Building2 className="mx-auto h-8 w-8 text-amber-500/70" />
            <p className="mt-3 text-sm text-white/70">
              Fotos e plantas oficiais ainda não foram anexadas ao dossiê deste lançamento.
            </p>
            <p className="mt-1 text-xs text-white/40">
              (Espaço reservado — enviar as imagens para o Mauro aprovar.)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((f, i) => (
              <img
                key={i}
                src={resolveImg(f)}
                alt={`${launch.enterprise_name || launch.name} — imagem ${i + 1}`}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            ))}
          </div>
        )}
      </section>

      {/* TABELA DE VALORES (unidades do dossiê) */}
      {!!launch.units?.length && (
        <section className="mx-auto max-w-3xl px-5 pb-16">
          <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">Valores</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {launch.units.map((u, i) => (
                  <tr key={i} className={cn('border-t border-white/5', i % 2 && 'bg-white/[0.02]')}>
                    <td className="px-4 py-3 font-medium">{u.typology}</td>
                    <td className="px-4 py-3 text-white/70">{u.area}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-400">{u.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {launch.payment_terms && (
            <p className="mt-4 text-center text-sm text-white/60">
              <span className="font-semibold text-white/80">Condições: </span>
              {launch.payment_terms}
            </p>
          )}
        </section>
      )}

      {/* FORMULÁRIO DE INTERESSE */}
      <section id="interesse" className="mx-auto max-w-md scroll-mt-8 px-5 pb-20">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 sm:p-8">
          <h2 className="text-center text-2xl font-bold">Quero saber mais</h2>
          <p className="mb-6 mt-2 text-center text-sm text-white/60">
            Preencha e a Bia te chama no WhatsApp com plantas, valores e condições.
          </p>
          <LeadForm launchName={launch.enterprise_name || launch.name} launchSlug={launch.slug} />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-white/40">
        {launch.name} · BRF Imóveis — CRECI ·{' '}
        <a href={launch.website_url || 'https://brfimoveis.com.br'} className="underline">
          brfimoveis.com.br
        </a>
      </footer>
    </div>
  )
}
