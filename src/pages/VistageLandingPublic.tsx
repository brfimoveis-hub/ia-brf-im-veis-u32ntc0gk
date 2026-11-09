import { useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Loader2, MapPin, CheckCircle2, MessageCircle } from 'lucide-react'
import { useLaunchDossier } from '@/hooks/use-launch-dossier'
import { LeadForm } from '@/components/landing/LeadForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Fotos oficiais de Lazer e Áreas Comuns do Vistage enviadas pelo Mauro
// Sequência: (1) Piscina/rooftop cascata, (2) Salão Gourmet/jogos, (3) Lobby recepção madeira
import fotoPiscinaRooftop from '@/assets/30-5e980.png'
import fotoSalaoGourmet from '@/assets/24-94861.png'
import fotoLobbyRecepcao from '@/assets/22-a73bf.png'

// Foto de fachada do Vistage quando dossiê não tiver imagem cadastrada
const FALLBACK_HERO_IMG =
  'https://img.usecurling.com/p/1200/700?q=modern%20apartment%20building%20facade'

function buildWhatsAppCta(launch: { cta_whatsapp_number?: string; cta_default_message?: string }) {
  const digits = (launch.cta_whatsapp_number || '').replace(/\D/g, '')
  const msg = encodeURIComponent(
    launch.cta_default_message ||
      'Olá! Vim pela landing page e quero saber mais sobre o Vistage Residence.',
  )
  if (!digits) return null
  return `https://wa.me/${digits}?text=${msg}`
}

