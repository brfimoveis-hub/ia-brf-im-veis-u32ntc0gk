// Textos EXATOS das 4 cartas para a Meta. Só os campos entre {chaves} são substituídos.
// Não parafrasear: qualquer alteração de texto deve ser pedida explicitamente pelo Mauro.

export type CampoCarta =
  | 'dataCarta'
  | 'linkBernadete'
  | 'linkMauro'
  | 'idMauro'
  | 'cpfMauro'
  | 'enderecoMauro'
  | 'telefoneMauro'

export type CamposValores = Record<CampoCarta, string>

// Dados FIXOS e institucionais da empresa em papel timbrado oficial (idênticos em todas as cartas)
export const DADOS_EMPRESA_TIMBRE = {
  nomeCnpj: 'BRF IMÓVEIS LTDA – CNPJ: 22.886.297/0001-77',
  endereco:
    'Rua José Cândido da Silva, 118/602 – Balneário – Estreito, Florianópolis SC – CEP 88.075-250',
  telefones: 'TELEFONES: (48) 99972.8012 (TIM) – (48) 99972.8050 (TIM) WhatsApp',
  contatos: 'EMAIL: brfimoveis@gmail.com – SITE: www.brfimoveis.com.br – CRECI: 6838',
  // Versão resumida do rodapé ABNT
  rodapeLinha1:
    'BRF IMÓVEIS LTDA – CNPJ 22.886.297/0001-77 / Rua José Cândido da Silva, 118/602 – Balneário – Estreito, Florianópolis SC – CEP 88.075-250',
  rodapeLinha2:
    '(48) 99972.8012 – (48) 99972.8050 WhatsApp / brfimoveis@gmail.com – www.brfimoveis.com.br – CRECI 6838',
}

export const CAMPOS_CARTA: {
  key: CampoCarta
  label: string
  placeholder: string
  type?: 'number' | 'text' | 'date'
  helpText?: string
}[] = [
  {
    key: 'dataCarta',
    label: 'Data da carta (hoje ou outra data)',
    placeholder: 'YYYY-MM-DD',
    type: 'date',
    helpText: 'Preenchida automaticamente com hoje. Usada em formato PT e EN em todas as 4 cartas.',
  },
  {
    key: 'linkBernadete',
    label: 'Link do perfil do Facebook da Bernadete',
    placeholder: 'https://www.facebook.com/...',
  },
  {
    key: 'linkMauro',
    label: 'Link do perfil do Facebook do Mauro',
    placeholder: 'https://www.facebook.com/...',
  },
  { key: 'idMauro', label: 'ID do usuário Facebook do Mauro', placeholder: 'número do ID' },
  { key: 'cpfMauro', label: 'CPF do Mauro', placeholder: '000.000.000-00' },
  {
    key: 'enderecoMauro',
    label: 'Endereço pessoal do Mauro',
    placeholder: 'Rua, número, complemento, bairro, cidade - UF, CEP',
  },
  { key: 'telefoneMauro', label: 'Telefone pessoal do Mauro', placeholder: '(48) 90000-0000' },
]

// Texto mostrado no lugar do campo vazio, entre colchetes.
export const PLACEHOLDER_CAMPO: Record<string, string> = {
  dataCarta: 'data da carta',
  dataPt: 'data por extenso (PT)',
  dataEn: 'data por extenso (EN)',
  linkBernadete: 'link do perfil da Bernadete',
  linkMauro: 'link do perfil do Mauro',
  idMauro: 'ID do Facebook do Mauro',
  cpfMauro: 'CPF do Mauro',
  enderecoMauro: 'endereço pessoal do Mauro',
  telefoneMauro: 'telefone pessoal do Mauro',
}

export const MESES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

export const MESES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export function formatarDataHojeIso(): string {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function parseDataCarta(valor?: string): { dia: number; mes: number; ano: number } {
  if (valor && typeof valor === 'string') {
    const trimmed = valor.trim()
    // Aceita YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (isoMatch) {
      const a = parseInt(isoMatch[1], 10)
      const m = parseInt(isoMatch[2], 10)
      const d = parseInt(isoMatch[3], 10)
      if (a >= 1900 && a <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return { ano: a, mes: m, dia: d }
      }
    }
    // Aceita DD/MM/YYYY
    const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (brMatch) {
      const d = parseInt(brMatch[1], 10)
      const m = parseInt(brMatch[2], 10)
      const a = parseInt(brMatch[3], 10)
      if (a >= 1900 && a <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return { ano: a, mes: m, dia: d }
      }
    }
  }

  // Padrão sempre HOJE (não congelado)
  const agora = new Date()
  return {
    dia: agora.getDate(),
    mes: agora.getMonth() + 1,
    ano: agora.getFullYear(),
  }
}

