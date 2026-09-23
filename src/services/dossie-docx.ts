import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Header,
  Footer,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  HeadingLevel,
} from 'docx'
import { saveAs } from 'file-saver'

export interface PrintItemDocx {
  filename: string
  title: string
  time: string
  description: string
}

const ATTACHMENT_BASE_URL =
  'https://dagtlwojkqyivnjgveda.supabase.co/storage/v1/object/public/message-attachments/a4df5bdc-f53f-4f95-b504-409dabc64445/'

const CHAT_TRANSCRIPT = [
  {
    author: '[Mauro Fengler — Requerente]',
    time: '14h50 — Abertura do Chamado',
    variant: 'user' as const,
    content:
      'Descrição do problema: Restrição preventiva bloqueando ações administrativas vitais; impossibilidade de conectar o Instagram @mauro.brfimoveis à Página oficial da imobiliária (ID 1219427617930954) — retorno constante do erro "Limite atingido para o número de negócios"; impossibilidade de criar novos portfólios, apesar de existir apenas um portfólio ativo registrado ("BRF Imóveis 1", ID 1678016233499097). Todos os painéis oficiais de integridade acusam "Nenhuma violação". Referência a caso anterior aberto sob o protocolo #1589293502887786. Solicita expressamente atendimento humano.',
  },
  {
    author: '[Meta Suporte IA — Sistema Oficial]',
    time: '14h55',
    variant: 'meta' as const,
    content:
      '"Sinto muito que você esteja enfrentando essas restrições em sua conta e em seus ativos de negócio... Vou verificar o status da sua conta e do seu portfólio para entender a causa desses limites."',
  },
  {
    author: '[Meta Suporte IA — Sistema Oficial]',
    time: '15h02',
    variant: 'meta' as const,
    content:
      'Orientou etapas preliminares: checagem se o Instagram está convertido em conta profissional, remoção de vínculos legados em páginas inativas, tentativa de conexão através do app mobile do Instagram; indagou se o usuário já havia testado outro navegador web ou modo anônimo.',
  },
  {
    author: '[Mauro Fengler — Requerente]',
    time: '15h08',
    variant: 'user' as const,
    content:
      'Respondeu ponto a ponto às orientações: a conta do Instagram já é profissional; a faxina completa de vínculos antigos e páginas órfãs já foi realizada; a rota reversa pelo app do Instagram ainda não havia sido testada naquele instante; frisou que o erro não decorre de cache de navegador, pois ocorre no clique final de confirmação com a sessão autenticada no perfil principal.',
  },
  {
    author: '[Meta Suporte IA — Sistema Oficial]',
    time: '15h10',
    variant: 'meta' as const,
    content:
      '"Fico no aguardo do resultado da tentativa pelo aplicativo do Instagram... Caso o erro de limite persista mesmo pelo aplicativo, por favor, me avise. Nesse cenário, buscarei alternativas adicionais de suporte ou orientações específicas para a revisão dessa limitação no seu perfil."',
  },
  {
    author: '[Mauro Fengler — Requerente]',
    time: '15h15',
    variant: 'user' as const,
    content:
      'Informou que o teste pelo aplicativo do Instagram falhou com a mensagem "Ocorreu um erro. Tente novamente mais tarde" ao pressionar o botão CONFIRMAR final; solicitou formalmente as alternativas e procedimentos de escalada prometidos na mensagem anterior.',
  },
  {
    author: '[Meta Suporte IA — Confissão de Restrição Crucial]',
    time: '15h20',
    variant: 'confession' as const,
    content:
      '"Confirmei que o seu perfil pessoal (Mauro Fengler, ID 100003236744987) possui uma restrição ativa aplicada em 11 de julho de 2026 por violação dos Padrões da Comunidade."\n\n' +
      '"cada perfil possui um limite vitalício de criação de dois portfólios de negócios. A exclusão de portfólios antigos não libera esse limite, pois o sistema contabiliza o total histórico de criações."\n\n' +
      '"No momento, não tenho ferramentas disponíveis para remover essa restrição de perfil manualmente ou encaminhar para uma análise humana direta, pois o sistema de suporte automatizado identificou que o perfil não atende aos critérios atuais para essa escalada específica."\n\n' +
      'Adicionalmente, instruiu o usuário a consultar o "Status da Conta" dentro das configurações móveis, sugeriu o uso paliativo de um perfil secundário e recomendou leitura no Centro de Transparência.',
  },
  {
    author: '[Mauro Fengler — Notificação Formal]',
    time: '15h30',
    variant: 'warning' as const,
    content:
      '"sou cliente de anuncio por mais de cinco anos... quero uma solução em 48 horas - se não entro com uma ação de perdas e danos."\n\n' +
      'Exigiu resolução imediata do bloqueio ou o direcionamento definitivo para escalada a supervisor humano.',
  },
  {
    author: '[Meta Suporte IA — Sistema Oficial]',
    time: '15h35',
    variant: 'meta' as const,
    content:
      'Reconfirmou a restrição ativa; declarou textualmente que "sua conta não é elegível para o processo de recuperação automática por este canal"; reiterou a indicação inócua para a Central de Transparência e reforçou os passos em Configurações > Status da conta (caminho já comprovadamente inexistente no sistema).',
  },
  {
    author: '[Mauro Fengler — Requerente]',
    time: '15h42',
    variant: 'user' as const,
    content:
      'Resposta final exigindo o link/URL por extenso do formulário oficial de revisão humana ou a escalada formal com protocolo específico remetido ao time de Integridade/Contas Restritas da Meta, fixando prazo derradeiro de 48 horas, sob pena de imediata judicialização e responsabilização civil.',
  },
  {
    author: '[Meta Suporte IA — Fornecimento de Protocolo]',
    time: '15h50',
    variant: 'meta' as const,
    content:
      'Indicou links genéricos para Centro de Transparência, "Caixa de Entrada de Apoio" e Conselho de Supervisão (Oversight Board); registrou formalmente: "O número de protocolo desta nossa interação é 1589293502887786."; voltou a recomendar modo anônimo e teste em dispositivo diferente.',
  },
  {
    author: '[Meta Suporte IA — Encerramento e Ficha Técnica Oficial do Caso]',
    time: '16h05',
    variant: 'conclusion' as const,
    content:
      '"Para o registro do seu caso (Protocolo 1589293502887786), os dados técnicos confirmados são: Data da restrição: 11 de julho de 2026. Motivo: Descumprimento dos Padrões da Comunidade. Status atual: A conta permanece restrita e os sistemas automáticos direcionam a resolução para as ferramentas de autoatendimento."\n\n' +
      'A IA encerrou orientando o usuário a consultar profissional habilitado para os meios judiciais caso entenda cabível, mencionando ainda eventual elegibilidade para submissão de caso ao Conselho de Supervisão independente da Meta.',
  },
]

