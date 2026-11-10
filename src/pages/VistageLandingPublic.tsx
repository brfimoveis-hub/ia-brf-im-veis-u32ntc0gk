import { useMemo, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Loader2, MapPin, CheckCircle2, MessageCircle, HelpCircle } from 'lucide-react'
import { useLaunchDossier } from '@/hooks/use-launch-dossier'
import { LeadForm } from '@/components/landing/LeadForm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Foto aérea noturna/crepúsculo oficial do Vistage Residence Barreiros enviada pelo Mauro
import fotoHeroVistageAerea from '@/assets/17-9e9a4.png'

// Fotos oficiais de Lazer e Áreas Comuns do Vistage enviadas pelo Mauro
// Sequência: (1) Piscina/rooftop cascata, (2) Salão Gourmet/jogos, (3) Lobby recepção madeira
import fotoPiscinaRooftop from '@/assets/30-5e980.png'
import fotoSalaoGourmet from '@/assets/24-94861.png'
import fotoLobbyRecepcao from '@/assets/22-a73bf.png'

// Foto de fachada fallback do Vistage
const FALLBACK_HERO_IMG = fotoHeroVistageAerea

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

  // Estado do diálogo de captura ativado por CTAs e perguntas do FAQ
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContext, setModalContext] = useState<string>('')

  const handleOpenLeadModal = (contextTitle?: string) => {
    setModalContext(contextTitle || '')
    setModalOpen(true)
  }

  // Capa = FOTO PRINCIPAL DO EMPREENDIMENTO do dossiê (launches / properties)
  // Regra expressa do Mauro: a primeira foto do hero do Vistage Residence Barreiros
  // é a foto aérea crepuscular com o edifício em destaque, céu alaranjado e rastro de luzes.
  const heroImg = useMemo(() => {
    const isVistage =
      slug.includes('vistage') ||
      (launch?.name && launch.name.toLowerCase().includes('vistage')) ||
      (launch?.enterprise_name && launch.enterprise_name.toLowerCase().includes('vistage'))

    if (isVistage) {
      return fotoHeroVistageAerea
    }

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

    // 3. Fallback
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
      {/* HERO — CAPA COM FOTO PRINCIPAL DO EMPREENDIMENTO (foto original INTEIRA, sem corte) */}
      <section className="relative min-h-[85dvh] overflow-hidden">
        {/* Fundo: a MESMA foto desfocada só para preencher as laterais — motivo nunca cortado */}
        <img
          src={heroImg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover brightness-[0.35] blur-2xl"
          loading="eager"
        />
        {/* Foto original completa (object-contain): a maquete do prédio iluminado aparece inteira */}
        <img
          src={heroImg}
          alt={launch.enterprise_name || launch.name || 'Vistage Residence Barreiros'}
          className="absolute inset-0 h-full w-full object-contain"
          loading="eager"
        />
        {/* Degradê apenas na base, para leitura do texto — não cobre o prédio */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto flex min-h-[85dvh] w-full max-w-5xl flex-col justify-end px-5 pb-14 pt-32">
          <Badge className="mb-4 w-fit border-amber-500/40 bg-amber-500/15 text-amber-300">
            Novo Lançamento
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
                className="h-14 bg-emerald-500 text-base font-bold text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
              >
                <a href={whatsUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-5 w-5 mr-1.5" /> Falar com a Bia no WhatsApp
                </a>
              </Button>
            )}
            <Button
              type="button"
              onClick={() =>
                handleOpenLeadModal('Interesse geral: Plantas e Valores do Lançamento')
              }
              size="lg"
              className="h-14 bg-amber-500 text-base font-bold text-black hover:bg-amber-400"
            >
              Quero receber plantas e valores
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 border-white/30 text-base font-semibold text-white hover:bg-white/10"
            >
              <a href="#interesse">Preencher formulário completo</a>
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

      {/* SEÇÃO DE VALORES DE REFERÊNCIA (APENAS REFERÊNCIA + NOTA CUB, SEM TABELA COMPLETA) */}
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-white/[0.03] to-transparent p-8 text-center sm:p-10">
          <Badge className="mb-3 bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/20">
            Valores de Referência
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">Condições de Pré-Lançamento</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/70 sm:text-base">
            Valores iniciais das primeiras unidades disponíveis direto com a construtora AJ Coelho.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 text-left">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                  2 Dormitórios com Suíte
                </span>
                <p className="mt-2 text-3xl font-extrabold text-white">a partir de R$ 607.880</p>
                <p className="mt-2 text-xs text-white/60">
                  Plantas inteligentes a partir de 66m² privativos com sacada e churrasqueira a
                  carvão.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleOpenLeadModal('Interesse: 2 Dormitórios com Suíte (a partir de R$ 607.880)')
                }
                className="mt-5 inline-flex items-center text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer text-left"
              >
                Solicitar book do 2 dormitórios →
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                  3 Dormitórios (1 suíte + 2 demi)
                </span>
                <p className="mt-2 text-3xl font-extrabold text-white">a partir de R$ 929.844</p>
                <p className="mt-2 text-xs text-white/60">
                  Plantas amplas a partir de 101m² privativos, vista panorâmica e alto padrão de
                  acabamento.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleOpenLeadModal('Interesse: 3 Dormitórios (a partir de R$ 929.844)')
                }
                className="mt-5 inline-flex items-center text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer text-left"
              >
                Solicitar book do 3 dormitórios →
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-xs text-amber-200 font-medium tracking-wide">
            Valores variam todo mês, atualizados pelo CUB.
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => handleOpenLeadModal('Consulta geral de unidades disponíveis Vistage')}
              size="lg"
              className="h-13 bg-amber-500 px-8 text-base font-bold text-black hover:bg-amber-400"
            >
              Quero consultar unidades disponíveis
            </Button>
            {whatsUrl && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
              >
                <a href={whatsUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 mr-1.5" /> Falar com a Bia
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* FAQ INTERATIVO — CADA PERGUNTA AGE COMO GATILHO PARA CAPTURA PELA BIA */}
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <h2 className="mb-2 text-center text-2xl font-bold sm:text-3xl">Dúvidas Frequentes</h2>
        <p className="mb-8 text-center text-sm text-white/50">
          Toque em qualquer dúvida: a Bia responde pessoalmente no seu WhatsApp
        </p>
        <div className="space-y-3">
          {[
            'Qual a localização exata do Vistage Residence?',
            'Como funciona o financiamento na planta pela Caixa?',
            'O que está incluso na área de lazer do Rooftop?',
            'Quando é a previsão de entrega do empreendimento?',
            'Posso visitar o apartamento modelo decorado?',
          ].map((pergunta, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleOpenLeadModal(`Dúvida FAQ: ${pergunta}`)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-amber-500/40 hover:bg-white/[0.08] cursor-pointer"
            >
              <span className="text-base font-semibold text-white">{pergunta}</span>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-400">
                <HelpCircle className="h-4 w-4" /> Bia responde
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* FORMULÁRIO DE CAPTURA COM NOME, TELEFONE E EMAIL */}
      <section id="interesse" className="mx-auto max-w-md scroll-mt-8 px-5 pb-20">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 sm:p-8">
          <div className="flex justify-center mb-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              Atendimento Exclusivo Bia IA
            </Badge>
          </div>
          <h2 className="text-center text-2xl font-bold">Quero conhecer o Vistage</h2>
          <p className="mb-6 mt-2 text-center text-sm text-white/60">
            Preencha seus dados para a Bia te chamar imediatamente no WhatsApp com o book em PDF,
            valores atualizados e plantas.
          </p>
          <LeadForm launchName={launch.enterprise_name || launch.name} launchSlug={launch.slug} />
        </div>
      </section>

      {/* DIÁLOGO MODAL DO FORMULÁRIO — ACIONADO POR CADA CTA / PERGUNTA DA PÁGINA */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md border-neutral-800 bg-neutral-900 text-white">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[11px]">
                <HelpCircle className="h-3 w-3 mr-1" /> Consulta Vistage Residence
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Falar com a Bia sobre o Vistage
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70">
              {modalContext
                ? `${modalContext} — Preencha para receber a resposta e material no WhatsApp.`
                : 'Preencha para receber plantas, valores de referência e o book em PDF no WhatsApp.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <LeadForm
              launchName={launch.enterprise_name || launch.name}
              launchSlug={launch.slug}
              initialQuestion={modalContext}
              onSuccess={() => {
                setTimeout(() => setModalOpen(false), 2200)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

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
