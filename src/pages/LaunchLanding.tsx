import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { type Launch, getLaunchBySlug } from '@/services/launches'
import pb from '@/lib/pocketbase/client'
import {
  Building2,
  MapPin,
  CheckCircle2,
  Phone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  FileText,
  Download,
  AlertCircle,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function LaunchLanding() {
  const { slug } = useParams<{ slug: string }>()
  const [launch, setLaunch] = useState<Launch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    if (!slug) {
      setError('Slug do lançamento não informado.')
      setLoading(false)
      return
    }

    setLoading(true)
    getLaunchBySlug(slug)
      .then((data) => {
        if (!isMounted) return
        if (!data) {
          setError('Lançamento não encontrado ou ainda não publicado.')
        } else {
          setLaunch(data)
          if (data.images && data.images.length > 0) {
            setSelectedImage(pb.files.getUrl(data, data.images[0]))
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Erro ao buscar lançamento:', err)
        setError('Ocorreu um erro ao carregar este empreendimento.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
          Carregando informações do lançamento...
        </p>
      </div>
    )
  }

  if (error || !launch) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full mb-4">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Empreendimento Indisponível
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6 text-sm">
          {error || 'Não encontramos as informações deste lançamento no momento.'}
        </p>
        <div className="flex gap-3">
          <a
            href="https://wa.me/5548992098050?text=Ol%C3%A1%20Bia!%20Gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20lan%C3%A7amentos%20da%20BRF%20Im%C3%B3veis"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Phone className="h-4 w-4" /> Falar com a Bia no WhatsApp
          </a>
        </div>
      </div>
    )
  }

  const primaryColor = launch.landing_theme?.primaryColor || '#25D366'
  const badgeText = launch.landing_theme?.badgeText || 'Lançamento Exclusivo'
  const waNumber = (launch.cta_whatsapp_number || '5548992098050').replace(/\D/g, '')

  const defaultMsg =
    launch.cta_default_message ||
    `Olá Bia! Gostaria de receber a tabela de valores e as plantas do ${launch.name} (origem: landing page ${launch.slug})`

  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(defaultMsg)}`

  const imagesList = Array.isArray(launch.images)
    ? launch.images.map((img) => pb.files.getUrl(launch, img))
    : []

  const differentialsList = Array.isArray(launch.differentials)
    ? launch.differentials
    : typeof launch.differentials === 'string'
      ? [launch.differentials]
      : []

  const unitsList = Array.isArray(launch.units) ? launch.units : []

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white pb-24 md:pb-16 font-sans">
      {/* Top Header com marca BRF Imóveis */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              BRF
            </div>
            <div>
              <span className="font-bold text-sm leading-tight block">BRF Imóveis</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Florianópolis & Região
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chamar a Bia</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-emerald-500/10 via-slate-50 to-white dark:from-emerald-950/20 dark:via-slate-950 dark:to-slate-900 pt-8 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Texto Hero */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-300/40">
                <Sparkles className="h-3.5 w-3.5" />
                {badgeText}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                {launch.enterprise_name || launch.name}
              </h1>

              {launch.location && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{launch.location}</span>
                </div>
              )}

              {launch.headline && (
                <p className="text-lg sm:text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                  {launch.headline}
                </p>
              )}

              {launch.description && (
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                  {launch.description}
                </p>
              )}

              {/* Botão de Ação Primária */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-base shadow-lg shadow-emerald-600/20 hover:shadow-xl transition-all"
                >
                  <Phone className="h-5 w-5" />
                  <span>Falar com a Bia no WhatsApp</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground px-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Atendimento oficial imediato</span>
                </div>
              </div>
            </div>

            {/* Imagem Principal / Galeria Hero */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 aspect-4/3 flex items-center justify-center group">
                {selectedImage || imagesList.length > 0 ? (
                  <img
                    src={selectedImage || imagesList[0]}
                    alt={launch.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Building2 className="h-16 w-16 mb-2 text-emerald-500 opacity-80" />
                    <span className="font-semibold text-slate-200">{launch.name}</span>
                    <span className="text-xs text-slate-400 mt-1">
                      Imagens e tour disponíveis com a Bia
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-medium flex justify-between items-center">
                  <span className="truncate pr-2">{launch.enterprise_name || launch.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-xs text-[10px]">
                    BRF Imóveis
                  </span>
                </div>
              </div>

              {/* Thumbnails se houver mais de uma foto */}
              {imagesList.length > 1 && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
                  {imagesList.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(imgUrl)}
                      className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === imgUrl
                          ? 'border-emerald-500 scale-105'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Diferenciais */}
      {differentialsList.length > 0 && (
        <section className="py-12 px-4 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Diferenciais do Empreendimento
            </h2>
            <p className="text-sm text-muted-foreground">
              Tudo o que você e sua família precisam para viver com conforto, segurança e
              valorização.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {differentialsList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-500/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 block">
                    {item}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Seção Tabela de Unidades e Valores */}
      {unitsList.length > 0 && (
        <section className="py-12 px-4 bg-slate-100/60 dark:bg-slate-900/60 border-y">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <Badge
                  variant="outline"
                  className="mb-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                >
                  Tabela do Lançamento
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Unidades e Opções Disponíveis
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Valores de tabela e tipologias oficiais com condições especiais de lançamento.
                </p>
              </div>

              <div className="shrink-0">
                <span className="text-xs text-muted-foreground block">
                  *Sujeito a disponibilidade e alteração sem aviso prévio.
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unitsList.map((unit, idx) => (
                <Card
                  key={unit.id || idx}
                  className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 w-full" />
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                        {unit.typology}
                      </h3>
                      {unit.available !== false ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] shrink-0">
                          Disponível
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          Reservada
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      {unit.area && (
                        <span className="flex items-center gap-1 font-medium">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          {unit.area}
                        </span>
                      )}
                      {unit.notes && (
                        <span className="truncate" title={unit.notes}>
                          • {unit.notes}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">A partir de</span>
                        <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          {unit.price || 'Sob Consulta'}
                        </span>
                      </div>

                      <a
                        href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                          `Olá Bia! Quero simular a unidade "${unit.typology}" de ${unit.area} do ${launch.name}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                      >
                        Simular <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Condições de Pagamento e Argumentos */}
      {launch.payment_terms && (
        <section className="py-12 px-4 max-w-4xl mx-auto">
          <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Condições Facilitadas de Pagamento</h3>
                <p className="text-xs text-muted-foreground">
                  Parcelamento direto com a construtora e possibilidade de financiamento bancário
                </p>
              </div>
            </div>

            <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {launch.payment_terms}
            </p>

            <div className="pt-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                Solicitar simulação personalizada com a Bia <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Chamada Final de Conversão */}
      <section className="py-14 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white mt-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Badge className="bg-white/20 text-white hover:bg-white/30 border-none text-xs">
            Atendimento Rápido e Humanizado
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Garanta sua unidade no {launch.enterprise_name || launch.name}
          </h2>
          <p className="text-emerald-100 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Nossa assistente virtual Bia está pronta para te enviar plantas detalhadas, tabela de
            valores completa e agendar uma conversa com nossos especialistas.
          </p>

          <div className="pt-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 font-extrabold text-base shadow-xl transition-all"
            >
              <Phone className="h-5 w-5 text-[#25D366]" />
              <span>Chamar a Bia no WhatsApp Agora</span>
            </a>
          </div>
          <p className="text-xs text-emerald-200">
            Número oficial: +55 48 99209-8050 • BRF Imóveis Florianópolis
          </p>
        </div>
      </section>

      {/* Footer simples */}
      <footer className="py-8 px-4 text-center text-xs text-muted-foreground border-t bg-white dark:bg-slate-900">
        <p className="max-w-md mx-auto">
          © {new Date().getFullYear()} BRF Imóveis. Todos os direitos reservados. As imagens,
          plantas e valores apresentados são meramente ilustrativos e informativos.
        </p>
      </footer>

      {/* Botão flutuante fixo no mobile */}
      <div className="fixed bottom-0 inset-x-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t z-50 md:hidden flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0">
          <span className="font-bold text-xs truncate block">{launch.name}</span>
          <span className="text-[11px] text-emerald-600 font-semibold block">
            Plantas e Valores Disponíveis
          </span>
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366] text-white font-bold text-xs shadow-md shrink-0"
        >
          <Phone className="h-4 w-4" />
          <span>Falar com a Bia</span>
        </a>
      </div>
    </div>
  )
}
