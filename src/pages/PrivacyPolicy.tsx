import { Shield, Mail, ArrowLeft, Lock, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function PrivacyPolicy() {
  const lastUpdated = '16 de maio de 2024'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                BRF Imóveis
              </span>
              <span className="text-xs text-slate-500 font-medium">
                CRM de Vendas Bia · Assistente Virtual
              </span>
            </div>
          </div>
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Acessar CRM</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Title Block */}
        <div className="mb-10 text-center sm:text-left border-b border-slate-200 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Lock className="h-3.5 w-3.5" />
            Conformidade LGPD & Meta Platform Terms
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Política de Privacidade — BRF Imóveis
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Saiba como tratamos seus dados pessoais no aplicativo e na assistente virtual Bia da BRF
            Imóveis.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Última atualização: <span className="font-medium text-slate-600">{lastUpdated}</span>
          </p>
        </div>

        {/* Quick summary card */}
        <Card className="mb-10 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Resumo Essencial
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Não vendemos</strong> seus dados em hipótese alguma.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  Uso focado no <strong>atendimento imobiliário</strong> e suporte via IA.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  Integração oficial com <strong>WhatsApp, Instagram e Facebook</strong> via Meta.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  Você pode solicitar a <strong>exclusão ou alteração</strong> a qualquer momento.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Policy Sections */}
        <div className="space-y-10 text-slate-800 leading-relaxed text-sm sm:text-base">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                1
              </span>
              Quem Somos e Identificação do Controlador
            </h2>
            <p>
              A <strong>BRF Imóveis</strong> é uma empresa imobiliária brasileira dedicada à
              intermediação de compra, venda, locação e lançamentos imobiliários.
            </p>
            <p>
              Para operar nossos serviços de atendimento ágil aos clientes, desenvolvemos e
              utilizamos a assistente virtual e CRM de vendas <strong>"Bia"</strong>, projetada para
              interagir com clientes e potenciais compradores (leads) de imóveis de maneira
              inteligente, segura e personalizada através de canais digitais como WhatsApp,
              Instagram e Facebook Messenger.
            </p>
            <div className="rounded-lg bg-slate-100 p-4 border border-slate-200 text-sm">
              <p className="font-semibold text-slate-900">
                Encarregado pelo Tratamento de Dados (DPO) e Canal de Contato:
              </p>
              <p className="mt-1 flex items-center gap-2 text-slate-700">
                <Mail className="h-4 w-4 text-primary" />
                E-mail para solicitações de privacidade:{' '}
                <a
                  href="mailto:contato@brfimoveis.com.br"
                  className="font-semibold text-primary underline hover:text-primary/80"
                >
                  contato@brfimoveis.com.br
                </a>
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                2
              </span>
              Quais Dados Pessoais Coletamos
            </h2>
            <p>
              Coletamos apenas os dados estritamente necessários para viabilizar o atendimento
              imobiliário e aprimorar a experiência dos usuários. Isso inclui:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>
                <strong>Dados de identificação e contato:</strong> nome completo, número de telefone
                com DDD (WhatsApp), endereço de e-mail e cidade de interesse.
              </li>
              <li>
                <strong>Mensagens e histórico de conversa:</strong> conteúdo das mensagens,
                perguntas e preferências imobiliárias trocadas com a nossa assistente virtual{' '}
                <em>Bia</em> ou com corretores autorizados através do WhatsApp Business API, Direct
                do Instagram e Facebook Messenger.
              </li>
              <li>
                <strong>Preferências de imóveis e qualificação de compra:</strong> faixa de valor
                desejada, localização, tipologia do imóvel (quartos, vagas, área) e estágio de
                decisão de compra.
              </li>
              <li>
                <strong>Dados técnicos de navegação e conversão:</strong> endereço IP, identificador
                de anúncio (Meta Click ID - fbclid), identificador do navegador e eventos de
                conversão (envio de formulário de lead, início de conversa, visualização de imóvel)
                coletados via Meta Pixel e Meta Conversions API (CAPI).
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                3
              </span>
              Finalidade do Tratamento dos Dados
            </h2>
            <p>
              Os dados coletados são tratados para finalidades legítimas, específicas e
              transparentes:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-1">
                  Atendimento ao Cliente e Leads
                </h3>
                <p className="text-sm text-slate-600">
                  Responder dúvidas sobre imóveis, enviar fotos, plantas e valores, agendar visitas
                  com corretores e prestar suporte via WhatsApp e redes sociais.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-1">Comunicações Comerciais</h3>
                <p className="text-sm text-slate-600">
                  Envio de oportunidades imobiliárias compatíveis com seu perfil, novos lançamentos
                  e novidades, sempre respeitando seu direito de cancelamento.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-1">
                  Assistência por Inteligência Artificial
                </h3>
                <p className="text-sm text-slate-600">
                  Processar e responder com rapidez às mensagens recebidas através da inteligência
                  artificial Bia, oferecendo atendimento 24/7.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-1">
                  Otimização de Campanhas (Meta)
                </h3>
                <p className="text-sm text-slate-600">
                  Mensurar a eficácia de anúncios no Facebook e Instagram por meio de Meta Pixel e
                  Meta Conversions API (CAPI), evitando a exibição de anúncios irrelevantes.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                4
              </span>
              Compartilhamento de Dados com Terceiros
            </h2>
            <p>
              A <strong>BRF Imóveis NÃO vende, não aluga e não comercializa</strong> dados pessoais
              em nenhuma circunstância.
            </p>
            <p>
              O compartilhamento de dados ocorre exclusivamente com provedores essenciais para a
              prestação do serviço contratado, mediante contratos e compromissos rigorosos de
              confidencialidade e segurança da informação:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>
                <strong>Meta Platforms, Inc. (Facebook, Instagram, WhatsApp):</strong>{' '}
                compartilhamos dados técnicos e eventos de mensageria via API oficial do WhatsApp
                Business, Instagram Graph API e Meta Conversions API (CAPI) para viabilizar o envio
                e recebimento de mensagens e mensuração de anúncios. A Meta trata esses dados em
                conformidade com seus próprios termos de serviço e diretrizes de privacidade.
              </li>
              <li>
                <strong>Provedores de infraestrutura em nuvem e Inteligência Artificial:</strong>{' '}
                serviços de hospedagem de servidores e processamento de linguagem natural
                necessários para a operação dos servidores do CRM e da assistente Bia.
              </li>
              <li>
                <strong>Autoridades governamentais e judiciais:</strong> quando formalmente
                requisitado por ordem judicial ou para o estrito cumprimento de dever legal ou
                regulatório.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                5
              </span>
              Seus Direitos como Titular de Dados (LGPD)
            </h2>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados Pessoais do Brasil (Lei nº
              13.709/2018 — LGPD), você possui os seguintes direitos garantidos e pode exercê-los a
              qualquer momento e sem custos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-slate-900 block text-sm">
                  Confirmação e Acesso
                </span>
                <span className="text-xs text-slate-600">
                  Saber se tratamos seus dados e solicitar uma cópia das informações arquivadas.
                </span>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-slate-900 block text-sm">
                  Correção e Atualização
                </span>
                <span className="text-xs text-slate-600">
                  Solicitar a retificação de dados incorretos, incompletos ou desatualizados.
                </span>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-slate-900 block text-sm">
                  Exclusão e Anonimização
                </span>
                <span className="text-xs text-slate-600">
                  Pedir a eliminação ou anonimização de dados pessoais tratados com base em
                  consentimento.
                </span>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-slate-900 block text-sm">
                  Revogação de Consentimento
                </span>
                <span className="text-xs text-slate-600">
                  Retirar sua autorização para recebimento de comunicações a qualquer momento.
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Como solicitar o exercício dos seus direitos:</p>
                  <p className="mt-1">
                    Basta enviar uma solicitação com o assunto <em>"LGPD - Direitos do Titular"</em>{' '}
                    para o e-mail oficial{' '}
                    <a
                      href="mailto:contato@brfimoveis.com.br"
                      className="font-bold underline hover:text-blue-950"
                    >
                      contato@brfimoveis.com.br
                    </a>
                    . Responderemos sua solicitação dentro do prazo legal. Você também pode
                    responder com a palavra <strong>"PARAR"</strong> ou <strong>"SAIR"</strong> em
                    qualquer mensagem enviada via WhatsApp para interromper envios promocionais.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                6
              </span>
              Segurança e Armazenamento dos Dados
            </h2>
            <p>
              Adotamos práticas técnicas e administrativas reconhecidas no mercado para proteger os
              dados pessoais contra acessos não autorizados, destruição acidental, alteração ou
              perda:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>
                Comunicações e tráfego de dados criptografados via protocolo HTTPS / TLS (Transport
                Layer Security).
              </li>
              <li>
                Acesso restrito a colaboradores autorizados mediante autenticação segura de dois
                fatores e controle de papéis.
              </li>
              <li>
                Servidores com monitoramento contínuo de integridade e cópias de segurança (backups)
                regulares.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                7
              </span>
              Retenção e Descarte de Dados
            </h2>
            <p>
              Os dados pessoais são mantidos pelo período necessário para cumprir com as finalidades
              para as quais foram coletados, respeitando os prazos legais de prescrição imobiliária
              e obrigações fiscais/regulatórias no Brasil.
            </p>
            <p>
              Ao término da necessidade ou mediante solicitação do titular (observadas as exceções
              legais de retenção), os dados serão excluídos de maneira segura ou mantidos
              estritamente anonimizados para fins estatísticos internos.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                8
              </span>
              Atualizações desta Política de Privacidade
            </h2>
            <p>
              Esta Política de Privacidade pode ser revisada periodicamente para refletir mudanças
              nos serviços prestados, inclusão de novas ferramentas ou atualizações na legislação
              aplicável.
            </p>
            <p>
              Qualquer alteração substancial será sinalizada pela atualização da data no cabeçalho
              desta página. Recomendamos que os usuários revisem este documento com regularidade.
            </p>
          </section>
        </div>

        {/* Footer info box */}
        <div className="mt-14 border-t border-slate-200 pt-8 text-center text-xs text-slate-500 space-y-2">
          <p>© {new Date().getFullYear()} BRF Imóveis. Todos os direitos reservados.</p>
          <p>
            BRF Imóveis — Intermediação Imobiliária · Assistente Virtual Bia
            <br />
            Dúvidas ou solicitações:{' '}
            <a
              href="mailto:contato@brfimoveis.com.br"
              className="text-primary font-medium hover:underline"
            >
              contato@brfimoveis.com.br
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
