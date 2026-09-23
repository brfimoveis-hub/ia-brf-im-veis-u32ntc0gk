import React, { useState } from 'react'
import {
  Printer,
  FileText,
  AlertTriangle,
  Clock,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldAlert,
  User,
  Building,
  Hash,
  Calendar,
  AlertCircle,
  Download,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ATTACHMENT_BASE_URL =
  'https://dagtlwojkqyivnjgveda.supabase.co/storage/v1/object/public/message-attachments/a4df5bdc-f53f-4f95-b504-409dabc64445/'

interface PrintItem {
  filename: string
  title: string
  time: string
  description: string
}

const GALLERY_PRINTS: PrintItem[] = [
  {
    filename: 'whatsapp-image-2026-09-23-at-14.59.26-26ca8.jpeg',
    title: 'Abertura do Chamado Oficial',
    time: '14h59 — 23/09/2026',
    description:
      'Central de Ajuda Empresarial Meta, abertura formal de chat com a IA do suporte técnico solicitando análise de limite de negócios e restrição preventiva.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-15.11.17-ec34e.jpeg',
    title: 'Tentativa de Vinculação no App Instagram',
    time: '15h11 — 23/09/2026',
    description:
      'App do Instagram na seção "Informações do perfil" exibindo a pendência "Facebook: BRF Imóveis — CONFIRMAR", conforme rota orientada pelo suporte.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-15.13.08-9db09.jpeg',
    title: 'Erro Genérico no Clique de Confirmação',
    time: '15h13 — 23/09/2026',
    description:
      'App do Instagram apresentando a mensagem de bloqueio "Ocorreu um erro. Tente novamente mais tarde" ao clicar no botão final CONFIRMAR.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-16.51.55-d1090.jpeg',
    title: 'Página Secundária/Duplicada Identificada',
    time: '16h51 — 23/09/2026',
    description:
      'Página duplicada "BRF Imóveis" (1 seguidor) identificada na varredura de ativos para isolamento da Página oficial (ID 1219427617930954).',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-16.54.43-31be0.jpeg',
    title: 'Confirmação de Identidade do Titular',
    time: '16h54 — 23/09/2026',
    description:
      'Perfil pessoal de Mauro Fengler (ID 100003236744987), comprovando a titularidade e o acesso principal do administrador.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-16.56.09-e7f9b.jpeg',
    title: 'Menu de Configurações do Perfil',
    time: '16h56 — 23/09/2026',
    description: 'Navegação pelas opções de configuração interna e atalhos do aplicativo Facebook.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-17.00.20-9e02a.jpeg',
    title: 'Aviso de Perfil Principal Exigido',
    time: '17h00 — 23/09/2026',
    description:
      'Aviso da plataforma: "Troque para seu perfil principal para alterar essas configurações", comprovando a dependência direta da conta de Mauro Fengler.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-17.00.42-5d431.jpeg',
    title: 'Navegação de Configurações — Parte 1',
    time: '17h00 — 23/09/2026',
    description:
      'Sequência de checagem dos itens de segurança e privacidade em busca do status da conta.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-17.02.13-95c2b.jpeg',
    title: 'Navegação de Configurações — Parte 2',
    time: '17h02 — 23/09/2026',
    description: 'Continuação das telas de suporte e configurações avançadas no aplicativo mobile.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-17.35.11-bec5a.jpeg',
    title: 'Central de Contas — Múltiplos Perfis Vinculados',
    time: '17h35 — 23/09/2026',
    description:
      'Visão geral da Central de Contas Meta evidenciando 8 perfis e ativos integrados ao ecossistema comercial.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-17.37.01-c2a97.jpeg',
    title: 'Central de Contas Aberta',
    time: '17h37 — 23/09/2026',
    description:
      'Detalhamento das contas conectadas e verificação de parâmetros de compartilhamento entre perfis.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-17.38.39-bee75.jpeg',
    title: 'Busca Interna por "Status da Conta"',
    time: '17h38 — 23/09/2026',
    description:
      'Caixa "Pesquisar configurações" acionada no aplicativo mobile para localizar o menu de autoatendimento indicado pela Meta.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-17.40.47-e5f0c.jpeg',
    title: 'Inexistência do Recurso Indicado',
    time: '17h40 — 23/09/2026',
    description:
      'Resultado da busca no app: o item "Status da conta" indicado pelo suporte NÃO EXISTE (retorna unicamente "Status online").',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-17.46.07-d90a7.jpeg',
    title: 'App do Facebook em Modo Principal',
    time: '17h46 — 23/09/2026',
    description:
      'Registro do aplicativo do Facebook antes de iniciar os testes através de navegadores web (Chrome mobile/desktop).',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-18.10.16-20bf5.jpeg',
    title: 'Lista de Contas Salvas no Dispositivo',
    time: '18h10 — 23/09/2026',
    description:
      'Comprovação de sessão ativa e autenticada no perfil pessoal principal de Mauro Fengler.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-18.16.02-0055d.jpeg',
    title: 'Navegação Direta via URL no Chrome Celular',
    time: '18h16 — 23/09/2026',
    description:
      'Tentativa de acesso direto ao endereço oficial indicado facebook.com/account/status no navegador Google Chrome.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-18.19.24-0fc67.jpeg',
    title: 'Link Quebrado Indicado pelo Suporte',
    time: '18h19 — 23/09/2026',
    description:
      'Mensagem oficial de falha da Meta: "The link you followed may be broken, or the page may have been removed" em facebook.com/account/status.',
  },
  {
    filename: 'whatsapp-image-2026-09-23-at-18.40.19-b2276.jpeg',
    title: 'Bloqueio de Conteúdo ao Próprio Titular (Desktop)',
    time: '18h40 — 23/09/2026',
    description:
      'Acesso no PC ao endereço correto facebook.com/accountstatus: página carrega mas exibe "Este conteúdo não está disponível no momento" ao titular autenticado.',
  },
]

export default function DossieJuridico() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="dossie-print-wrapper min-h-screen bg-slate-100 text-slate-900 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Botão de Ação Flutuante (Oculto na Impressão) */}
      <div className="print-hide fixed bottom-6 right-6 z-50 flex items-center gap-3 shadow-2xl bg-white/95 backdrop-blur border border-slate-300 p-2.5 rounded-xl">
        <Button
          onClick={handlePrint}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-md"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Imprimir / Salvar PDF</span>
        </Button>
      </div>

      {/* Container Principal do Documento (Visual de Papel A4 com Borda Formal) */}
      <div className="dossie-document max-w-5xl mx-auto bg-white border border-slate-200 p-8 sm:p-12 shadow-sm rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
        {/* 1) CABEÇALHO FORMAL DO CASO */}
        <header className="border-b-2 border-slate-900 pb-6 mb-8 print:break-inside-avoid">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  Documento Probatório / Instrução Processual
                </span>
                <Badge
                  variant="outline"
                  className="text-red-700 border-red-300 bg-red-50 text-[11px] font-semibold"
                >
                  Restrição Ativa Meta
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-950 tracking-tight">
                Dossiê Jurídico — Restrição de Conta Meta/Facebook
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Relatório circunstanciado de fatos técnicos, transcrição de suporte oficial, recusa
                de escalada e esgotamento de vias administrativas.
              </p>
            </div>
            <div className="text-left sm:text-right border-l-2 sm:border-l-0 sm:border-r-0 border-slate-300 pl-3 sm:pl-0">
              <div className="text-xs font-semibold text-slate-500 uppercase">
                Protocolo / Caso Oficial
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-slate-900">
                #1589293502887786
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Data de Emissão: <strong className="text-slate-900">23/09/2026</strong>
              </div>
            </div>
          </div>

          {/* Dados das Partes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200 text-xs sm:text-sm">
            <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wide text-xs">
                <User className="w-3.5 h-3.5 text-slate-600" />
                Dados do Titular Requerente
              </div>
              <div>
                <strong className="text-slate-800">Titular:</strong> Mauro Fengler
              </div>
              <div>
                <strong className="text-slate-800">Perfil Pessoal (ID Meta):</strong>{' '}
                <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
                  100003236744987
                </code>
              </div>
              <div>
                <strong className="text-slate-800">Perfil Comercial:</strong> @mauro.brfimoveis
                (Instagram)
              </div>
              <div>
                <strong className="text-slate-800">Tempo de Anúncios na Plataforma:</strong>{' '}
                Superior a 5 anos contínuos
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wide text-xs">
                <Building className="w-3.5 h-3.5 text-slate-600" />
                Dados da Empresa Afetada
              </div>
              <div>
                <strong className="text-slate-800">Razão / Nome Fantasia:</strong> BRF Imóveis
              </div>
              <div>
                <strong className="text-slate-800">Página Oficial Facebook (ID):</strong>{' '}
                <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
                  1219427617930954
                </code>
              </div>
              <div>
                <strong className="text-slate-800">Portfólio Empresarial:</strong> BRF Imóveis 1
                (ID: 1678016233499097)
              </div>
              <div>
                <strong className="text-slate-800">Contato / Domínio:</strong> brfimoveis@gmail.com
                | brfimoveis.com.br
              </div>
            </div>
          </div>

          {/* Resumo da Ocorrência */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-950 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Síntese da Ilegalidade/Obstrução:</strong> Em <strong>11/07/2026</strong>, a
              Meta aplicou restrição unilateral no perfil pessoal de Mauro Fengler com a alegação
              genérica de <em>"Descumprimento dos Padrões da Comunidade"</em>. Desde então, as
              ferramentas administrativas e de vinculação entre Instagram e a Página da imobiliária
              encontram-se bloqueadas, enquanto os canais de suporte negam análise humana e os links
              de autoatendimento encontram-se quebrados/inacessíveis.
            </div>
          </div>
        </header>

        {/* 2) RESUMO TÉCNICO CONFIRMADO PELA META (POR ESCRITO NO CHAT OFICIAL) */}
        <section className="mb-10 print:break-inside-avoid">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-lg sm:text-xl font-bold font-serif text-slate-900">
              2. Declarações e Confissões Técnicas Emitidas Pela Meta
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mb-4">
            Em sessão oficial de suporte realizada em <strong>23/09/2026</strong> sob o{' '}
            <strong>Protocolo #1589293502887786</strong>, os sistemas automatizados e a inteligência
            de suporte da Meta emitiram as seguintes declarações formais <em>in verbis</em>:
          </p>

          <div className="space-y-3">
            <div className="border-l-4 border-red-600 bg-red-50/70 p-4 rounded-r text-xs sm:text-sm text-red-950">
              <span className="font-bold text-xs uppercase tracking-wide text-red-800 block mb-1">
                Declaração Oficial I — Confirmação da Aplicação da Restrição
              </span>
              <p className="italic font-serif leading-relaxed">
                "Confirmei que o seu perfil pessoal (Mauro Fengler, ID 100003236744987) possui uma
                restrição ativa aplicada em 11 de julho de 2026 por violação dos Padrões da
                Comunidade."
              </p>
            </div>

            <div className="border-l-4 border-red-600 bg-red-50/70 p-4 rounded-r text-xs sm:text-sm text-red-950">
              <span className="font-bold text-xs uppercase tracking-wide text-red-800 block mb-1">
                Declaração Oficial II — Recusa Expressa de Revisão e Ausência de Acesso a Atendente
                Humano
              </span>
              <p className="italic font-serif leading-relaxed">
                "No momento, não tenho ferramentas disponíveis para remover essa restrição de perfil
                manualmente ou encaminhar para uma análise humana direta, pois o sistema de suporte
                automatizado identificou que o perfil não atende aos critérios atuais para essa
                escalada específica."
              </p>
            </div>

            <div className="border-l-4 border-amber-600 bg-amber-50/70 p-4 rounded-r text-xs sm:text-sm text-amber-950">
              <span className="font-bold text-xs uppercase tracking-wide text-amber-800 block mb-1">
                Declaração Oficial III — Regra Oculta de Limite Vitalício de Portfólios
              </span>
              <p className="italic font-serif leading-relaxed">
                "cada perfil possui um limite vitalício de criação de dois portfólios de negócios. A
                exclusão de portfólios antigos não libera esse limite, pois o sistema contabiliza o
                total histórico de criações."
              </p>
            </div>

            <div className="border-l-4 border-slate-700 bg-slate-50 p-4 rounded-r text-xs sm:text-sm text-slate-900">
              <span className="font-bold text-xs uppercase tracking-wide text-slate-700 block mb-1">
                Declaração Oficial IV — Resumo Técnico de Encerramento Registrado no Suporte
              </span>
              <p className="italic font-serif leading-relaxed">
                "Data da restrição: 11 de julho de 2026. Motivo: Descumprimento dos Padrões da
                Comunidade. Status atual: A conta permanece restrita e os sistemas automáticos
                direcionam a resolução para as ferramentas de autoatendimento."
              </p>
            </div>
          </div>
        </section>

        {/* 3) LINHA DO TEMPO DAS TENTATIVAS (23/09/2026) */}
        <section className="mb-10 print:break-inside-avoid">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg sm:text-xl font-bold font-serif text-slate-900">
              3. Cronologia das Tentativas e Falhas Sistêmicas (23/09/2026)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mb-4">
            Relação exaustiva dos procedimentos técnicos executados pelo usuário para restabelecer a
            integração e acessar a revisão prometida, todos infrutíferos em decorrência de bugs e
            bloqueios de infraestrutura da própria Meta:
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-20">Horário</th>
                  <th className="py-2.5 px-3">Tentativa / Procedimento Técnico</th>
                  <th className="py-2.5 px-3 w-72">Resultado Obtido / Resposta da Plataforma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50/50 print:break-inside-avoid">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 align-top">
                    14h50
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <span className="font-semibold text-slate-900 block">
                      Conexão Instagram ↔ Página via Meta Business Suite
                    </span>
                    <span className="text-slate-600 text-xs">
                      Tentativa realizada logado no perfil principal de Mauro Fengler com vínculo
                      direto à Página oficial.
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-red-700 font-medium align-top">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>
                        Erro <strong>"Limite atingido para o número de negócios"</strong> no clique
                        final de confirmação.
                      </span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 print:break-inside-avoid">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 align-top">
                    15h13
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <span className="font-semibold text-slate-900 block">
                      Rota Reversa no Aplicativo do Instagram
                    </span>
                    <span className="text-slate-600 text-xs">
                      Passos: Editar perfil → Informações do perfil → Facebook: BRF Imóveis →
                      Confirmar.
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-red-700 font-medium align-top">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>
                        Mensagem genérica:{' '}
                        <strong>"Ocorreu um erro. Tente novamente mais tarde"</strong>.
                      </span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 print:break-inside-avoid">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 align-top">
                    17h40
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <span className="font-semibold text-slate-900 block">
                      Busca por "Status da Conta" nas Configurações do Facebook Mobile
                    </span>
                    <span className="text-slate-600 text-xs">
                      Caminho reiteradamente indicado pelo suporte da Meta para solicitar a
                      contestação da restrição.
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-red-700 font-medium align-top">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>
                        <strong>Item inexistente.</strong> O buscador interno retorna exclusivamente
                        a opção "Status online".
                      </span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 print:break-inside-avoid">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 align-top">
                    18h19
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <span className="font-semibold text-slate-900 block">
                      Acesso a facebook.com/account/status no Chrome Celular
                    </span>
                    <span className="text-slate-600 text-xs">
                      URL fornecida pelo próprio suporte da Meta como canal alternativo.
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-red-700 font-medium align-top">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>
                        Link quebrado:{' '}
                        <strong>
                          "The link you followed may be broken, or the page may have been removed"
                        </strong>
                        .
                      </span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 print:break-inside-avoid">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 align-top">
                    18h40
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <span className="font-semibold text-slate-900 block">
                      Acesso a facebook.com/accountstatus (endereço correto) no PC
                    </span>
                    <span className="text-slate-600 text-xs">
                      Teste em computador desktop com a conta titular devidamente autenticada.
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-red-700 font-medium align-top">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>
                        Página carrega mas exibe:{' '}
                        <strong>"Este conteúdo não está disponível no momento"</strong> ao próprio
                        titular.
                      </span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 print:break-inside-avoid">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 align-top">
                    Noite
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <span className="font-semibold text-slate-900 block">
                      Links de Revisão Enviados Pela IA do Suporte
                    </span>
                    <span className="text-slate-600 text-xs">
                      URLs de apoio enviadas diretamente no protocolo #1589293502887786.
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-red-700 font-medium align-top">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>
                        <strong>3 links consecutivos vazios/quebrados</strong> sem destino funcional
                        para contestação.
                      </span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 print:break-inside-avoid">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 align-top">
                    Noite
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <span className="font-semibold text-slate-900 block">
                      Formulário Externo de Contato
                    </span>
                    <span className="text-slate-600 text-xs">
                      URL direta: facebook.com/help/contact/507270721277573
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-amber-700 font-medium align-top">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        Pendente de processamento pela equipe interna sem prazo garantido de
                        retorno.
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Destaque de Contradição Probatória */}
          <div className="mt-4 p-3.5 bg-slate-900 text-white rounded text-xs leading-relaxed print:break-inside-avoid">
            <div className="font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Contradição Probatória Essencial
            </div>
            Durante todo o período fiscalizado, os painéis oficiais <strong>
              "Seus alertas"
            </strong>{' '}
            (perfil de usuário) e o <strong>"Suporte para Empresas / Qualidade da Conta"</strong>{' '}
            exibiram textualmente o status <strong>"Nenhuma violação"</strong> /{' '}
            <strong>"No advertising issues"</strong>. Há divergência explícita e culposa entre o
            sistema sancionador interno da ré e o painel fornecido ao consumidor, gerando
            insegurança jurídica e impedindo o exercício da ampla defesa.
          </div>
        </section>

        {/* 4) TRANSCRIÇÃO ÍNTEGRA DO CHAT COM O SUPORTE META (23/09/2026) */}
        <section className="mb-10 print:break-inside-avoid">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg sm:text-xl font-bold font-serif text-slate-900">
              4. Transcrição Fidedigna das Comunicações Oficiais (Chat Meta — 23/09/2026)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mb-4">
            Registro cronológico das mensagens trocadas no canal oficial de suporte empresarial
            (Protocolo #1589293502887786), comprovando os avisos de litígio emitidos pelo requerente
            e as negativas de solução fornecidas pela Meta:
          </p>

          <div className="space-y-3 text-xs sm:text-sm font-sans border border-slate-200 rounded p-4 bg-slate-50/50">
            {/* Mensagem 1 - Mauro */}
            <div className="bg-white p-3.5 rounded border border-slate-200 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-100 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> [Mauro Fengler — Requerente]
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  14h50 — Abertura do Chamado
                </span>
              </div>
              <p className="text-slate-800 leading-relaxed">
                <strong>Descrição do problema:</strong> Restrição preventiva bloqueando ações
                administrativas vitais; impossibilidade de conectar o Instagram{' '}
                <code>@mauro.brfimoveis</code> à Página oficial da imobiliária (ID{' '}
                <code>1219427617930954</code>) — retorno constante do erro{' '}
                <em>"Limite atingido para o número de negócios"</em>; impossibilidade de criar novos
                portfólios, apesar de existir apenas um portfólio ativo registrado (
                <em>"BRF Imóveis 1"</em>, ID <code>1678016233499097</code>). Todos os painéis
                oficiais de integridade acusam <em>"Nenhuma violação"</em>. Referência a caso
                anterior aberto sob o protocolo #1589293502887786. Solicita expressamente
                atendimento humano.
              </p>
            </div>

            {/* Mensagem 2 - Meta IA */}
            <div className="bg-slate-100 p-3.5 rounded border border-slate-300 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-slate-700" /> [Meta Suporte IA — Sistema Oficial]
                </span>
                <span className="font-mono text-[11px] text-slate-500">14h55</span>
              </div>
              <p className="text-slate-800 italic leading-relaxed">
                "Sinto muito que você esteja enfrentando essas restrições em sua conta e em seus
                ativos de negócio... Vou verificar o status da sua conta e do seu portfólio para
                entender a causa desses limites."
              </p>
            </div>

            {/* Mensagem 3 - Meta IA */}
            <div className="bg-slate-100 p-3.5 rounded border border-slate-300 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-slate-700" /> [Meta Suporte IA — Sistema Oficial]
                </span>
                <span className="font-mono text-[11px] text-slate-500">15h02</span>
              </div>
              <p className="text-slate-800 leading-relaxed">
                Orientou etapas preliminares: checagem se o Instagram está convertido em conta
                profissional, remoção de vínculos legados em páginas inativas, tentativa de conexão
                através do app mobile do Instagram; indagou se o usuário já havia testado outro
                navegador web ou modo anônimo.
              </p>
            </div>

            {/* Mensagem 4 - Mauro */}
            <div className="bg-white p-3.5 rounded border border-slate-200 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-100 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> [Mauro Fengler — Requerente]
                </span>
                <span className="font-mono text-[11px] text-slate-500">15h08</span>
              </div>
              <p className="text-slate-800 leading-relaxed">
                Respondeu ponto a ponto às orientações: a conta do Instagram já é profissional; a
                faxina completa de vínculos antigos e páginas órfãs já foi realizada; a rota reversa
                pelo app do Instagram ainda não havia sido testada naquele instante; frisou que o
                erro não decorre de cache de navegador, pois ocorre no clique final de confirmação
                com a sessão autenticada no perfil principal.
              </p>
            </div>

            {/* Mensagem 5 - Meta IA */}
            <div className="bg-slate-100 p-3.5 rounded border border-slate-300 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-slate-700" /> [Meta Suporte IA — Sistema Oficial]
                </span>
                <span className="font-mono text-[11px] text-slate-500">15h10</span>
              </div>
              <p className="text-slate-800 italic leading-relaxed">
                "Fico no aguardo do resultado da tentativa pelo aplicativo do Instagram... Caso o
                erro de limite persista mesmo pelo aplicativo, por favor, me avise. Nesse cenário,
                buscarei alternativas adicionais de suporte ou orientações específicas para a
                revisão dessa limitação no seu perfil."
              </p>
            </div>

            {/* Mensagem 6 - Mauro */}
            <div className="bg-white p-3.5 rounded border border-slate-200 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-100 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> [Mauro Fengler — Requerente]
                </span>
                <span className="font-mono text-[11px] text-slate-500">15h15</span>
              </div>
              <p className="text-slate-800 leading-relaxed">
                Informou que o teste pelo aplicativo do Instagram falhou com a mensagem{' '}
                <em>"Ocorreu um erro. Tente novamente mais tarde"</em> ao pressionar o botão
                CONFIRMAR final; solicitou formalmente as alternativas e procedimentos de escalada
                prometidos na mensagem anterior.
              </p>
            </div>

            {/* Mensagem 7 - Meta IA (CONFIRMAÇÃO CRUCIAL) */}
            <div className="bg-red-50 p-3.5 rounded border border-red-300 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-red-200 pb-1">
                <span className="font-bold text-red-900 text-xs uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-700" /> [Meta Suporte IA — Confissão
                  de Restrição]
                </span>
                <span className="font-mono text-[11px] text-red-700">15h20</span>
              </div>
              <div className="text-slate-900 space-y-2">
                <p className="italic font-serif font-bold text-red-950">
                  "Confirmei que o seu perfil pessoal (Mauro Fengler, ID 100003236744987) possui uma
                  restrição ativa aplicada em 11 de julho de 2026 por violação dos Padrões da
                  Comunidade."
                </p>
                <p className="italic">
                  "cada perfil possui um limite vitalício de criação de dois portfólios de negócios.
                  A exclusão de portfólios antigos não libera esse limite, pois o sistema
                  contabiliza o total histórico de criações."
                </p>
                <p className="italic">
                  "No momento, não tenho ferramentas disponíveis para remover essa restrição de
                  perfil manualmente ou encaminhar para uma análise humana direta, pois o sistema de
                  suporte automatizado identificou que o perfil não atende aos critérios atuais para
                  essa escalada específica."
                </p>
                <p className="text-xs text-slate-700">
                  Adicionalmente, instruiu o usuário a consultar o "Status da Conta" dentro das
                  configurações móveis, sugeriu o uso paliativo de um perfil secundário e recomendou
                  leitura no Centro de Transparência.
                </p>
              </div>
            </div>

            {/* Mensagem 8 - Mauro */}
            <div className="bg-white p-3.5 rounded border border-slate-200 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-100 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> [Mauro Fengler — Notificação
                  Formal]
                </span>
                <span className="font-mono text-[11px] text-slate-500">15h30</span>
              </div>
              <p className="text-slate-900 font-medium leading-relaxed bg-amber-50/50 p-2 rounded border border-amber-200">
                "sou cliente de anuncio por mais de cinco anos... quero uma solução em 48 horas - se
                não entro com uma ação de perdas e danos."
              </p>
              <p className="text-slate-700 text-xs mt-1.5">
                Exigiu resolução imediata do bloqueio ou o direcionamento definitivo para escalada a
                supervisor humano.
              </p>
            </div>

            {/* Mensagem 9 - Meta IA */}
            <div className="bg-slate-100 p-3.5 rounded border border-slate-300 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-slate-700" /> [Meta Suporte IA — Sistema Oficial]
                </span>
                <span className="font-mono text-[11px] text-slate-500">15h35</span>
              </div>
              <p className="text-slate-800 leading-relaxed">
                Reconfirmou a restrição ativa; declarou textualmente que{' '}
                <em>
                  "sua conta não é elegível para o processo de recuperação automática por este
                  canal"
                </em>
                ; reiterou a indicação inócua para a Central de Transparência e reforçou os passos
                em <em>Configurações &gt; Status da conta</em> (caminho já comprovadamente
                inexistente no sistema).
              </p>
            </div>

            {/* Mensagem 10 - Mauro */}
            <div className="bg-white p-3.5 rounded border border-slate-200 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-100 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> [Mauro Fengler — Requerente]
                </span>
                <span className="font-mono text-[11px] text-slate-500">15h42</span>
              </div>
              <p className="text-slate-800 leading-relaxed">
                Resposta final exigindo o link/URL por extenso do formulário oficial de revisão
                humana ou a escalada formal com protocolo específico remetido ao time de
                Integridade/Contas Restritas da Meta, fixando prazo derradeiro de 48 horas, sob pena
                de imediata judicialização e responsabilização civil.
              </p>
            </div>

            {/* Mensagem 11 - Meta IA */}
            <div className="bg-slate-100 p-3.5 rounded border border-slate-300 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-slate-700" /> [Meta Suporte IA — Fornecimento de
                  Protocolo]
                </span>
                <span className="font-mono text-[11px] text-slate-500">15h50</span>
              </div>
              <p className="text-slate-800 leading-relaxed">
                Indicou links genéricos para Centro de Transparência, "Caixa de Entrada de Apoio" e
                Conselho de Supervisão (Oversight Board); registrou formalmente:{' '}
                <em>"O número de protocolo desta nossa interação é 1589293502887786."</em>; voltou a
                recomendar modo anônimo e teste em dispositivo diferente.
              </p>
            </div>

            {/* Mensagem 12 - Meta IA (ENCERRAMENTO/REGISTRO OFICIAL) */}
            <div className="bg-slate-900 text-white p-4 rounded border border-slate-950 print:break-inside-avoid">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-800 pb-1">
                <span className="font-bold text-emerald-400 text-xs uppercase tracking-wide">
                  [Meta Suporte IA — Encerramento e Ficha Técnica Oficial do Caso]
                </span>
                <span className="font-mono text-[11px] text-slate-400">16h05</span>
              </div>
              <div className="space-y-2 text-xs sm:text-sm font-sans leading-relaxed">
                <p className="font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-emerald-300">
                  "Para o registro do seu caso (Protocolo 1589293502887786), os dados técnicos
                  confirmados são: Data da restrição: 11 de julho de 2026. Motivo: Descumprimento
                  dos Padrões da Comunidade. Status atual: A conta permanece restrita e os sistemas
                  automáticos direcionam a resolução para as ferramentas de autoatendimento."
                </p>
                <p className="text-slate-300 text-xs">
                  A IA encerrou orientando o usuário a consultar profissional habilitado para os
                  meios judiciais caso entenda cabível, mencionando ainda eventual elegibilidade
                  para submissão de caso ao Conselho de Supervisão independente da Meta.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5) GALERIA DE PRINTS COMPROBATÓRIOS */}
        <section className="mb-10 print:break-inside-avoid">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg sm:text-xl font-bold font-serif text-slate-900">
              5. Acervo Probatório Documental (Capturas de Tela em Ordem Cronológica)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mb-6">
            Capturas de tela originais obtidas em 23/09/2026, registradas em tempo real durante a
            execução dos testes e o atendimento oficial, atestando todas as incoerências sistêmicas
            apontadas:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {GALLERY_PRINTS.map((item, index) => {
              const fullUrl = `${ATTACHMENT_BASE_URL}${item.filename}`
              return (
                <div
                  key={item.filename}
                  className="dossie-print-card border border-slate-200 rounded bg-white overflow-hidden shadow-xs print:break-inside-avoid print:border-slate-300 flex flex-col"
                >
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono text-slate-400 font-normal">
                          #{String(index + 1).padStart(2, '0')}
                        </span>
                        {item.title}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{item.time}</div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase font-mono px-1.5 py-0"
                    >
                      Doc. {index + 1}
                    </Badge>
                  </div>

                  <div className="p-2 bg-slate-100 flex items-center justify-center min-h-[220px] print:min-h-0">
                    <img
                      src={fullUrl}
                      alt={item.title}
                      loading="eager"
                      crossOrigin="anonymous"
                      className="max-h-80 w-auto object-contain rounded border border-slate-300 print:max-h-72"
                      onError={(e) => {
                        // Fallback em caso de indisponibilidade momentânea
                        const target = e.currentTarget
                        target.onerror = null
                        target.style.display = 'none'
                        if (target.parentElement) {
                          target.parentElement.innerHTML = `<div class="p-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded text-center">Arquivo de imagem registrado: ${item.filename}</div>`
                        }
                      }}
                    />
                  </div>

                  <div className="p-3 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100 flex-1">
                    <p>{item.description}</p>
                    <div className="mt-2 text-[10px] font-mono text-slate-400 truncate print:text-[9px]">
                      Ref: {item.filename}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 6) SEÇÃO FINAL: CANAIS ESGOTADOS + ASSINATURA */}
        <section className="print:break-inside-avoid border-t-2 border-slate-900 pt-8 mt-12">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg sm:text-xl font-bold font-serif text-slate-900">
              6. Conclusão Técnica e Esgotamento das Vias Extrajudiciais
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4">
            Diante dos elementos fáticos e probatórios coligidos, resta incontroversa a recusa de
            atendimento, o cerceamento de defesa e a falha na prestação do serviço por parte da Meta
            Platforms, incidindo as seguintes constatações:
          </p>

          {/* Checklist Visual de Canais Esgotados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-xs">
            <div className="p-3 bg-red-50/70 border border-red-200 rounded flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Suporte Oficial Direto:</strong> Recusa expressa de intervenção manual e
                encerramento automatizado do protocolo #1589293502887786.
              </div>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-200 rounded flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Autoatendimento Indicado:</strong> Páginas quebradas (erro 404/broken link)
                ou bloqueadas ao próprio titular autenticado.
              </div>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-200 rounded flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Painéis de Transparência:</strong> Informam indevidamente "Nenhuma
                violação", privando o usuário de motivação específica.
              </div>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-200 rounded flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Revisão Humana:</strong> Declarada indisponível pelos próprios sistemas da
                provedora por ausência de critérios automatizados.
              </div>
            </div>
          </div>

          {/* Declaração Jurídica de Prazo e Intenção */}
          <div className="p-4 bg-slate-100 border border-slate-300 rounded text-xs sm:text-sm text-slate-800 leading-relaxed mb-10 print:break-inside-avoid">
            <strong>NOTIFICAÇÃO FORMAL E PRAZO DILATÓRIO:</strong> O titular concedeu à Meta
            Platforms o prazo improrrogável de <strong>48 (quarenta e oito) horas</strong>, contado
            a partir da interação de 23/09/2026, para o restabelecimento administrativo pleno dos
            ativos e liberação do vínculo entre a conta de Instagram <code>@mauro.brfimoveis</code>{' '}
            e a Página oficial <code>BRF Imóveis</code> (ID <code>1219427617930954</code>).
            <br className="my-1" />
            Transcorrido o período assinalado sem o saneamento dos ilícitos e bugs sistêmicos
            relatados, este instrumento instrui a competente{' '}
            <strong>
              Ação de Obrigação de Fazer cumulada com Indenização por Perdas e Danos e Lucros
              Cessantes
            </strong>
            , em razão do prejuízo econômico e da impossibilidade de gerir campanhas e atendimento
            de vendas imobiliárias.
          </div>

          {/* Campo de Assinatura para Preenchimento à Mão */}
          <div className="pt-6 border-t border-slate-300 print:break-inside-avoid">
            <div className="text-xs uppercase font-bold text-slate-600 mb-8 text-center tracking-wider">
              Declaração de Veracidade e Ratificação das Provas
            </div>

            <div className="max-w-xl mx-auto space-y-8">
              <div className="border-b border-slate-900 h-10 w-full" />
              <div className="text-center -mt-6">
                <div className="font-bold text-sm text-slate-900">MAURO FENGLER</div>
                <div className="text-xs text-slate-600">Titular Requerente / BRF Imóveis</div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-xs pt-4">
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">CPF do Titular:</span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-slate-800">
                    ___.___.___-__
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">
                    Data de Assinatura:
                  </span>
                  <div className="border-b border-slate-400 pb-1 font-mono text-slate-800">
                    23 / 09 / 2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rodapé Formal */}
        <footer className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 print:block">
          Dossiê gerado pelo CRM BRF Imóveis — Documento de instrução jurídica — Todos os direitos
          reservados.
        </footer>
      </div>
    </div>
  )
}