export function formatarDataPt(valor?: string): string {
  const { dia, mes, ano } = parseDataCarta(valor)
  const nomeMes = MESES_PT[mes - 1] || 'novembro'
  return `Florianópolis, ${dia} de ${nomeMes} de ${ano}`
}

export function formatarDataEn(valor?: string): string {
  const { dia, mes, ano } = parseDataCarta(valor)
  const nomeMes = MESES_EN[mes - 1] || 'November'
  return `Florianópolis, ${nomeMes} ${dia}, ${ano}`
}

export type CartaMeta = {
  id: string
  titulo: string
  cabecalho: string[]
  corpo: string
}

const CABECALHO_PADRAO = [
  DADOS_EMPRESA_TIMBRE.nomeCnpj,
  DADOS_EMPRESA_TIMBRE.endereco,
  DADOS_EMPRESA_TIMBRE.telefones,
  DADOS_EMPRESA_TIMBRE.contatos,
]

export const CARTAS_META: CartaMeta[] = [
  {
    id: 'bernadete-pt',
    titulo: 'Carta 1 — Bernadete (português)',
    cabecalho: CABECALHO_PADRAO,
    corpo: `{dataPt}

À Meta Platforms, Inc.

Por meio deste documento, solicito a titularidade da conta do Gerenciador de Negócios denominada BRF Imóveis 1: 3016760162334990.

A conta era administrada por Mauro Fengler, sócio-administrador da empresa, cujo perfil pessoal do Facebook encontra-se restringido pela Meta desde 11/07/2026 sem violação alguma — fato já confirmado pelo próprio suporte da Meta (caso #1589293502887786). Em razão dessa restrição, a empresa perdeu o acesso administrativo à conta, o que paralisa sua operação comercial.

Sou sócia-administradora da BRFIMOVEIS LTDA, com poderes de administração isolada (2ª Alteração Contratual, Cláusula 8ª, JUCESC Req 81600003808700, anexa). Diante do impedimento do sócio administrador — impedimento este causado pela restrição em reavaliação —, solicito a concessão da titularidade/acesso pleno à conta em meu nome, em representação à BRFIMOVEIS LTDA.

Este pedido articula-se com o caso 1858824151939213 (disputa de administração da Página BRF Imóveis 1219427617930954), do qual este documento também faz parte.

Seguem meus dados:

URL do perfil do Facebook: {linkBernadete}
Endereço de e-mail: bernadeterhoden@yahoo.com.br

Declaro que as informações prestadas são verdadeiras e precisas.

Atenciosamente,

_______________________________
Bernadete Rhoden Fengler
Sócia-Administradora com administração isolada, BRFIMOVEIS LTDA
(assinatura à mão)`,
  },
  {
    id: 'bernadete-en',
    titulo: 'Carta 2 — Bernadete (inglês)',
    cabecalho: CABECALHO_PADRAO,
    corpo: `{dataEn}

Dear Meta,

By means of this document, I would like to request ownership of the Business Manager account named BRF Imóveis 1: 3016760162334990.

This account was administered by Mauro Fengler, managing partner of the company, whose personal Facebook profile has been restricted by Meta since July 11, 2026, with no violation whatsoever — a fact already confirmed by Meta's own support (case #1589293502887786). Because of that restriction, the company lost administrative access to the account, paralyzing its commercial operation.

I am a managing partner of BRFIMOVEIS LTDA, with sole administration powers (Second Contract Amendment, Clause 8, JUCESC Req 81600003808700, attached). Given the managing partner's impediment — an impediment caused by the restriction currently under reassessment — I hereby request full ownership/access to the account in my name, on behalf of BRFIMOVEIS LTDA.

This request is coordinated with case 1858824151939213 (Page administration dispute for BRF Imóveis 1219427617930954), of which this document is also part.

Below are my details:

Facebook profile URL: {linkBernadete}
Email address: bernadeterhoden@yahoo.com.br

I declare that the information provided is true and accurate.

Sincerely,

_______________________________
Bernadete Rhoden Fengler
Managing Partner with sole administration powers, BRFIMOVEIS LTDA
(handwritten signature)`,
  },
  {
    id: 'mauro-pt',
    titulo: 'Carta 3 — Mauro (português)',
    cabecalho: CABECALHO_PADRAO,
    corpo: `{dataPt}

À META PLATFORMS, INC. — Equipe de Revisão de Contas / Status da Conta

Assunto: Reavaliação da restrição do perfil — caso #1589293502887786 — ausência de violação confirmada pela própria Meta

Prezados,

1. QUEM SOU

Sou Mauro Fengler, sócio-administrador da BRFIMOVEIS LTDA (CNPJ 22.886.297/0001-77), residente e domiciliado em {enderecoMauro}, telefone pessoal {telefoneMauro}, titular do CPF nº {cpfMauro}, com perfil de Facebook {linkMauro} (ID do usuário: {idMauro}), imobiliária com atuação em Florianópolis e região, operando no digital através de:
- Página oficial: BRF Imóveis (ID 1219427617930954);
- Instagram comercial: @brf_imoveis_ e perfil mauro.brfimoveis (com Threads);
- Portfólio BRF Imóveis 1 (ID 3016760162334990);
- Conta de anúncios: 591782427512215;
- WhatsApp Business via API oficial, número +55 48 99209-8050, conectado à Página acima.

2. O QUE ACONTECEU

Em 11/07/2026 meu perfil pessoal de Facebook passou a exibir uma restrição sob a alegação de violação de padrões de comunidade.

Esta alegação é factualmente improcedente. Mais que isso: ao longo destes quase 4 meses, os canais de suporte da própria Meta verificaram minha conta e CONFIRMARAM QUE NÃO HOUVE NENHUMA VIOLAÇÃO — sem, contudo, reverter a restrição. Registro, a título de prova:
- No atendimento de suporte em 29/09/2026, o atendente confirmou que minha conta não registra violação e orientou a solicitação de análise pelo Status da Conta — o que fiz na sequência;
- Na Central de Qualidade da Conta, não consta nenhuma violação, nenhum conteúdo removido e nenhum aviso associado à restrição — ela aparece "órfã", sem motivo identificável;
- O robô de verificação da Meta AI, consultado em 02/11/2026, também respondeu que minha conta "não possui restrição" — contradição direta com o estado real do perfil.

Em resumo: a restrição existe, mas a própria infraestrutura da Meta, em todas as verificações possíveis, não localiza nenhuma infração que a justifique.

3. CRONOLOGIA COMPLETA DO CASO

11/07/2026 — A restrição aparece no meu perfil, sem violação associada visível na Central de Qualidade da Conta.
11/07/2026 a 02/11/2026 — Reiteradas tentativas de contato pelos canais oficiais (Suporte, Central de Ajuda, Central de Qualidade da Conta), registradas no caso #1589293502887786.
08/10/2026 — Abertura de reclamação no consumidor.gov.br (plataforma oficial do Governo Federal), por suspensão indevida, diante da inércia dos canais internos.
29/09/2026 — Atendente de suporte confirma por escrito que não há violação na conta e orienta a análise pelo Status da Conta — solicitada e sem resposta efetiva.
02/11/2026 — Novo atendimento de suporte; abertura do caso 1858824151939213 para disputa formal de administração da Página da empresa, cuja conclusão está impedida, tecnicamente, pela restrição do meu perfil.

4. OS DANOS CONCRETOS QUE A RESTRIÇÃO PROVOCA

A restrição do meu perfil, mesmo sem qualquer violação confirmada, está bloqueando a operação comercial da empresa em pelo menos três frentes:

4.1. Acesso administrativo à Página oficial da empresa (1219427617930954): sem meu perfil pleno, a transição de administração para a sócia Bernadete Rhoden Fengler está travada — a Página permanece presa a um acesso não gerenciável, e a imobiliária não consegue assumir o controle de seu próprio ativo oficial. Paralelamente, minha co-administradora Bernadete Rhoden Fengler formula pedido de titularidade/acesso pleno ao Gerenciador de Negócios BRF Imóveis 1 (3016760162334990), no caso 1858824151939213 — pedido este que existe PRECISAMENTE porque meu perfil está restringido. A liberação do meu perfil e a concessão de acesso a ela resolvem o mesmo problema por duas vias legítimas e não são excludentes.

4.2. Vinculação Instagram ↔ Página: a conexão oficial entre @brf_imoveis_ e a Página, exigida para o atendimento de mensagens comerciais pelo Instagram, não pode ser concluída — a única conta com permissão para finalizar é a minha, restringida. Resultado: clientes que nos chamam no Instagram não recebem resposta automática, leads perdidos todos os dias.

4.3. Operação de atendimento via WhatsApp API (número +55 48 99209-8050): o número está conectado à Página oficial e à restrição pendente, reduzindo a confiança operacional do canal comercial principal da empresa.

Do ponto de vista comercial: a empresa investe em captação de leads no Facebook e Instagram, atende clientes por WhatsApp e Instagram e vive exclusivamente desse fluxo. Cada dia de restrição sem causa identificada é um dia de leads não atendidos — e nenhum atendimento da Meta, em 4 meses, apresentou uma única prova do suposto desvio.

5. O QUE SOLICITO

1. A REAVALIAÇÃO COMPLETA da restrição do meu perfil, por equipe humana, com decisão fundamentada;
2. A REVOGAÇÃO IMEDIATA da restrição, uma vez que a própria Meta confirmou a ausência de violação;
3. Caso exista algum motivo concreto, que seja APRESENTADO, com conteúdo, data e critério — até hoje nada foi exibido;
4. A liberação do meu perfil para concluir os vínculos pendentes da empresa (administração da Página 1219427617930954 e vinculação do Instagram @brf_imoveis_), conforme processo em paralelo no caso 1858824151939213.

6. DOCUMENTOS ANEXOS (10)

1. CNH de Mauro Fengler (identificação do requerente);
2. CNH de Bernadete Rhoden Fengler (co-sócia);
3. 2ª Alteração Contratual da BRFIMOVEIS LTDA — JUCESC Req 81600003808700 — Cláusula 8ª: administração isolada por Bernadete Rhoden Fengler e Mauro Fengler;
4. Certidão Simplificada da Receita Federal — CNPJ 22.886.297/0001-77;
5. Print do Registro.br — domínio brfimoveis.com.br, Publicado até 18/03/2027 (titularidade do domínio oficial);
6. Print do Gerenciador de Negócios — intermitência do acesso ao portfólio BRF Imóveis 1 (3016760162334990);
7. Print do seletor de ativos do Suporte (02/11/2026) — a Página oficial 1219427617930954 não aparece nem dentro do próprio fluxo de suporte;
8. Print do atendimento de suporte de 02/11/2026 — o suporte confirma por escrito que a conta da Bernadete não aparece vinculada à Página nem ao portfólio;
9. Print do Status da Conta / Central de Qualidade — restrição sem violação associada;
10. Registro da reclamação no consumidor.gov.br (08/10/2026).

7. COMPROMISSO

Declaro que as informações acima são verdadeiras e que estou disposto a me submeter a qualquer verificação de identidade adicional (videochamada, documentos reconhecidos, verificação por gestos), bem como a assinar termo de responsabilidade que a Meta considere necessário.

Solicito ainda que qualquer decisão desta reavaliação seja comunicada por escrito, indicando o caminho para acompanhar.

Atenciosamente,

_______________________________
Mauro Fengler
Sócio-administrador — BRFIMOVEIS LTDA
CPF: {cpfMauro}`,
  },
  {
    id: 'mauro-en',
    titulo: 'Carta 4 — Mauro (inglês)',
    cabecalho: CABECALHO_PADRAO,
    corpo: `{dataEn}

TO META PLATFORMS, INC. — Account Review Team / Account Status

Subject: Reassessment of profile restriction — case #1589293502887786 — absence of any violation confirmed by Meta itself

Dear Meta team,

1. WHO I AM

I am Mauro Fengler, managing partner of BRFIMOVEIS LTDA (CNPJ 22.886.297/0001-77), residing at {enderecoMauro}, personal phone {telefoneMauro}, CPF {cpfMauro}, Facebook profile {linkMauro} (User ID: {idMauro}), a real estate agency operating in Florianópolis and region, with its digital operation running on:
- Official Page: BRF Imóveis (ID 1219427617930954);
- Business Instagram: @brf_imoveis_ and profile mauro.brfimoveis (with Threads);
- Business portfolio BRF Imóveis 1 (ID 3016760162334990);
- Ad account: 591782427512215;
- WhatsApp Business via official API, number +55 48 99209-8050, connected to the Page above.

2. WHAT HAPPENED

On July 11, 2026 my personal Facebook profile began displaying a restriction on the grounds of an alleged violation of Community Standards.

This allegation is factually unfounded. More than that: over these nearly 4 months, Meta's own support channels checked my account and CONFIRMED THAT NO VIOLATION TOOK PLACE — yet the restriction was never lifted. For the record:
- In a support interaction on September 29, 2026, the agent confirmed that my account shows no violation and instructed me to request a review through Account Status — which I did immediately;
- In the Account Quality Center, there is no violation, no removed content and no notice associated with the restriction — it appears "orphaned", with no identifiable cause;
- Meta AI's verification bot, queried on November 2, 2026, also stated that my account "has no restriction" — a direct contradiction of the actual state of the profile.

In short: the restriction exists, but Meta's own infrastructure, in every check possible, cannot locate any infraction that would justify it.

3. FULL TIMELINE OF THE CASE

July 11, 2026 — The restriction appears on my profile, with no associated violation visible in the Account Quality Center.
July 11 to November 2, 2026 — Repeated contact attempts through official channels (Support, Help Center, Account Quality Center), logged under case #1589293502887786.
October 8, 2026 — Complaint filed on consumidor.gov.br (the official Brazilian government consumer platform) for undue suspension, given the inertia of internal channels.
September 29, 2026 — Support agent confirms in writing that there is no violation on the account and instructs an Account Status review — requested, with no effective response.
November 2, 2026 — New support interaction; case 1858824151939213 is opened for the formal Page-ownership dispute of the company's official Page, whose conclusion is technically blocked by my profile restriction.

4. THE CONCRETE DAMAGE CAUSED BY THE RESTRICTION

The restriction on my profile, with no confirmed violation, is blocking the company's commercial operation on at least three fronts:

4.1. Administrative access to the company's official Page (1219427617930954): without my profile being fully functional, the handover of administration to my partner Bernadete Rhoden Fengler is stuck — the Page remains locked to an unmanageable access, and the agency cannot take control of its own official asset. In parallel, my co-managing partner Bernadete Rhoden Fengler is filing a request for full ownership/access to Business Manager BRF Imóveis 1 (3016760162334990), under case 1858824151939213 — a request that exists PRECISELY because my profile is restricted. Releasing my profile and granting her access solve the same problem through two legitimate avenues and are not mutually exclusive.

4.2. Instagram ↔ Page linking: the official connection between @brf_imoveis_ and the Page, required for commercial message handling on Instagram, cannot be completed — the only account with permission to finish it is mine, currently restricted. Result: customers who message us on Instagram get no reply, and leads are lost every single day.

4.3. WhatsApp API operation (number +55 48 99209-8050): the number is connected to the official Page and to the pending restriction, undermining the reliability of the company's main commercial channel.

From a business standpoint: the company invests in Facebook and Instagram lead generation, serves customers through WhatsApp and Instagram, and lives entirely off this flow. Every day of restriction with no identified cause is a day of leads left unanswered — and in 4 months, not a single Meta interaction has produced any evidence of the alleged misconduct.

5. WHAT I AM REQUESTING

1. A FULL REASSESSMENT of my profile restriction, by a human team, with a reasoned decision;
2. THE IMMEDIATE REMOVAL of the restriction, since Meta itself has confirmed no violation took place;
3. Should any concrete reason exist, that it be PRESENTED — with content, date and criterion. To date, nothing has been shown;
4. The release of my profile so the company's pending links can be completed (administration of Page 1219427617930954 and linking of Instagram @brf_imoveis_), as handled in parallel under case 1858824151939213.

6. ATTACHED DOCUMENTS (10)

1. Driver's license of Mauro Fengler (requester's ID);
2. Driver's license of Bernadete Rhoden Fengler (co-partner);
3. Second Contract Amendment of BRFIMOVEIS LTDA — JUCESC Req 81600003808700 — Clause 8: sole administration by Bernadete Rhoden Fengler and Mauro Fengler;
4. Simplified Certificate issued by the Brazilian Federal Revenue Service — CNPJ 22.886.297/0001-77;
5. Registro.br screenshot — domain brfimoveis.com.br, published until March 18, 2027 (ownership of the official domain);
6. Business Manager screenshot — intermittent access to portfolio BRF Imóveis 1 (3016760162334990);
7. Support asset-selector screenshot (November 2, 2026) — the official Page 1219427617930954 does not appear even inside the support flow itself;
8. Support transcript screenshot (November 2, 2026) — support confirms in writing that Bernadete's account does not appear linked to the Page or the portfolio;
9. Account Status / Account Quality screenshot — restriction with no associated violation;
10. Record of the complaint filed on consumidor.gov.br (October 8, 2026).

7. COMMITMENT

I declare that the information above is true, and I am willing to undergo any additional identity verification (video call, notarized documents, gesture verification), as well as to sign any responsibility terms Meta may require.

I also kindly request that any decision on this reassessment be communicated in writing, indicating how to follow up.

Sincerely,

_______________________________
Mauro Fengler
Managing Partner — BRFIMOVEIS LTDA
CPF: {cpfMauro}`,
  },
]
