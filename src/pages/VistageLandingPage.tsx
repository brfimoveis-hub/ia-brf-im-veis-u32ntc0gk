import React, { useState } from 'react'
import { Link } from 'react-router-dom'
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
  ExternalLink,
  ChevronRight,
  FolderOpen,
  Camera,
  Video,
  Eye,
  SlidersHorizontal,
  Home,
  Waves,
  Dumbbell,
  Utensils,
  ShoppingBag,
  PawPrint,
  Lock,
  Unlock,
  MessageCircle,
  Clock,
  Sparkle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DRIVE_FOLDERS_DATA,
  VISTAGE_PROJECT_DETAILS,
  type DriveFolderInfo,
} from '@/data/vistage-drive-content'

export default function VistageLandingPage() {
  const [selectedFolder, setSelectedFolder] = useState<DriveFolderInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'accessible' | 'pending'>('all')
  const [activeGalleryArea, setActiveGalleryArea] = useState<number>(3) // Cobertura default

  const wabaUrl = `https://wa.me/${VISTAGE_PROJECT_DETAILS.wabaNumberRaw}?text=${encodeURIComponent(
    'Olá Bia! Estive na landing page do Vistage Residence e gostaria de mais detalhes sobre o empreendimento.',
  )}`

  const makeUnitWhatsappUrl = (unitName: string, price: string) => {
    return `https://wa.me/${VISTAGE_PROJECT_DETAILS.wabaNumberRaw}?text=${encodeURIComponent(
      `Olá Bia! Gostaria de receber a planta e a tabela detalhada da tipologia "${unitName}" (${price}) do Vistage Residence (Barreiros).`,
    )}`
  }

  const makeFolderWhatsappUrl = (folderTitle: string) => {
    return `https://wa.me/${VISTAGE_PROJECT_DETAILS.wabaNumberRaw}?text=${encodeURIComponent(
      `Olá Bia! Gostaria de receber as fotos em alta resolução da pasta "${folderTitle}" do Vistage Residence.`,
    )}`
  }

  const filteredFolders = DRIVE_FOLDERS_DATA.filter((f) => {
    if (activeTab === 'accessible') return f.status === 'accessible'
    if (activeTab === 'pending') return f.status === 'private_or_restricted'
    return true
  })

  const currentGalleryFolder =
    DRIVE_FOLDERS_DATA.find((f) => f.id === activeGalleryArea) || DRIVE_FOLDERS_DATA[1]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white font-sans antialiased">
      {/* Top Banner de Identificação Institucional e Conexão com o CRM */}
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">BRF Imóveis Florianópolis</span>
            <span className="text-slate-400 hidden md:inline">|</span>
            <span className="text-slate-400 hidden md:inline">
              Site oficial:{' '}
              <a
                href="https://www.brfimoveis.com.br"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white"
              >
                brfimoveis.com.br
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              Atendimento IA: Bia (+55 48 99209-8050)
            </span>
            <Link
              to="/dashboard"
              className="text-slate-300 hover:text-white underline underline-offset-2 flex items-center gap-1"
            >
              <span>Acessar CRM</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Header Fixo Principal */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-base shadow-sm ring-2 ring-emerald-500/20">
              BRF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block">
                  BRF Imóveis
                </span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] px-1.5 py-0 font-medium"
                >
                  Lançamento Oficial
                </Badge>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-normal">
                Florianópolis, São José e Litoral Catarinense
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#sobre" className="hover:text-emerald-600 transition-colors">
              O Empreendimento
            </a>
            <a href="#diferenciais" className="hover:text-emerald-600 transition-colors">
              Diferenciais
            </a>
            <a href="#plantas" className="hover:text-emerald-600 transition-colors">
              Tipologias & Plantas
            </a>
            <a href="#galeria" className="hover:text-emerald-600 transition-colors">
              Pastas & Galeria
            </a>
            <a href="#materiais" className="hover:text-emerald-600 transition-colors">
              Acervo Drive (11 pastas)
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href={wabaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Chamar a Bia</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-12 pb-20 px-4 sm:px-6">
        {/* Glow de fundo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Coluna Texto */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-xs">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>Lançamento Exclusivo em Barreiros — São José / SC</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
                  {VISTAGE_PROJECT_DETAILS.name}
                </h1>
                <p className="text-xl sm:text-2xl text-emerald-400 font-semibold tracking-wide">
                  {VISTAGE_PROJECT_DETAILS.tagline}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span>
                    {VISTAGE_PROJECT_DETAILS.neighborhood}, {VISTAGE_PROJECT_DETAILS.city}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-emerald-400" />
                  <span>Construtora: {VISTAGE_PROJECT_DETAILS.developer}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <span>{VISTAGE_PROJECT_DETAILS.totalUnits} Unidades Exclusivas</span>
                </div>
              </div>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                O empreendimento que redefine o conceito de morar bem na Grande Florianópolis.
                Apartamentos de 2 e 3 dormitórios com suíte, gardens com spa e coberturas lineares
                com rooftop completo: piscina de borda infinita, academia panorâmica, marketplace
                24h e vista definitiva para o mar.
              </p>

              {/* Box de Preço e CTA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">
                    Condição Especial de Lançamento
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-slate-400">A partir de</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-white">
                      {VISTAGE_PROJECT_DETAILS.priceFrom}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400">
                    Entrada facilitada + saldo em até 40x direto ou financiamento bancário
                  </span>
                </div>

                <a
                  href={wabaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-xl shadow-emerald-500/25 hover:shadow-2xl transition-all"
                >
                  <Phone className="h-5 w-5" />
                  <span>Falar com a Bia no WhatsApp</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="flex items-center gap-6 pt-1 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Atendimento oficial BRF Imóveis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <span>Tabela zero de lançamento</span>
                </div>
              </div>
            </div>

            {/* Coluna Imagem de Destaque / Rooftop Preview */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-800">
                <div className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden group">
                  <img
                    src="https://img.usecurling.com/p/800/600?q=rooftop+infinity+pool+sunset&color=emerald"
                    alt="Rooftop Vistage Residence - Piscina com Vista Mar"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-emerald-600 text-white font-semibold text-xs shadow-md">
                      Rooftop com Vista Panorâmica
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="font-bold text-base leading-tight">Área Comum na Cobertura</p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Piscina com borda infinita, deck molhado e salão gourmet no topo
                    </p>
                  </div>
                </div>

                {/* Sub-faixa de estatísticas da pasta do Drive */}
                <div className="p-4 bg-slate-900/90 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block text-lg font-bold text-emerald-400">11</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Pastas Organizadas
                    </span>
                  </div>
                  <div className="border-x border-slate-800">
                    <span className="block text-lg font-bold text-emerald-400">80+</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Fotos e Renders
                    </span>
                  </div>
                  <div>
                    <span className="block text-lg font-bold text-emerald-400">14</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Vídeos por Andar
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 1: O Empreendimento & Localização */}
      <section id="sobre" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <Badge
            variant="outline"
            className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300"
          >
            Localização Estratégica
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Por que viver em Barreiros, São José?
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Barreiros é hoje um dos bairros com maior índice de valorização imobiliária da Grande
            Florianópolis. Próximo à Beira-Mar Continental, Faculdade Estácio, Shopping Itaguaçu e a
            poucos minutos do Centro de Florianópolis.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Mobilidade & Conexão</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Acesso imediato à BR-101, Via Expressa e pontes de Florianópolis. Praticidade para
                trabalhar na Ilha ou no Continente sem perder tempo no trânsito.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Infraestrutura Completa</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Supermercados, colégios renomados, farmácias, polo gastronômico e serviços
                essenciais a passos da sua futura residência.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <Sparkle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Alto Potencial de Valorização</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Compre no primeiro estágio de lançamento pelo melhor preço por metro quadrado da
                região e acompanhe o crescimento patrimonial até a entrega.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Seção 2: Diferenciais do Empreendimento (Baseados nas Pastas do Drive) */}
      <section
        id="diferenciais"
        className="py-16 sm:py-20 px-4 sm:px-6 bg-slate-100/70 dark:bg-slate-900/60 border-y"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge
              variant="outline"
              className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300"
            >
              Estrutura Incomparável
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Diferenciais pensados para a sua rotina
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Cada espaço do Vistage Residence foi planejado para integrar lazer, bem-estar,
              trabalho e praticidade em um só lugar.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VISTAGE_PROJECT_DETAILS.differentials.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all hover:border-emerald-500/50"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4">
                  {item.icon === 'Waves' && <Waves className="h-6 w-6" />}
                  {item.icon === 'Dumbbell' && <Dumbbell className="h-6 w-6" />}
                  {item.icon === 'Utensils' && <Utensils className="h-6 w-6" />}
                  {item.icon === 'ShoppingBag' && <ShoppingBag className="h-6 w-6" />}
                  {item.icon === 'PawPrint' && <PawPrint className="h-6 w-6" />}
                  {item.icon === 'ShieldCheck' && <ShieldCheck className="h-6 w-6" />}
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 3: Tipologias e Plantas (Pasta 7 - PB Humanizada) */}
      <section id="plantas" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300"
            >
              Plantas Inteligentes
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Opções de Plantas e Tipologias
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
              Projetos otimizados com ventilação cruzada, sacada com churrasqueira a carvão e
              acabamento superior. Escolha a configuração perfeita para o seu momento de vida.
            </p>
          </div>

          <a
            href={wabaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors shrink-0"
          >
            <span>Solicitar Caderno de Plantas com a Bia</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {VISTAGE_PROJECT_DETAILS.typologies.map((typ) => (
            <Card
              key={typ.id}
              className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative group"
            >
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 w-full" />
              <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {typ.badge}
                    </Badge>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {typ.area}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight mb-2">
                    {typ.name}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {typ.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Destaques da Unidade:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {typ.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Investimento:</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      {typ.startingPrice}
                    </span>
                  </div>

                  <a
                    href={makeUnitWhatsappUrl(typ.name, typ.startingPrice)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors"
                  >
                    <span>Simular com a Bia</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Seção 4: Galeria Interativa por Ambientes (Material do Drive) */}
      <section id="galeria" className="py-16 sm:py-20 px-4 sm:px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge className="bg-emerald-600 text-white border-0 text-xs">
              Perspectivas & Renders Oficiais
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Conheça os Ambientes do Vistage
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Explore as áreas comuns e detalhes dos apartamentos organizados diretamente a partir
              dos arquivos do Google Drive da construtora.
            </p>
          </div>

          {/* Navegação de Ambientes */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {DRIVE_FOLDERS_DATA.filter((f) => f.status === 'accessible' && f.fileCount > 0).map(
              (folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveGalleryArea(folder.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeGalleryArea === folder.id
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {folder.id === 10 ? (
                    <Video className="h-3.5 w-3.5" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  <span>{folder.title}</span>
                  <span className="text-[10px] opacity-70">({folder.fileCount})</span>
                </button>
              ),
            )}
          </div>

          {/* Card Detalhado do Ambiente Selecionado */}
          <div className="bg-slate-800/90 rounded-3xl border border-slate-700 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold block">
                  {currentGalleryFolder.category}
                </span>
                <h3 className="text-2xl font-bold text-white mt-1">{currentGalleryFolder.title}</h3>
                <p className="text-sm text-slate-300 mt-1">{currentGalleryFolder.notes}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={currentGalleryFolder.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                  <span>Abrir Pasta no Drive</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <a
                  href={makeFolderWhatsappUrl(currentGalleryFolder.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Pedir Fotos em Alta</span>
                </a>
              </div>
            </div>

            {/* Imagens / Renders do Ambiente Selecionado */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentGalleryFolder.sampleImageKeywords?.map((keyword, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 relative aspect-4/3 group"
                >
                  <img
                    src={`https://img.usecurling.com/p/600/450?q=${encodeURIComponent(keyword)}&color=emerald`}
                    alt={`${currentGalleryFolder.title} - Visualização ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                  <div className="absolute bottom-3 left-3 right-3 text-white text-xs">
                    <span className="font-semibold block truncate">
                      {currentGalleryFolder.files[i]?.name ||
                        `${currentGalleryFolder.title} Perspectiva ${i + 1}`}
                    </span>
                    <span className="text-[10px] text-slate-300">
                      Material oficial AJ Coelho / BRF Imóveis
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Lista dos arquivos originais da pasta */}
            <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/60">
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Arquivos originais catalogados nesta pasta ({currentGalleryFolder.files.length}{' '}
                itens):
              </span>
              <div className="flex flex-wrap gap-2">
                {currentGalleryFolder.files.slice(0, 8).map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-mono"
                  >
                    <FileText className="h-3 w-3 text-emerald-400" />
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    {f.size && <span className="text-slate-500">({f.size})</span>}
                  </span>
                ))}
                {currentGalleryFolder.files.length > 8 && (
                  <span className="text-xs text-slate-400 self-center">
                    + {currentGalleryFolder.files.length - 8} arquivos adicionais no Drive
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 5: Acervo e Auditoria das 11 Pastas do Google Drive */}
      <section id="materiais" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge
            variant="outline"
            className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300"
          >
            Auditoria & Transparência do Conteúdo
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            As 11 Pastas Organizadas pelo Mauro
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Relatório de leitura dos links de Google Drive fornecidos. 10 pastas foram lidas e
            incorporadas à landing page; 1 pasta possui permissão restrita e tem seu espaço
            reservado para inserção de material de branding.
          </p>
        </div>

        {/* Filtro de Pastas */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('all')}
            className={activeTab === 'all' ? 'bg-emerald-600 text-white' : ''}
          >
            Todas as Pastas (11)
          </Button>
          <Button
            variant={activeTab === 'accessible' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('accessible')}
            className={activeTab === 'accessible' ? 'bg-emerald-600 text-white' : ''}
          >
            <Unlock className="h-3.5 w-3.5 mr-1 text-emerald-500" />
            Integradas & Lidas (10)
          </Button>
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('pending')}
            className={activeTab === 'pending' ? 'bg-amber-600 text-white' : ''}
          >
            <Lock className="h-3.5 w-3.5 mr-1 text-amber-500" />
            Acesso Restrito / Pendente (1)
          </Button>
        </div>

        {/* Grade de Pastas */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFolders.map((folder) => {
            const isRestricted = folder.status === 'private_or_restricted'
            return (
              <Card
                key={folder.id}
                className={`border transition-all ${
                  isRestricted
                    ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 hover:shadow-sm'
                }`}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          isRestricted
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Pasta #{folder.id} • {folder.category}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {folder.title}
                        </h4>
                      </div>
                    </div>

                    {isRestricted ? (
                      <Badge className="bg-amber-600 text-white text-[10px]">Restrita</Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        {folder.fileCount} {folder.fileCount === 1 ? 'item' : 'itens'}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{folder.notes}</p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <a
                      href={folder.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      <span>Abrir no Drive</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setSelectedFolder(folder)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Seção 6: Atendimento Oficial com a Bia por WhatsApp */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white">
        <div className="max-w-5xl mx-auto rounded-3xl p-8 sm:p-12 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                <span>Atendente Virtual Oficial da BRF Imóveis</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Fale agora com a Bia e receba a tabela completa do Vistage
              </h2>

              <p className="text-emerald-100 text-sm sm:text-base leading-relaxed max-w-xl">
                A Bia tira todas as suas dúvidas em segundos, envia plantas humanizadas em alta
                resolução, calcula o fluxo de pagamento personalizado e agenda visitas ao local da
                obra.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <a
                  href={wabaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-emerald-800 font-bold text-sm shadow-xl transition-all"
                >
                  <Phone className="h-5 w-5 text-[#25D366]" />
                  <span>Iniciar conversa no WhatsApp</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <div className="flex items-center gap-2 text-xs text-emerald-200 px-2">
                  <Clock className="h-4 w-4" />
                  <span>Atendimento 24h • Retorno imediato</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-black/20 border border-white/10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-300 p-1 mb-3 shadow-lg">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-2xl text-emerald-400">
                  Bia
                </div>
              </div>
              <h4 className="font-bold text-base text-white">Bia — IA BRF Imóveis</h4>
              <p className="text-xs text-emerald-200 mt-0.5">Especialista de Vendas Vistage</p>
              <span className="mt-3 text-xs font-mono font-bold px-3 py-1 rounded-full bg-white/20 text-white">
                +55 48 99209-8050
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer da Landing Page */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xs">
                  BRF
                </div>
                <span className="font-bold text-base text-white">BRF Imóveis</span>
              </div>
              <p className="text-slate-400 max-w-md">
                Imobiliária com foco em imóveis de alto padrão e lançamentos selecionados em
                Florianópolis, São José e Balneário Camboriú.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div>
                <span className="block text-slate-300 font-semibold mb-1">Contato Oficial:</span>
                <span className="font-mono text-emerald-400 font-bold block">
                  +55 48 99209-8050
                </span>
                <span className="text-slate-500">brfimoveis@gmail.com</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <a
                  href="https://www.brfimoveis.com.br"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  brfimoveis.com.br
                </a>
                <Link to="/privacidade" className="hover:text-white transition-colors">
                  Política de Privacidade
                </Link>
                <Link to="/login" className="hover:text-white transition-colors">
                  Área Restrita (CRM)
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <p>
              © {new Date().getFullYear()} BRF Imóveis. Vistage Residence é um empreendimento da
              construtora AJ Coelho. Material preliminar sujeito a alterações.
            </p>
            <p className="flex items-center gap-2">
              <span>Desenvolvido com IA BRF</span>
              <span>•</span>
              <Link to="/dashboard" className="text-emerald-400 hover:underline">
                Painel do Corretor
              </Link>
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de Detalhes da Pasta */}
      <Dialog open={!!selectedFolder} onOpenChange={(open) => !open && setSelectedFolder(null)}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="h-5 w-5 text-emerald-600" />
              <span>
                Pasta #{selectedFolder?.id}: {selectedFolder?.title}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Categoria: {selectedFolder?.category}
            </DialogDescription>
          </DialogHeader>

          {selectedFolder && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <p className="font-medium">{selectedFolder.notes}</p>
              </div>

              <div>
                <span className="font-semibold block mb-2 text-slate-800 dark:text-slate-200">
                  Arquivos Identificados ({selectedFolder.files.length}):
                </span>
                {selectedFolder.files.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {selectedFolder.files.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 font-mono text-[11px]"
                      >
                        <span className="truncate max-w-[280px]">{f.name}</span>
                        {f.size && <span className="text-slate-500 shrink-0">{f.size}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-amber-600 dark:text-amber-400 italic">
                    Nenhum arquivo pôde ser lido automaticamente devido à permissão restrita no
                    Google Drive.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <a
                  href={selectedFolder.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir no Drive
                </a>

                <a
                  href={makeFolderWhatsappUrl(selectedFolder.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Solicitar com a Bia
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