export default function VistageLandingPublic() {
  const { slug: slugParam } = useParams()
  const slug = slugParam || 'vistage'

  const { data: launch, isLoading, isError } = useLaunchDossier(slug)

  // Capa = FOTO PRINCIPAL DO EMPREENDIMENTO do dossiê (launches / properties)
  const heroImg = useMemo(() => {
    if (!launch) return FALLBACK_HERO_IMG

    // 1. Imagem de capa explícita no record (se existir no schema dinâmico)
    const rec = launch as unknown as Record<string, unknown>
    const coverVal =
      rec.cover_image || rec.image || rec.foto_principal || rec.foto_fachada || rec.image_url
    if (coverVal && typeof coverVal === 'string') {
      const fileBase = launch.collectionId
        ? `${import.meta.env.VITE_POCKETBASE_URL || ''}/api/files/${launch.collectionId}/${launch.id}/${coverVal}`
        : coverVal
      return coverVal.startsWith('http') ? coverVal : fileBase
    }

    // 2. Primeira foto da galeria de imagens do lançamento
    if (launch.images && launch.images.length > 0) {
      const first = launch.images[0]
      if (first.startsWith('http')) return first
      if (launch.collectionId) {
        return `${import.meta.env.VITE_POCKETBASE_URL || ''}/api/files/${launch.collectionId}/${launch.id}/${first}`
      }
      return first
    }

    // 3. Foto oficial do empreendimento no catálogo da BRF Imóveis (Vistage Residence Barreiros - AJ Coelho)
    const isVistage =
      slug.includes('vistage') ||
      (launch.name && launch.name.toLowerCase().includes('vistage')) ||
      (launch.enterprise_name && launch.enterprise_name.toLowerCase().includes('vistage'))
    if (isVistage) {
      return 'https://www.brfimoveis.com.br/admin/imovel/mini/20260831T1600430300-579711422.jpg'
    }

    // 4. Fallback neutro
    return FALLBACK_HERO_IMG
  }, [launch, slug])

  // Galeria de Lazer & Áreas Comuns na sequência oficial definida pelo Mauro:
  // 1. Piscina coberta / rooftop com cascata e tijolinho
  // 2. Salão de festas gourmet com churrasqueira, bar e mesa de jogos
  // 3. Lobby / recepção com painel de madeira e sofás cinza
  const gallery = useMemo(() => {
    const defaultPhotos = [
      {
        src: fotoPiscinaRooftop,
        alt: 'Piscina no Rooftop com cascata e tijolinho — Vistage Residence',
        title: 'Piscina no Rooftop & Cascata',
      },
      {
        src: fotoSalaoGourmet,
        alt: 'Salão de festas gourmet com bar e mesa de jogos — Vistage Residence',
        title: 'Salão Gourmet & Jogos',
      },
      {
        src: fotoLobbyRecepcao,
        alt: 'Lobby e recepção com painel de madeira e sofás cinza — Vistage Residence',
        title: 'Lobby & Recepção',
      },
    ]

    if (!launch) return defaultPhotos

    const fileBase = launch.collectionId
      ? `${import.meta.env.VITE_POCKETBASE_URL || ''}/api/files/${launch.collectionId}`
      : null

    const resolveImg = (f: string) => {
      if (!f) return FALLBACK_HERO_IMG
      if (/^https?:\/\//.test(f)) return f
      if (fileBase) return `${fileBase}/${launch.id}/${f}`
      return FALLBACK_HERO_IMG
    }

    // Se houver fotos adicionais válidas cadastradas no dossiê que não sejam repetidas
    const extraPhotos = (launch.images || [])
      .map((f, i) => {
        const resolved = resolveImg(f)
        if (!resolved || resolved === FALLBACK_HERO_IMG) return null
        return {
          src: resolved,
          alt: `${launch.enterprise_name || launch.name} — foto ${i + 1}`,
          title: `Área Comum ${i + 1}`,
        }
      })
      .filter((item): item is { src: string; alt: string; title: string } => item !== null)

    return [...defaultPhotos, ...extraPhotos]
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

  const whatsUrl = buildWhatsAppCta(launch)

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white">
      {/* HERO — CAPA COM FOTO PRINCIPAL DO EMPREENDIMENTO */}
      <section className="relative min-h-[85dvh] overflow-hidden">
        <img
          src={heroImg}
          alt={launch.enterprise_name || launch.name || 'Vistage Residence Barreiros'}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-neutral-950" />
        <div className="relative z-10 mx-auto flex min-h-[85dvh] w-full max-w-5xl flex-col justify-end px-5 pb-14 pt-24">
          <Badge className="mb-4 w-fit border-amber-500/40 bg-amber-500/15 text-amber-300">
            {launch.status === 'publicado' ? 'LANÇAMENTO' : 'PRÉ-LANÇAMENTO EXCLUSIVO'}
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
                  <MessageCircle className="h-5 w-5 mr-1" /> Falar com a Bia no WhatsApp
                </a>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 border-white/30 text-base font-semibold text-white hover:bg-white/10"
            >
              <a href="#interesse">Quero receber plantas e valores</a>
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
          <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">
            Diferenciais do Projeto
          </h2>
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

      {/* LAZER & ÁREAS COMUNS (GALERIA) */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <h2 className="mb-2 text-center text-2xl font-bold sm:text-3xl">Lazer & Áreas Comuns</h2>
        <p className="mb-8 text-center text-sm text-white/50">
          Estrutura completa entregue equipada, decorada e climatizada
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {gallery.map((photo, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-lg"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3.5 pt-8">
                <p className="text-sm font-semibold text-white drop-shadow-xs">{photo.title}</p>
                <p className="text-[11px] text-white/70">Vistage Residence</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TABELA DE VALORES */}
      {!!launch.units?.length && (
        <section className="mx-auto max-w-3xl px-5 pb-16">
          <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">
            Tabela Oficial do Lançamento
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-4 py-3">Tipologia</th>
                  <th className="px-4 py-3">Área Privativa</th>
                  <th className="px-4 py-3 text-right">Valor a partir de</th>
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
              <span className="font-semibold text-white/80">Condições especiais: </span>
              {launch.payment_terms}
            </p>
          )}
        </section>
      )}

      {/* FORMULÁRIO DE INTERESSE */}
      <section id="interesse" className="mx-auto max-w-md scroll-mt-8 px-5 pb-20">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 sm:p-8">
          <h2 className="text-center text-2xl font-bold">Quero conhecer o Vistage</h2>
          <p className="mb-6 mt-2 text-center text-sm text-white/60">
            Preencha e a Bia te chama no WhatsApp com plantas, valores e condições do lançamento.
          </p>
          <LeadForm launchName={launch.enterprise_name || launch.name} launchSlug={launch.slug} />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-white/40">
        {launch.name} · BRF Imóveis — CRECI ·{' '}
        <a
          href={launch.website_url || 'https://brfimoveis.com.br'}
          className="underline hover:text-white"
        >
          brfimoveis.com.br
        </a>
      </footer>
    </div>
  )
}
