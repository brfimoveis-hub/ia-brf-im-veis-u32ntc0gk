import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  QrCode,
  Globe,
  Instagram,
  Target,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Building2,
  RefreshCw,
} from 'lucide-react'
import { getLaunches, type Launch } from '@/services/launches'
import { useToast } from '@/hooks/use-toast'

interface OriginPreset {
  id: string
  title: string
  badgeText: string
  originCode: string
  description: string
  instruction: string
  icon: React.ElementType
  defaultMessage: string
  category: 'launches' | 'organic' | 'custom'
}

export function LeadOriginLinksManager() {
  const { toast } = useToast()
  const [launches, setLaunches] = useState<Launch[]>([])
  const [loadingLaunches, setLoadingLaunches] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Gerador personalizado
  const [customOriginName, setCustomOriginName] = useState('')
  const [customMessage, setCustomMessage] = useState('Olá Bia! Gostaria de falar com um corretor.')

  const whatsappPhone = '5548992098050'
  const appBaseUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://brfiacrminteligente.goskip.app'

  useEffect(() => {
    let isMounted = true
    getLaunches()
      .then((data) => {
        if (isMounted) setLaunches(data || [])
      })
      .catch((err) => {
        console.error('Erro ao carregar lançamentos para links:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingLaunches(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const copyToClipboard = async (text: string, id: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast({
        title: 'Copiado para a área de transferência!',
        description: label,
      })
      setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current))
      }, 2500)
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Copie manualmente o link selecionando o texto.',
        variant: 'destructive',
      })
    }
  }

  // Gera URL do WhatsApp com texto codificado e origem
  const buildWaUrl = (message: string, origin: string) => {
    const trimmedMsg = message.trim()
    const trimmedOrigin = origin.trim()
    const finalMsg = trimmedOrigin ? `${trimmedMsg} (origem=${trimmedOrigin})` : trimmedMsg
    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(finalMsg)}`
  }

  // Presets fixos
  const standardPresets: OriginPreset[] = useMemo(
    () => [
      {
        id: 'instagram-bio',
        title: 'Instagram Bio',
        badgeText: '📱 Instagram Orgânico',
        originCode: 'instagram-bio',
        description: 'Link direto para o perfil @mauro.brfimoveis ou botão de contato da bio.',
        instruction:
          'Cole no campo "Site" ou no botão de ação da biografia do Instagram da imobiliária.',
        icon: Instagram,
        defaultMessage: 'Olá Bia! Vi o Instagram da BRF Imóveis e gostaria de conhecer as opções.',
        category: 'organic',
      },
      {
        id: 'placa-imovel',
        title: 'Placa Física / QR Code',
        badgeText: '🏷️ Placa / QR Code',
        originCode: 'placa-fachada',
        description: 'Placas de "Vende-se" na frente de imóveis, banners, totens ou feirões.',
        instruction:
          'Gere um QR Code apontando para este link e estampe na placa física do imóvel ou vitrine.',
        icon: QrCode,
        defaultMessage: 'Olá Bia! Estou em frente a um imóvel com placa da BRF e quero detalhes.',
        category: 'organic',
      },
      {
        id: 'meta-click-to-wa',
        title: 'Campanha Meta Ads (C2WA)',
        badgeText: '📢 Anúncio Meta',
        originCode: 'meta-ads',
        description: 'Caso você crie campanhas de WhatsApp no Gerenciador da Meta fora do CRM.',
        instruction: 'Use no campo "Mensagem pré-preenchida" do anúncio Click-to-WhatsApp.',
        icon: Target,
        defaultMessage: 'Olá Bia! Vi o anúncio da BRF Imóveis e quero receber atendimento.',
        category: 'organic',
      },
    ],
    [],
  )

  // Link personalizado sanitizado
  const customOriginSlug = customOriginName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')

  const generatedCustomUrl = buildWaUrl(
    customMessage || 'Olá Bia!',
    customOriginSlug || 'link-rastreado',
  )

  return (
    <div className="space-y-6">
      {/* Header da Seção */}
      <div className="rounded-xl border bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Links de Origem & WhatsApp Rastreado
              </h2>
              <Badge
                variant="outline"
                className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-200"
              >
                1 Clique
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Gere links de WhatsApp com marcador{' '}
              <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground">
                (origem=...)
              </code>{' '}
              que o webhook da BRF Imóveis identifica automaticamente como selo no CRM e repassa
              para a Bia citar na conversa.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-lg border bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 shadow-2xs">
              <span className="text-muted-foreground block text-[10px]">
                WhatsApp Oficial da Bia:
              </span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                +55 48 9209-8050
              </strong>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="launches" className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="launches" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            Lançamentos ({launches.length})
          </TabsTrigger>
          <TabsTrigger value="presets" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" />
            Canais Prontos
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Gerador Livre
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: LANÇAMENTOS E GOOGLE ADS */}
        <TabsContent value="launches" className="space-y-4 pt-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Lançamentos Imobiliários & Google Ads
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Para anúncios no Google Ads (Search / Performance Max), aponte para a{' '}
                    <strong>Landing Page</strong> do lançamento ou use o{' '}
                    <strong>WhatsApp Rastreado</strong> correspondente.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs w-fit bg-blue-50 text-blue-700 border-blue-200"
                >
                  Google Ads Recomendado: Landing Page
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingLaunches ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  Carregando lançamentos cadastrados...
                </div>
              ) : launches.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Nenhum lançamento encontrado. Cadastre um novo lançamento na aba "Lançamentos"
                    para gerar automaticamente os links.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {launches.map((launch) => {
                    const landingUrl = `${appBaseUrl}/l/${launch.slug}`
                    const gadsOrigin = `google-ads-${launch.slug}`
                    const gadsWaUrl = buildWaUrl(
                      `Olá Bia! Gostaria de informações sobre o lançamento ${launch.name}`,
                      gadsOrigin,
                    )
                    const directLpWaUrl = buildWaUrl(
                      `Olá Bia! Vim pela página do ${launch.name}`,
                      `lp-${launch.slug}`,
                    )

                    return (
                      <div
                        key={launch.id}
                        className="rounded-xl border bg-card p-4 space-y-3 hover:border-indigo-300 transition-colors shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-foreground">
                                {launch.name}
                              </h4>
                              <Badge
                                variant={launch.status === 'publicado' ? 'default' : 'secondary'}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {launch.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              Slug: /l/{launch.slug}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                              <a href={landingUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3 w-3" />
                                Abrir Landing Page
                              </a>
                            </Button>
                          </div>
                        </div>

                        {/* Duas opções para cada lançamento */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                          {/* Opção 1: Landing Page (Melhor para Google Ads) */}
                          <div className="rounded-lg border bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-blue-600" />
                                1. URL da Landing Page (Google Ads)
                              </span>
                              <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0">
                                Recomendado para Anúncio
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              <strong>Onde usar:</strong> URL Final no anúncio do Google Ads.
                              Captura o lead na página e direciona para a Bia.
                            </p>
                            <div className="flex items-center gap-2 bg-background border rounded-md p-1.5">
                              <code className="text-[11px] text-foreground font-mono truncate flex-1 select-all">
                                {landingUrl}
                              </code>
                              <Button
                                size="sm"
                                variant={copiedId === `lp-${launch.id}` ? 'default' : 'secondary'}
                                className="h-7 px-2.5 text-xs gap-1 shrink-0"
                                onClick={() =>
                                  copyToClipboard(
                                    landingUrl,
                                    `lp-${launch.id}`,
                                    `Landing Page de ${launch.name}`,
                                  )
                                }
                              >
                                {copiedId === `lp-${launch.id}` ? (
                                  <>
                                    <Check className="h-3 w-3" /> Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" /> Copiar
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Opção 2: WhatsApp Rastreado Google Ads */}
                          <div className="rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                2. WhatsApp Rastreado (Google Ads)
                              </span>
                              <Badge
                                variant="outline"
                                className="border-emerald-300 text-emerald-800 text-[9px] px-1.5 py-0"
                              >
                                Direto p/ Bia
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              <strong>Onde usar:</strong> Extensão de mensagem/chamada do Google Ads
                              ou link curto de campanha.
                            </p>
                            <div className="flex items-center gap-2 bg-background border rounded-md p-1.5">
                              <code className="text-[11px] text-foreground font-mono truncate flex-1 select-all">
                                {gadsWaUrl}
                              </code>
                              <Button
                                size="sm"
                                variant={
                                  copiedId === `wa-gads-${launch.id}` ? 'default' : 'secondary'
                                }
                                className="h-7 px-2.5 text-xs gap-1 shrink-0"
                                onClick={() =>
                                  copyToClipboard(
                                    gadsWaUrl,
                                    `wa-gads-${launch.id}`,
                                    `Link WhatsApp Google Ads (${launch.name})`,
                                  )
                                }
                              >
                                {copiedId === `wa-gads-${launch.id}` ? (
                                  <>
                                    <Check className="h-3 w-3" /> Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" /> Copiar
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: PRESETS FIXOS (INSTAGRAM BIO, PLACA, ETC.) */}
        <TabsContent value="presets" className="space-y-4 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standardPresets.map((preset) => {
              const waUrl = buildWaUrl(preset.defaultMessage, preset.originCode)
              const Icon = preset.icon
              const isCopied = copiedId === preset.id

              return (
                <Card
                  key={preset.id}
                  className="flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {preset.badgeText}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {preset.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {preset.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="rounded-md bg-muted/50 p-2.5 text-[11px] space-y-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                        Onde usar:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">{preset.instruction}</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-mono text-muted-foreground uppercase">
                        Mensagem pré-preenchida
                      </Label>
                      <div className="text-xs bg-background border rounded p-2 italic text-slate-600 dark:text-slate-300">
                        "{preset.defaultMessage} (origem={preset.originCode})"
                      </div>
                    </div>

                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant={isCopied ? 'default' : 'outline'}
                        className="w-full text-xs gap-1.5"
                        onClick={() => copyToClipboard(waUrl, preset.id, preset.title)}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Link Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar Link de WhatsApp
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ABA 3: GERADOR LIVRE DE ORIGEM */}
        <TabsContent value="custom" className="space-y-4 pt-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Criador Personalizado de Link Rastreado
              </CardTitle>
              <CardDescription className="text-xs">
                Digite um nome para a origem (ex: panfleto-centro, corretor-joao, radio-jovem-pan) e
                gere o link pronto para compartilhar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Identificador da Origem *</Label>
                  <Input
                    placeholder="Ex: google-ads-villa, panfleto-feirao, portal-zap"
                    value={customOriginName}
                    onChange={(e) => setCustomOriginName(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Código sanitizado gerado:{' '}
                    <code className="text-indigo-600 font-mono font-semibold">
                      {customOriginSlug || 'exemplo-origem'}
                    </code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Mensagem Inicial do Cliente</Label>
                  <Input
                    placeholder="Ex: Olá Bia! Gostaria de mais detalhes."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Texto que já aparece digitado para o usuário ao abrir o WhatsApp.
                  </p>
                </div>
              </div>

              {/* Pré-visualização do Link */}
              <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-indigo-600" />
                    Link Final Gerado:
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    Pronto para Uso
                  </Badge>
                </div>

                <div className="bg-background border rounded-md p-2.5 font-mono text-xs break-all select-all text-slate-800 dark:text-slate-200">
                  {generatedCustomUrl}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button
                    size="sm"
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                    onClick={() =>
                      copyToClipboard(
                        generatedCustomUrl,
                        'custom-generated',
                        `Link personalizado: ${customOriginSlug || 'link-rastreado'}`,
                      )
                    }
                  >
                    {copiedId === 'custom-generated' ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Link Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copiar Link
                      </>
                    )}
                  </Button>

                  <Button variant="outline" size="sm" className="text-xs gap-1.5" asChild>
                    <a href={generatedCustomUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Testar no WhatsApp Web
                    </a>
                  </Button>
                </div>
              </div>

              {/* Dica de como a IA reage */}
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
                <HelpCircle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>O que acontece quando o lead clica?</strong>
                  <p className="text-[11px] leading-relaxed text-indigo-900/80 dark:text-indigo-300">
                    O webhook do WhatsApp remove o trecho{' '}
                    <code className="font-mono">(origem=...)</code> do texto visível na conversa,
                    grava <code className="font-mono">last_origin</code> no cadastro do cliente e a
                    Bia responde imediatamente sabendo exatamente por onde o cliente chegou.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