const TIMELINE_EVENTS = [
  {
    time: '14h50',
    action: 'Conexão Instagram ↔ Página via Meta Business Suite',
    details:
      'Tentativa realizada logado no perfil principal de Mauro Fengler com vínculo direto à Página oficial.',
    result: 'Erro "Limite atingido para o número de negócios" no clique final de confirmação.',
  },
  {
    time: '15h13',
    action: 'Rota Reversa no Aplicativo do Instagram',
    details: 'Passos: Editar perfil → Informações do perfil → Facebook: BRF Imóveis → Confirmar.',
    result: 'Mensagem genérica: "Ocorreu um erro. Tente novamente mais tarde".',
  },
  {
    time: '17h40',
    action: 'Busca por "Status da Conta" nas Configurações do Facebook Mobile',
    details:
      'Caminho reiteradamente indicado pelo suporte da Meta para solicitar a contestação da restrição.',
    result: 'Item inexistente. O buscador interno retorna exclusivamente a opção "Status online".',
  },
  {
    time: '18h19',
    action: 'Acesso a facebook.com/account/status no Chrome Celular',
    details: 'URL fornecida pelo próprio suporte da Meta como canal alternativo.',
    result:
      'Link quebrado: "The link you followed may be broken, or the page may have been removed".',
  },
  {
    time: '18h40',
    action: 'Acesso a facebook.com/accountstatus (endereço correto) no PC',
    details: 'Teste em computador desktop com a conta titular devidamente autenticada.',
    result:
      'Página carrega mas exibe: "Este conteúdo não está disponível no momento" ao próprio titular.',
  },
  {
    time: 'Noite',
    action: 'Links de Revisão Enviados Pela IA do Suporte',
    details: 'URLs de apoio enviadas diretamente no protocolo #1589293502887786.',
    result: '3 links consecutivos vazios/quebrados sem destino funcional para contestação.',
  },
  {
    time: 'Noite',
    action: 'Formulário Externo de Contato',
    details: 'URL direta: facebook.com/help/contact/507270721277573',
    result: 'Pendente de processamento pela equipe interna sem prazo garantido de retorno.',
  },
]

// Auxiliar para baixar imagem como Uint8Array com timeout
async function fetchImageBuffer(url: string, timeoutMs = 8000): Promise<Uint8Array | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
      cache: 'force-cache',
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  } catch (err) {
    console.warn(`[DOCX] Falha no download do anexo ${url}:`, err)
    return null
  }
}

export interface ProgressCallback {
  (current: number, total: number, message: string): void
}

export async function generateDossieDocx(
  prints: PrintItemDocx[],
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const FONT_SERIF = 'Times New Roman'
  const FONT_SANS = 'Arial'

  const borderThin = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
  const borderNavy = { style: BorderStyle.SINGLE, size: 8, color: '0F172A' }
  const borderNone = { style: BorderStyle.NONE, size: 0, color: 'auto' }

  // 1. Download paralelo controlado dos 18 prints
  const totalPrints = prints.length
  const downloadedImages: Array<{ buffer: Uint8Array | null; item: PrintItemDocx }> = []

  if (onProgress) onProgress(0, totalPrints, 'Iniciando download dos anexos probatórios...')

  for (let i = 0; i < prints.length; i++) {
    const item = prints[i]
    if (onProgress) {
      onProgress(i + 1, totalPrints, `Baixando print ${i + 1} de ${totalPrints}: ${item.title}...`)
    }
    const fullUrl = `${ATTACHMENT_BASE_URL}${item.filename}`
    const buffer = await fetchImageBuffer(fullUrl)
    downloadedImages.push({ buffer, item })
  }

  if (onProgress) onProgress(totalPrints, totalPrints, 'Montando documento Word formatado...')

  const children: (Paragraph | Table)[] = []

  // ==========================================
  // CABEÇALHO FORMAL
  // ==========================================
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'PROTOCOLO OFICIAL META: #1589293502887786',
          font: FONT_SANS,
          size: 19,
          bold: true,
          color: 'B91C1C', // red-700
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'DOCUMENTO PROBATÓRIO / INSTRUÇÃO PROCESSUAL JURÍDICA',
          font: FONT_SANS,
          size: 17,
          bold: true,
          color: '64748B', // slate-500
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'Dossiê Jurídico — Restrição de Conta Meta/Facebook',
          font: FONT_SERIF,
          size: 40, // 20pt
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: 200, line: 360 },
      children: [
        new TextRun({
          text: 'Relatório circunstanciado de fatos técnicos, transcrição de suporte oficial, recusa de escalada, contradições probatórias e esgotamento de vias administrativas.',
          font: FONT_SERIF,
          size: 22,
          italics: true,
          color: '334155',
        }),
      ],
    }),
  )

  // Tabela: Partes Envolvidas (Titular + Empresa)
  children.push(
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [4513, 4513],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4513, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
              margins: { top: 140, bottom: 140, left: 160, right: 160 },
              borders: {
                top: borderNavy,
                bottom: borderThin,
                left: borderNavy,
                right: borderThin,
              },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: 'DADOS DO TITULAR REQUERENTE',
                      font: FONT_SANS,
                      size: 18,
                      bold: true,
                      color: '0F172A',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({ text: 'Titular: ', font: FONT_SERIF, size: 20, bold: true }),
                    new TextRun({ text: 'Mauro Fengler', font: FONT_SERIF, size: 20 }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: 'Perfil Pessoal (ID Meta): ',
                      font: FONT_SERIF,
                      size: 20,
                      bold: true,
                    }),
                    new TextRun({ text: '100003236744987', font: FONT_SANS, size: 19, bold: true }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: 'Perfil Comercial: ',
                      font: FONT_SERIF,
                      size: 20,
                      bold: true,
                    }),
                    new TextRun({
                      text: '@mauro.brfimoveis (Instagram)',
                      font: FONT_SERIF,
                      size: 20,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: 'Tempo de Anúncios na Meta: ',
                      font: FONT_SERIF,
                      size: 20,
                      bold: true,
                    }),
                    new TextRun({
                      text: 'Superior a 5 anos contínuos',
                      font: FONT_SERIF,
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 4513, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
              margins: { top: 140, bottom: 140, left: 160, right: 160 },
              borders: {
                top: borderNavy,
                bottom: borderThin,
                left: borderThin,
                right: borderNavy,
              },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: 'DADOS DA EMPRESA AFETADA',
                      font: FONT_SANS,
                      size: 18,
                      bold: true,
                      color: '0F172A',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: 'Razão / Fantasia: ',
                      font: FONT_SERIF,
                      size: 20,
                      bold: true,
                    }),
                    new TextRun({ text: 'BRF Imóveis', font: FONT_SERIF, size: 20 }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: 'Página Facebook (ID): ',
                      font: FONT_SERIF,
                      size: 20,
                      bold: true,
                    }),
                    new TextRun({
                      text: '1219427617930954',
                      font: FONT_SANS,
                      size: 19,
                      bold: true,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: 'Portfólio Empresarial: ',
                      font: FONT_SERIF,
                      size: 20,
                      bold: true,
                    }),
                    new TextRun({
                      text: 'BRF Imóveis 1 (ID: 1678016233499097)',
                      font: FONT_SERIF,
                      size: 20,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: 'Contato / Domínio: ',
                      font: FONT_SERIF,
                      size: 20,
                      bold: true,
                    }),
                    new TextRun({
                      text: 'brfimoveis@gmail.com | brfimoveis.com.br',
                      font: FONT_SERIF,
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  )

  // Caixa de Síntese da Ilegalidade
  children.push(
    new Paragraph({ spacing: { before: 140, after: 60 } }),
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [9026],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9026, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'FEF3C7' }, // amber-100
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              borders: {
                top: borderThin,
                bottom: borderThin,
                left: { style: BorderStyle.SINGLE, size: 16, color: 'D97706' },
                right: borderThin,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.BOTH,
                  spacing: { line: 360 },
                  children: [
                    new TextRun({
                      text: 'Síntese da Ilegalidade e Obstrução Comercial: ',
                      font: FONT_SERIF,
                      size: 22,
                      bold: true,
                      color: '78350F',
                    }),
                    new TextRun({
                      text: 'Em 11/07/2026, a Meta Platforms aplicou restrição unilateral no perfil pessoal de Mauro Fengler com a alegação genérica de "Descumprimento dos Padrões da Comunidade". Desde então, as ferramentas administrativas e de vinculação entre Instagram e a Página da imobiliária encontram-se bloqueadas, enquanto os canais de suporte negam análise humana e os links de autoatendimento encontram-se quebrados ou inacessíveis.',
                      font: FONT_SERIF,
                      size: 22,
                      color: '451A03',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } }),
  )

  // ==========================================
  // SEÇÃO 2: CONFISSÕES E DECLARAÇÕES DA META
  // ==========================================
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: '2. Declarações e Confissões Técnicas Emitidas Pela Meta',
          font: FONT_SERIF,
          size: 28, // 14pt
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: 140, line: 360 },
      children: [
        new TextRun({
          text: 'Em sessão oficial de suporte realizada em 23/09/2026 sob o Protocolo #1589293502887786, os sistemas automatizados e a inteligência de suporte da Meta emitiram as seguintes declarações formais in verbis:',
          font: FONT_SERIF,
          size: 24,
        }),
      ],
    }),
  )

  const confessions = [
    {
      num: 'Declaração Oficial I — Confirmação da Aplicação da Restrição',
      quote:
        '"Confirmei que o seu perfil pessoal (Mauro Fengler, ID 100003236744987) possui uma restrição ativa aplicada em 11 de julho de 2026 por violação dos Padrões da Comunidade."',
      color: 'DC2626',
      fill: 'FEF2F2',
    },
    {
      num: 'Declaração Oficial II — Recusa Expressa de Revisão e Ausência de Acesso a Atendente Humano',
      quote:
        '"No momento, não tenho ferramentas disponíveis para remover essa restrição de perfil manualmente ou encaminhar para uma análise humana direta, pois o sistema de suporte automatizado identificou que o perfil não atende aos critérios atuais para essa escalada específica."',
      color: 'DC2626',
      fill: 'FEF2F2',
    },
    {
      num: 'Declaração Oficial III — Regra Oculta de Limite Vitalício de Portfólios',
      quote:
        '"cada perfil possui um limite vitalício de criação de dois portfólios de negócios. A exclusão de portfólios antigos não libera esse limite, pois o sistema contabiliza o total histórico de criações."',
      color: 'D97706',
      fill: 'FFFBEB',
    },
    {
      num: 'Declaração Oficial IV — Resumo Técnico de Encerramento Registrado no Suporte',
      quote:
        '"Data da restrição: 11 de julho de 2026. Motivo: Descumprimento dos Padrões da Comunidade. Status atual: A conta permanece restrita e os sistemas automáticos direcionam a resolução para as ferramentas de autoatendimento."',
      color: '334155',
      fill: 'F8FAFC',
    },
  ]

  for (const c of confessions) {
    children.push(
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [9026],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 9026, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: c.fill },
                margins: { top: 100, bottom: 100, left: 160, right: 140 },
                borders: {
                  top: borderNone,
                  bottom: borderNone,
                  left: { style: BorderStyle.SINGLE, size: 16, color: c.color },
                  right: borderNone,
                },
                children: [
                  new Paragraph({
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: c.num.toUpperCase(),
                        font: FONT_SANS,
                        size: 18,
                        bold: true,
                        color: c.color,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.BOTH,
                    spacing: { line: 360 },
                    children: [
                      new TextRun({
                        text: c.quote,
                        font: FONT_SERIF,
                        size: 24, // 12pt
                        italics: true,
                        bold: true,
                        color: '0F172A',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 120 } }),
    )
  }

  // ==========================================
  // SEÇÃO 3: CRONOLOGIA DAS TENTATIVAS (TABELA)
  // ==========================================
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: '3. Cronologia das Tentativas e Falhas Sistêmicas (23/09/2026)',
          font: FONT_SERIF,
          size: 28,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: 140, line: 360 },
      children: [
        new TextRun({
          text: 'Relação exaustiva dos procedimentos técnicos executados pelo usuário para restabelecer a integração e acessar a revisão prometida, todos infrutíferos em decorrência de bugs e bloqueios de infraestrutura da própria Meta:',
          font: FONT_SERIF,
          size: 24,
        }),
      ],
    }),
  )

  const tableHeaderCell = (text: string, widthDxa: number) =>
    new TableCell({
      width: { size: widthDxa, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: '0F172A' },
      margins: { top: 120, bottom: 120, left: 100, right: 100 },
      borders: { top: borderNavy, bottom: borderNavy, left: borderNavy, right: borderNavy },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: text.toUpperCase(),
              font: FONT_SANS,
              size: 18,
              bold: true,
              color: 'FFFFFF',
            }),
          ],
        }),
      ],
    })

  const timelineRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        tableHeaderCell('Horário', 1400),
        tableHeaderCell('Tentativa / Procedimento Técnico', 4300),
        tableHeaderCell('Resultado Obtido / Resposta da Plataforma', 3326),
      ],
    }),
  ]

  TIMELINE_EVENTS.forEach((evt, idx) => {
    const bg = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC'
    timelineRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1400, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: bg },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: evt.time,
                    font: FONT_SANS,
                    size: 20,
                    bold: true,
                    color: '0F172A',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4300, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: bg },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
            children: [
              new Paragraph({
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: evt.action,
                    font: FONT_SERIF,
                    size: 22,
                    bold: true,
                    color: '0F172A',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: evt.details,
                    font: FONT_SERIF,
                    size: 20,
                    color: '475569',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3326, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: bg },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: evt.result,
                    font: FONT_SERIF,
                    size: 21,
                    bold: true,
                    color: 'B91C1C',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    )
  })

  children.push(
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [1400, 4300, 3326],
      rows: timelineRows,
    }),
    new Paragraph({ spacing: { after: 120 } }),
  )

  // Contradição Probatória
  children.push(
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [9026],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9026, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: '0F172A' },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              borders: { top: borderNavy, bottom: borderNavy, left: borderNavy, right: borderNavy },
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: 'CONTRADIÇÃO PROBATÓRIA ESSENCIAL',
                      font: FONT_SANS,
                      size: 19,
                      bold: true,
                      color: 'FBBF24', // amber-400
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.BOTH,
                  spacing: { line: 360 },
                  children: [
                    new TextRun({
                      text: 'Durante todo o período fiscalizado, os painéis oficiais "Seus alertas" (perfil de usuário) e o "Suporte para Empresas / Qualidade da Conta" exibiram textualmente o status "Nenhuma violação" / "No advertising issues". Há divergência explícita e culposa entre o sistema sancionador interno da ré e o painel fornecido ao consumidor, gerando insegurança jurídica e impedindo o exercício da ampla defesa.',
                      font: FONT_SERIF,
                      size: 22,
                      color: 'FFFFFF',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } }),
  )

  // ==========================================
  // SEÇÃO 4: TRANSCRIÇÃO ÍNTEGRA DO CHAT (12 MENSAGENS)
  // ==========================================
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: '4. Transcrição Fidedigna das Comunicações Oficiais (Chat Meta — 23/09/2026)',
          font: FONT_SERIF,
          size: 28,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: 140, line: 360 },
      children: [
        new TextRun({
          text: 'Registro cronológico das 12 mensagens trocadas no canal oficial de suporte empresarial (Protocolo #1589293502887786), comprovando os avisos de litígio emitidos pelo requerente e as negativas de solução fornecidas pela Meta:',
          font: FONT_SERIF,
          size: 24,
        }),
      ],
    }),
  )

  CHAT_TRANSCRIPT.forEach((msg, idx) => {
    let headerColor = '1D4ED8' // blue-700
    let fill = 'FFFFFF'
    let borderSideColor = '2563EB'

    if (msg.variant === 'confession') {
      headerColor = 'B91C1C'
      fill = 'FEF2F2'
      borderSideColor = 'DC2626'
    } else if (msg.variant === 'warning') {
      headerColor = 'B45309'
      fill = 'FFFBEB'
      borderSideColor = 'D97706'
    } else if (msg.variant === 'conclusion') {
      headerColor = '10B981'
      fill = '0F172A'
      borderSideColor = '059669'
    } else if (msg.variant === 'meta') {
      headerColor = '475569'
      fill = 'F1F5F9'
      borderSideColor = '64748B'
    }

    const isConclusionDark = msg.variant === 'conclusion'

    // Quebrar conteúdo em parágrafos se contiver \n\n
    const bodyParagraphs = msg.content.split('\n\n').map(
      (textBlock) =>
        new Paragraph({
          alignment: AlignmentType.BOTH,
          spacing: { after: 40, line: 360 },
          children: [
            new TextRun({
              text: textBlock,
              font: FONT_SERIF,
              size: 23,
              italics: msg.variant === 'meta' || msg.variant === 'confession',
              bold: msg.variant === 'confession',
              color: isConclusionDark ? 'E2E8F0' : '0F172A',
            }),
          ],
        }),
    )

    children.push(
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [9026],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 9026, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill },
                margins: { top: 80, bottom: 80, left: 140, right: 140 },
                borders: {
                  top: borderThin,
                  bottom: borderThin,
                  left: { style: BorderStyle.SINGLE, size: 16, color: borderSideColor },
                  right: borderThin,
                },
                children: [
                  new Paragraph({
                    spacing: { after: 50 },
                    children: [
                      new TextRun({
                        text: `Mensagem ${idx + 1} — ${msg.author}`,
                        font: FONT_SANS,
                        size: 19,
                        bold: true,
                        color: headerColor,
                      }),
                      new TextRun({
                        text: `  |  Horário: ${msg.time}`,
                        font: FONT_SANS,
                        size: 17,
                        color: isConclusionDark ? '94A3B8' : '64748B',
                      }),
                    ],
                  }),
                  ...bodyParagraphs,
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 100 } }),
    )
  })

  // ==========================================
  // SEÇÃO 5: ACERVO PROBATÓRIO (18 PRINTS)
  // ==========================================
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: '5. Acervo Probatório Documental (Capturas de Tela em Ordem Cronológica)',
          font: FONT_SERIF,
          size: 28,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: 140, line: 360 },
      children: [
        new TextRun({
          text: 'Capturas de tela originais obtidas em 23/09/2026, registradas em tempo real durante a execução dos testes técnicos e o atendimento oficial, comprovando todas as falhas sistêmicas e negativas emitidas:',
          font: FONT_SERIF,
          size: 24,
        }),
      ],
    }),
  )

  downloadedImages.forEach(({ buffer, item }, index) => {
    const docNumber = String(index + 1).padStart(2, '0')
    const fullUrl = `${ATTACHMENT_BASE_URL}${item.filename}`

    const cellElements: Paragraph[] = [
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: `Doc. #${docNumber} — ${item.title}`,
            font: FONT_SANS,
            size: 21,
            bold: true,
            color: '0F172A',
          }),
          new TextRun({
            text: `  |  ${item.time}`,
            font: FONT_SANS,
            size: 17,
            color: '64748B',
          }),
        ],
      }),
    ]

    // Se imagem baixada com sucesso, embutir via ImageRun
    if (buffer && buffer.length > 0) {
      cellElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [
            new ImageRun({
              type: 'jpg',
              data: buffer,
              transformation: {
                width: 480, // Largura ideal para caber com folga em A4 (máx 520pt)
                height: 360,
              },
            }),
          ],
        }),
      )
    } else {
      // Fallback elegante caso fetch falhe
      cellElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [
            new TextRun({
              text: `[Imagem anexada nos autos: ${item.filename}]`,
              font: FONT_SANS,
              size: 20,
              bold: true,
              color: 'B91C1C',
            }),
          ],
        }),
      )
    }

    cellElements.push(
      new Paragraph({
        alignment: AlignmentType.BOTH,
        spacing: { before: 40, after: 30, line: 360 },
        children: [
          new TextRun({
            text: 'Observação probatória: ',
            font: FONT_SERIF,
            size: 21,
            bold: true,
            color: '1E293B',
          }),
          new TextRun({
            text: item.description,
            font: FONT_SERIF,
            size: 21,
            color: '334155',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: `Arquivo fonte: ${item.filename}  |  URL: ${fullUrl}`,
            font: FONT_SANS,
            size: 15,
            color: '94A3B8',
          }),
        ],
      }),
    )

    children.push(
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [9026],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 9026, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: 'FAFAFA' },
                margins: { top: 120, bottom: 120, left: 160, right: 160 },
                borders: {
                  top: borderThin,
                  bottom: borderThin,
                  left: borderNavy,
                  right: borderThin,
                },
                children: cellElements,
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 140 } }),
    )
  })

  // ==========================================
  // SEÇÃO 6: CONCLUSÃO, CHECKLIST E ASSINATURA
  // ==========================================
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: '6. Conclusão Técnica e Esgotamento das Vias Extrajudiciais',
          font: FONT_SERIF,
          size: 28,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { after: 140, line: 360 },
      children: [
        new TextRun({
          text: 'Diante dos elementos fáticos e probatórios coligidos, resta incontroversa a recusa de atendimento, o cerceamento de defesa e a falha na prestação do serviço por parte da Meta Platforms, incidindo as seguintes constatações:',
          font: FONT_SERIF,
          size: 24,
        }),
      ],
    }),
  )

  const checklistItems = [
    {
      title: 'Suporte Oficial Direto',
      desc: 'Recusa expressa de intervenção manual e encerramento automatizado do protocolo #1589293502887786.',
    },
    {
      title: 'Autoatendimento Indicado',
      desc: 'Páginas quebradas (erro 404 / broken link) ou bloqueadas ao próprio titular autenticado.',
    },
    {
      title: 'Painéis de Transparência',
      desc: 'Informam indevidamente "Nenhuma violação", privando o consumidor de motivação específica.',
    },
    {
      title: 'Revisão Humana',
      desc: 'Declarada indisponível pelos próprios sistemas da provedora por ausência de critérios automatizados.',
    },
  ]

  const checklistCells: TableCell[] = checklistItems.map(
    (chk) =>
      new TableCell({
        width: { size: 4513, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'FEF2F2' },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        borders: {
          top: borderThin,
          bottom: borderThin,
          left: { style: BorderStyle.SINGLE, size: 12, color: 'DC2626' },
          right: borderThin,
        },
        children: [
          new Paragraph({
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: `[X] ${chk.title}: `,
                font: FONT_SANS,
                size: 20,
                bold: true,
                color: '991B1B',
              }),
              new TextRun({
                text: chk.desc,
                font: FONT_SERIF,
                size: 21,
                color: '450A0A',
              }),
            ],
          }),
        ],
      }),
  )

  children.push(
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [4513, 4513],
      rows: [
        new TableRow({ children: [checklistCells[0], checklistCells[1]] }),
        new TableRow({ children: [checklistCells[2], checklistCells[3]] }),
      ],
    }),
    new Paragraph({ spacing: { after: 140 } }),
  )

  // Notificação Formal e Prazo de 48 Horas
  children.push(
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [9026],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9026, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
              margins: { top: 140, bottom: 140, left: 160, right: 160 },
              borders: {
                top: borderNavy,
                bottom: borderNavy,
                left: borderNavy,
                right: borderNavy,
              },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: 'NOTIFICAÇÃO FORMAL E PRAZO DILATÓRIO DE 48 HORAS',
                      font: FONT_SANS,
                      size: 20,
                      bold: true,
                      color: '0F172A',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.BOTH,
                  spacing: { line: 360 },
                  children: [
                    new TextRun({
                      text: 'O titular concedeu à Meta Platforms o prazo improrrogável de 48 (quarenta e oito) horas, contado a partir da interação de 23/09/2026, para o restabelecimento administrativo pleno dos ativos e liberação do vínculo entre a conta de Instagram @mauro.brfimoveis e a Página oficial BRF Imóveis (ID 1219427617930954). Transcorrido o período assinalado sem o saneamento dos ilícitos e bugs sistêmicos relatados, este instrumento instrui a competente ',
                      font: FONT_SERIF,
                      size: 22,
                      color: '1E293B',
                    }),
                    new TextRun({
                      text: 'Ação de Obrigação de Fazer cumulada com Indenização por Perdas e Danos e Lucros Cessantes',
                      font: FONT_SERIF,
                      size: 22,
                      bold: true,
                      color: '0F172A',
                    }),
                    new TextRun({
                      text: ', em razão do prejuízo econômico e da impossibilidade de gerir campanhas e atendimento de vendas imobiliárias.',
                      font: FONT_SERIF,
                      size: 22,
                      color: '1E293B',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 240 } }),
  )

  // Área de Assinatura Formal
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: 'DECLARAÇÃO DE VERACIDADE E RATIFICAÇÃO DAS PROVAS',
          font: FONT_SANS,
          size: 19,
          bold: true,
          color: '475569',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 40 },
      children: [
        new TextRun({
          text: '____________________________________________________________',
          font: FONT_SERIF,
          size: 24,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: 'MAURO FENGLER',
          font: FONT_SERIF,
          size: 24,
          bold: true,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: 'Titular Requerente / BRF Imóveis',
          font: FONT_SERIF,
          size: 20,
          color: '475569',
        }),
      ],
    }),
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [4513, 4513],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4513, type: WidthType.DXA },
              borders: { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'CPF do Titular:  ___ . ___ . ___ - __',
                      font: FONT_SERIF,
                      size: 22,
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 4513, type: WidthType.DXA },
              borders: { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: 'Data de Assinatura:  23 / 09 / 2026',
                      font: FONT_SERIF,
                      size: 22,
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 180 } }),
  )

  // Criar o Documento DOCX
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_SERIF,
            size: 24, // 12pt padrão
            color: '0F172A',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 largura DXA
              height: 16838, // A4 altura DXA
            },
            margin: {
              top: 1440, // 1 polegada (2.54 cm)
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Dossiê Jurídico BRF Imóveis — Caso Meta #1589293502887786',
                    font: FONT_SANS,
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Dossiê Jurídico — Página ',
                    font: FONT_SANS,
                    size: 18,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_SANS,
                    size: 18,
                    bold: true,
                    color: '0F172A',
                  }),
                  new TextRun({
                    text: ' de ',
                    font: FONT_SANS,
                    size: 18,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT_SANS,
                    size: 18,
                    bold: true,
                    color: '0F172A',
                  }),
                  new TextRun({
                    text: '  |  Documento probatório gerado pelo CRM BRF Imóveis',
                    font: FONT_SANS,
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  return blob
}

export async function downloadDossieDocx(
  prints: PrintItemDocx[],
  onProgress?: ProgressCallback,
): Promise<void> {
  const blob = await generateDossieDocx(prints, onProgress)
  const filename = 'Dossie-Juridico-BRF-Imoveis-Protocolo-1589293502887786.docx'
  saveAs(blob, filename)
}
