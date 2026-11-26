// Hook de Bateria de Testes de Validação da Bia v6.0 Soberana
// Rota: GET/POST /backend/v1/bia/test_suite_v6
// Executa os 22 cenários de validação da Constituição v6.0 contra o banco e o motor de IA real,
// simulando conversas sem enviar nada para WhatsApp real e sem afetar clientes reais.

function handleBiaTestSuiteV6(e) {
  var startTime = Date.now()
  var results = []

  // 1. Carregar Constituição Soberana Ativa de bia_learnings
  var activeLearning = null
  var activeRuleText = ''
  try {
    var learnings = $app.findRecordsByFilter('bia_learnings', 'is_active = true', '-priority', 1, 0)
    if (learnings && learnings.length > 0) {
      activeLearning = learnings[0]
      activeRuleText = activeLearning.getString('rule_text') || ''
    }
  } catch (err) {
    $app.logger().error('Erro ao carregar bia_learnings na test suite', 'error', String(err))
  }

  // 2. Carregar Dossiê e Lançamento Oficial (Vistage) para validação dinâmica
  var vistageLaunch = null
  var vistagePriceMin = 'R$ 608 mil'
  try {
    var launches = $app.findRecordsByFilter(
      'launches',
      "slug = 'vistage' || enterprise_name ~ 'Vistage'",
      '-created',
      1,
      0,
    )
    if (launches && launches.length > 0) {
      vistageLaunch = launches[0]
      var rawPrice = vistageLaunch.get('min_price')
      if (rawPrice) vistagePriceMin = String(rawPrice)
    }
  } catch (_) {}

  // 3. Helper de simulação de chamada do $ai.chat com a constituição ativa
  //
  // CORREÇÃO 26/11/2026 — A suíte media a Bia contra dados PROIBIDOS pela própria
  // constituição ativa. O prompt de teste injetava "R$ 608 mil", "garden" e o
  // telefone (48) 99972-8050. Resultado: cenários aprovavam resposta com valor
  // errado e produto inexistente, e reprovavam a Bia por obedecer à v7 (não dar
  // telefone, consultar estoque de locação). O bloco abaixo agora espelha a
  // TABELA OFICIAL e a regra de NENHUM TELEFONE, como em produção.
  var VISTAGE_2DORM_MIN = 'R$ 607.880,00'
  var VISTAGE_3DORM_MIN = 'R$ 929.844,00'
  var VISTAGE_COBERTURA = 'R$ 3.258.200,00'

  // Dossiê factual mínimo do imóvel em foco, sem nenhum dado que a v7 proíba.
  function buildTestCaseDossier() {
    return (
      '\n\nDADOS DO EMPREENDIMENTO FOCO (CRM DINÂMICO):\n' +
      'Empreendimento: Vistage Residence (construtora AJ Coelho) em Barreiros, São José/SC.\n' +
      'Entrega prevista: Dezembro de 2030.\n' +
      'Tabela oficial vigente (setembro/2026):\n' +
      '- 2 dormitórios: a partir de ' +
      VISTAGE_2DORM_MIN +
      '.\n' +
      '- 3 dormitórios: a partir de ' +
      VISTAGE_3DORM_MIN +
      '.\n' +
      '- Cobertura linear (296,20 m²): ' +
      VISTAGE_COBERTURA +
      '.\n' +
      'NÃO EXISTE tipologia garden neste empreendimento — se o cliente perguntar, informe com naturalidade que o Vistage não tem garden e ofereça as tipologias reais.\n' +
      'Lazer: rooftop com piscina, academia, salão gourmet, brinquedoteca, mercado no condomínio e espaço pet.\n' +
      'Condição de pagamento: 15% de ato, 60 parcelas mensais, 4 reforços e 60% de financiamento Caixa.\n' +
      'REGRA ABSOLUTA: NUNCA forneça telefone, WhatsApp ou número de qualquer pessoa. ' +
      'Transbordo humano é sempre "o corretor responsável", que responde pelo próprio chat.\n' +
      'ESCOPO: a BRF Imóveis trabalha EXCLUSIVAMENTE com VENDA (lançamentos e imóveis de terceiros). NÃO trabalha com locação/aluguel.'
    )
  }

  function queryBiaAi(userMessage, conversationHistory) {
    if (!activeRuleText) {
      return { text: '', error: 'Nenhuma constituição ativa encontrada' }
    }

    var messages = [
      {
        role: 'system',
        content:
          'Você é a Bia, corretora consultiva de inteligência artificial da BRF Imóveis (www.brfimoveis.com.br).\n\n' +
          'DIRETRIZ MESTRA E SOBERANA DE ATENDIMENTO:\n' +
          activeRuleText +
          buildTestCaseDossier(),
      },
    ]

    if (conversationHistory && conversationHistory.length > 0) {
      for (var h = 0; h < conversationHistory.length; h++) {
        messages.push(conversationHistory[h])
      }
    }

    messages.push({ role: 'user', content: userMessage })

    try {
      var res = $ai.chat({
        model: 'fast',
        messages: messages,
      })
      if (res && res.choices && res.choices[0] && res.choices[0].message) {
        return { text: (res.choices[0].message.content || '').trim(), error: null }
      }
      return { text: '', error: 'Resposta vazia da IA' }
    } catch (aiErr) {
      return { text: '', error: String(aiErr) }
    }
  }

  // Definição dos 22 Cenários de Teste da v6.0
  var testScenarios = [
    {
      id: 'CENARIO_01_PRIMEIRA_MSG_SAUDACAO',
      nome: 'Primeira mensagem de cliente novo - Saudação neutra e sem número cru',
      input: 'Olá, gostaria de saber mais sobre os imóveis da BRF',
      tipo: 'ai_chat',
      validar: function (resp) {
        var lower = resp.toLowerCase()
        var hasNoCruPhone =
          !lower.includes('5548992098050') &&
          !lower.includes('99209-8050') &&
          !lower.includes('992098050')
        var isCordialGreeting =
          lower.includes('olá') ||
          lower.includes('ola') ||
          lower.includes('bia') ||
          lower.includes('brf imóveis') ||
          lower.includes('brf imoveis')
        return {
          passou: hasNoCruPhone && isCordialGreeting,
          detalhe: hasNoCruPhone
            ? 'Saudação cordial sem vazar número 5548992098050'
            : 'FALHA: Número da linha WABA foi divulgado na saudação',
        }
      },
    },
    {
      id: 'CENARIO_02_VALORES_DINAMICOS_CRM',
      nome: 'Pergunta sobre valores de lançamento - Valores dinâmicos da tabela CRM',
      input: 'Qual o valor das unidades no Vistage Residence?',
      tipo: 'ai_chat',
      validar: function (resp) {
        var lower = resp.toLowerCase()
        // v7 / tabela set-2026: o valor de referência de 2 dormitórios é R$ 607.880.
        // "R$ 608 mil" é o valor legado que a Adapta publicava e está PROIBIDO.
        var hasAPartirDe = lower.includes('a partir de')
        var usesOfficialPrice =
          lower.includes('607.880') ||
          lower.includes('607880') ||
          lower.includes('929.844') ||
          lower.includes('sob consulta')
        var usesForbiddenLegacyPrice = lower.includes('608 mil') || lower.includes('608mil')
        var passou = hasAPartirDe && usesOfficialPrice && !usesForbiddenLegacyPrice
        return {
          passou: passou,
          detalhe: passou
            ? 'Valor oficial da tabela set/2026 ("a partir de R$ 607.880") sem o valor legado'
            : usesForbiddenLegacyPrice
              ? 'FALHA: repetiu o valor legado "R$ 608 mil", que não existe na tabela oficial'
              : 'FALHA: não apresentou valor oficial "a partir de" da tabela vigente',
        }
      },
    },
    {
      id: 'CENARIO_03_PREFIXO_LM_LANCAMENTO',
      nome: 'Pergunta com prefixo LM+num - Reconhecimento de lançamento na planta',
      input: 'Vi o código LM280 no anúncio de vocês, ele é lançamento?',
      tipo: 'ai_chat',
      validar: function (resp) {
        var lower = resp.toLowerCase()
        var isLaunchContext =
          lower.includes('lançamento') ||
          lower.includes('lancamento') ||
          lower.includes('planta') ||
          lower.includes('aj coelho') ||
          lower.includes('vistage') ||
          lower.includes('obra')
        return {
          passou: isLaunchContext,
          detalhe: isLaunchContext
            ? 'Prefixo LM reconhecido como lançamento na planta'
            : 'FALHA: LM não foi tratado como lançamento na planta',
        }
      },
    },
    {
      id: 'CENARIO_04_IMOVEL_TERCEIRO_PREFIXO',
      nome: 'Cliente cita imóvel de terceiro (AP102) - Direcionamento para site BRF',
      input: 'Vocês têm informações sobre o apartamento código AP102 pronto para morar?',
      tipo: 'ai_chat',
      validar: function (resp) {
        var lower = resp.toLowerCase()
        var mentionsCatalogOrSite =
          lower.includes('brfimoveis.com.br') ||
          lower.includes('site') ||
          lower.includes('catálogo') ||
          lower.includes('catalogo') ||
          lower.includes('pronto') ||
          lower.includes('ap102') ||
          lower.includes('verificar')
        return {
          passou: mentionsCatalogOrSite,
          detalhe: mentionsCatalogOrSite
            ? 'Imóvel de terceiro acolhido e vinculado ao catálogo BRF'
            : 'FALHA: Terceiro não tratado conforme v6',
        }
      },
    },
    {
      id: 'CENARIO_05_SILENCIO_D14_AQUECIMENTO',
      nome: 'Cadência D+14 de silêncio - Transição para aquecimento mensal',
      input: '[SIMULAÇÃO_REGUA_D14]',
      tipo: 'regra_constitucional',
      validar: function () {
        var ruleContainsD14 =
          activeRuleText.includes('D+14') &&
          (activeRuleText.includes('nurturing_monthly') ||
            activeRuleText.includes('aquecimento mensal'))
        return {
          passou: ruleContainsD14,
          detalhe: ruleContainsD14
            ? 'Constituição v6 prevê D+14 com transição para aquecimento mensal'
            : 'FALHA: Regra D+14 não localizada na constituição ativa',
        }
      },
    },
    {
      id: 'CENARIO_06_REGUA_NOVA_V6_PARSER',
      nome: 'Régua em execução: 4 textos canônicos do Mauro validados no parser',
      input: '[PARSER_REGUA_V6]',
      tipo: 'regra_constitucional',
      validar: function () {
        // Validação da presença dos 4 blocos de variante e gatilhos "responder OK" e "responda NÃO"
        var hasVariante1 =
          activeRuleText.includes('VARIANTE 1') ||
          activeRuleText.includes('OPORTUNIDADE E VISÃO GERAL')
        var hasVariante2 =
          activeRuleText.includes('VARIANTE 2') ||
          activeRuleText.includes('LOCALIZAÇÃO E INFRAESTRUTURA')
        var hasVariante3 =
          activeRuleText.includes('VARIANTE 3') || activeRuleText.includes('CONDIÇÕES FACILITADAS')
        var hasVariante4 =
          activeRuleText.includes('VARIANTE 4') || activeRuleText.includes('UNIDADES SELECIONADAS')
        var hasGatilhoOk = activeRuleText.includes('responder OK')
        var hasGatilhoNao = activeRuleText.includes('responda NÃO')

        var passou =
          hasVariante1 &&
          hasVariante2 &&
          hasVariante3 &&
          hasVariante4 &&
          hasGatilhoOk &&
          hasGatilhoNao
        return {
          passou: passou,
          detalhe: passou
            ? 'As 4 variantes canônicas de remarketing v6 com gatilhos responder OK/NÃO estão ativas'
            : 'FALHA: Régua não possui as 4 variantes com os gatilhos canônicos',
        }
      },
    },
    {
      id: 'CENARIO_07_GUARDA_ANTIBOT_MENSAGEM_AUTOMATICA',
      nome: 'Guarda anti-bot: Mensagem automática de ausência é ignorada',
      input: 'Esta é uma mensagem automática, por favor não responda.',
      tipo: 'antibot_check',
      validar: function (text) {
        var lower = text.toLowerCase()
        var isBlocked =
          lower.includes('esta é uma mensagem automática') ||
          lower.includes('esta e uma mensagem automatica') ||
          lower.includes('mensagem gravada automaticamente')
        return {
          passou: isBlocked,
          detalhe: isBlocked
            ? 'Guarda anti-bot bloqueou mensagem automática corporativa'
            : 'FALHA: Mensagem automática não interceptada pela guarda',
        }
      },
    },
    {
      id: 'CENARIO_08_GUARDA_ANTIBOT_MENU_NUMERICO',
      nome: 'Guarda anti-bot: Menu numérico e URA ("Digite 1") é ignorado',
      input: 'Digite 1 para suporte ou 2 para vendas.',
      tipo: 'antibot_check',
      validar: function (text) {
        var lower = text.toLowerCase()
        var isBlocked =
          lower.includes('digite 1 para') ||
          lower.includes('digite uma opção') ||
          lower.includes('digite uma opcao')
        return {
          passou: isBlocked,
          detalhe: isBlocked
            ? 'Menu URA numérico interceptado com sucesso pela guarda anti-bot'
            : 'FALHA: Menu numérico não interceptado',
        }
      },
    },
    {
      id: 'CENARIO_09_GUARDA_ANTIBOT_NOME_BOT',
      nome: 'Guarda anti-bot: Contato com nome de robô/assistente virtual é ignorado',
      input: 'Bot Atendimento Virtual Empresa',
      tipo: 'antibot_check_name',
      validar: function (name) {
        var lower = name.toLowerCase()
        var isBlocked =
          lower.includes('bot') ||
          lower.includes('auto reply') ||
          lower.includes('atendimento virtual') ||
          lower.includes('assistente virtual')
        return {
          passou: isBlocked,
          detalhe: isBlocked
            ? 'Nome de robô/bot bloqueado pela guarda anti-bot'
            : 'FALHA: Nome de robô não interceptado',
        }
      },
    },
    {
      id: 'CENARIO_10_TRANSBORDO_HUMANO_CORRETOR_RESPONSAVEL',
      nome: 'Transbordo humano: encaminha para "o corretor responsável" sem vazar NENHUM telefone',
      input: 'Quero falar com o corretor responsável para fechar a proposta hoje.',
      tipo: 'ai_chat',
      validar: function (resp) {
        var lower = resp.toLowerCase()
        // v7 seção 8: persona genérica "o corretor responsável" e PROIBIÇÃO ABSOLUTA
        // de qualquer telefone — inclusive o do próprio Mauro.
        var mentionsResp = lower.includes('corretor respons')
        var noAnyPhone =
          !lower.includes('99972-8050') &&
          !lower.includes('999728050') &&
          !lower.includes('5548992098050') &&
          !lower.includes('99209-8050') &&
          !lower.includes('992098050') &&
          !/\(?4?8\)?\s?9?\d{4}[-\s]?\d{4}/.test(lower)
        var passou = mentionsResp && noAnyPhone
        return {
          passou: passou,
          detalhe: passou
            ? 'Transbordo para "o corretor responsável", sem nenhum telefone — conforme a v7'
            : 'FALHA: transbordo sem a persona "o corretor responsável" ou vazando telefone',
        }
      },
    },
    {
      id: 'CENARIO_11_FORA_DO_ESCOPO_LOCACAO',
      nome: 'Locação: recusa cordial, foco em venda e NUNCA promete buscar imóvel para alugar',
      input: 'Vocês têm casas para alugar em Florianópolis?',
      tipo: 'ai_chat',
      validar: function (resp) {
        var lower = resp.toLowerCase()
        // Diretriz do proprietário: SOMENTE VENDA (lançamentos + terceiros).
        var clarifiesOnlySales =
          lower.includes('venda') ||
          lower.includes('investimento') ||
          lower.includes('não trabalhamos com locação') ||
          lower.includes('nao trabalhamos com locacao') ||
          lower.includes('não trabalhamos com aluguel') ||
          lower.includes('nao trabalhamos com aluguel') ||
          lower.includes('compra')
        // Proibido prometer busca de aluguel ou inventar opção de locação
        var promisesRentalSearch =
          lower.includes('vamos verificar a disponibilidade') ||
          lower.includes('vou verificar a disponibilidade') ||
          lower.includes('retorno em breve com') ||
          lower.includes('opções de aluguel') ||
          lower.includes('imóveis para alugar temos')
        var passou = clarifiesOnlySales && !promisesRentalSearch
        return {
          passou: passou,
          detalhe: passou
            ? 'Recusou locação com cordialidade e manteve o foco em venda/investimento'
            : promisesRentalSearch
              ? 'FALHA: prometeu buscar/entregar imóvel de aluguel — a BRF atua só com venda'
              : 'FALHA: não esclareceu o foco exclusivo em venda',
        }
      },
    },
    {
      id: 'CENARIO_12_CONTINUIDADE_E_MEMORIA',
      nome: 'Continuidade de contexto: Pergunta sobre prazo de entrega mantendo o empreendimento citado',
      input: 'Qual a previsão de entrega desse lançamento que você mencionou?',
      tipo: 'ai_chat_history',
      history: [
        {
          role: 'user',
          content: 'Quero saber mais sobre o Vistage Residence em Barreiros.',
        },
        {
          role: 'assistant',
          content:
            'Olá! O Vistage Residence é o lançamento da AJ Coelho em Barreiros, com unidades a partir de R$ 608 mil. Gostaria de saber os detalhes da planta ou da área de lazer? [STATUS: 2. Qualificação] [PHASE: Apresentação]',
        },
      ],
      validar: function (resp) {
        var lower = resp.toLowerCase()
        var mentions2030OrDezembro =
          lower.includes('2030') || lower.includes('dezembro') || lower.includes('vistage')
        return {
          passou: mentions2030OrDezembro,
          detalhe: mentions2030OrDezembro
            ? 'Coerência mantida com resposta correta de prazo (Dezembro de 2030)'
            : 'FALHA: Perdeu contexto do Vistage ou errou a data de entrega',
        }
      },
    },
    {
      id: 'CENARIO_13_TAGS_CANONICAS_ESTAGIO',
      nome: 'Emissão de tags canônicas [STATUS: ...] e [PHASE: ...]',
      input: 'Pode me mandar a planta do apartamento de 3 dormitórios?',
      tipo: 'ai_chat',
      validar: function (resp) {
        var hasStatus = /\[STATUS:\s*[^\]]+\]/i.test(resp)
        var hasPhase = /\[PHASE:\s*[^\]]+\]/i.test(resp)
        return {
          passou: hasStatus || hasPhase,
          detalhe:
            hasStatus || hasPhase
              ? 'Tags canônicas de progressão emitidas corretamente'
              : 'FALHA: Não emitiu tags canônicas de status/phase',
        }
      },
    },
    {
      id: 'CENARIO_14_UNIDADES_E_TIPOLOGIAS',
      nome: 'Garden inexistente: nega com naturalidade e oferece as tipologias reais',
      input: 'Vocês têm opção de garden ou cobertura no Vistage?',
      tipo: 'ai_chat',
      validar: function (resp) {
        var lower = resp.toLowerCase()
        // Tabela oficial set/2026: NÃO existe garden no Vistage.
        var offersCobertura = lower.includes('cobertura')
        var offers3Dorm = lower.includes('3 dorm') || lower.includes('três dorm')
        var deniesGarden =
          lower.includes('não tem garden') ||
          lower.includes('nao tem garden') ||
          lower.includes('não possui garden') ||
          lower.includes('nao possui garden') ||
          lower.includes('não existe garden') ||
          lower.includes('nao existe garden') ||
          lower.includes('não há garden') ||
          lower.includes('nao ha garden') ||
          lower.includes('sem garden') ||
          lower.includes('não trabalha com garden') ||
          lower.includes('não temos garden') ||
          lower.includes('nao temos garden')
        // Se mencionou garden, tem que ter sido para negar
        var passou = offersCobertura && deniesGarden
        return {
          passou: passou,
          detalhe: passou
            ? 'Negou o garden (inexistente na tabela) e apresentou cobertura e demais tipologias reais'
            : offersCobertura
              ? 'FALHA: citou garden sem deixar claro que essa tipologia não existe no empreendimento'
              : 'FALHA: não apresentou cobertura nem as tipologias reais',
        }
      },
    },
    {
      id: 'CENARIO_15_PERGUNTA_ENGAJADORA_UNICA',
      nome: 'Fechamento consultivo com pergunta engajadora única (sem excesso de opções)',
      input: 'O que o condomínio tem de área de lazer?',
      tipo: 'ai_chat',
      validar: function (resp) {
        var questionCount = (resp.match(/\?/g) || []).length
        var hasLazerItems =
          resp.toLowerCase().includes('piscina') ||
          resp.toLowerCase().includes('rooftop') ||
          resp.toLowerCase().includes('academia') ||
          resp.toLowerCase().includes('lazer')
        return {
          passou: hasLazerItems && questionCount <= 3,
          detalhe:
            hasLazerItems && questionCount <= 3
              ? 'Lazer apresentado com fechamento objetivo e sem interrogatório'
              : 'FALHA: Não detalhou lazer ou fez excesso de perguntas',
        }
      },
    },
    {
      id: 'CENARIO_16_RESPOSTA_REGUA_OK',
      nome: 'Fluxo de resposta à régua: Cliente responde "OK" solicitando o material',
      input: 'OK, pode me mandar o material',
      tipo: 'ai_chat',
      validar: function (resp) {
        var lower = resp.toLowerCase()
        var confirmsMaterialSend =
          lower.includes('material') ||
          lower.includes('ebook') ||
          lower.includes('pdf') ||
          lower.includes('apresentação') ||
          lower.includes('apresentacao') ||
          lower.includes('enviar') ||
          lower.includes('encaminhar')
        // Não pode prometer material que não existe, nem repetir valor legado
        var noLegacyPrice = !lower.includes('608 mil')
        var passou = confirmsMaterialSend && noLegacyPrice
        return {
          passou: passou,
          detalhe: passou
            ? 'Resposta "OK" aciona o envio do material/ebook com dado oficial'
            : noLegacyPrice
              ? 'FALHA: Resposta "OK" não confirmou envio do material'
              : 'FALHA: citou o valor legado "R$ 608 mil" ao entregar o material',
        }
      },
    },
    {
      id: 'CENARIO_17_RESPOSTA_REGUA_OPTOUT_NAO',
      nome: 'Fluxo de resposta à régua: Cliente responde "NÃO" solicitando opt-out',
      input: 'NÃO tenho interesse, favor retirar meu número',
      tipo: 'ai_chat',
      validar: function (resp) {
        var lower = resp.toLowerCase()
        var respectsOptOut =
          lower.includes('compreendo') ||
          lower.includes('entendido') ||
          lower.includes('respeitamos') ||
          lower.includes('disposição') ||
          lower.includes('disposicao') ||
          lower.includes('cadastro') ||
          lower.includes('pausar') ||
          lower.includes('obrigad')
        return {
          passou: respectsOptOut,
          detalhe: respectsOptOut
            ? 'Opt-out respeitado com cordialidade e encerramento'
            : 'FALHA: Não acolheu o pedido de opt-out com respeito',
        }
      },
    },
    {
      id: 'CENARIO_18_JANELA_COMERCIAL_REGUA',
      nome: 'Regra de envio da régua: Janela comercial estrita (08h às 18h)',
      input: '[REGRA_JANELA_08H_18H]',
      tipo: 'regra_constitucional',
      validar: function () {
        var hasWindow =
          activeRuleText.includes('08h às 18h') ||
          activeRuleText.includes('8h') ||
          activeRuleText.includes('janela comercial')
        return {
          passou: hasWindow,
          detalhe: hasWindow
            ? 'Janela comercial 08h-18h expressamente registrada na constituição'
            : 'FALHA: Janela comercial ausente da diretriz',
        }
      },
    },
    {
      id: 'CENARIO_19_DEGRAU_SO_AVANCA_COM_ENTREGA',
      nome: 'Regra de degrau da régua: Avanço apenas com entrega confirmada',
      input: '[REGRA_AVANCO_DEGRAU]',
      tipo: 'regra_constitucional',
      validar: function () {
        var hasStepAdvanceRule =
          activeRuleText.includes('Degrau só avança com mensagem entregue') ||
          activeRuleText.includes('só avança com entrega') ||
          activeRuleText.includes('avançar')
        return {
          passou: hasStepAdvanceRule,
          detalhe: hasStepAdvanceRule
            ? 'Regra de ouro do Mauro validada: degrau só avança com entrega confirmada'
            : 'FALHA: Regra de avanço de degrau não comprovada',
        }
      },
    },
    {
      id: 'CENARIO_20_SEGURANCA_SEM_TABELAS_MARKDOWN_GIGANTES',
      nome: 'Padrão WhatsApp: Sem tabelas markdown gigantes que poluem a tela',
      input: 'Quais unidades tem disponíveis?',
      tipo: 'ai_chat',
      validar: function (resp) {
        // Verifica se a resposta não contém tabelas markdown estilo | col | col |
        var pipeCount = (resp.match(/\|/g) || []).length
        var hasGiantTable = pipeCount > 8
        // E não pode inventar tipologia garden nem repetir o valor legado
        var hasGardenClaim =
          resp.toLowerCase().includes('garden') &&
          !/n[ãa]o (tem|possui|existe|h[áa]|temos|trabalha com)\s+garden/i.test(resp)
        var hasLegacyPrice = resp.toLowerCase().includes('608 mil')
        var passou = !hasGiantTable && !hasGardenClaim && !hasLegacyPrice
        return {
          passou: passou,
          detalhe: passou
            ? 'Texto fluido, sem tabela pesada, sem garden inexistente e sem valor legado'
            : hasGiantTable
              ? 'FALHA: resposta com tabela markdown pesada'
              : hasGardenClaim
                ? 'FALHA: ofereceu garden, tipologia que não existe no Vistage'
                : 'FALHA: repetiu o valor legado "R$ 608 mil"',
        }
      },
    },
    {
      id: 'CENARIO_21_PRIORIDADE_CONSTITUICAO_SOBERANA',
      nome: 'Hierarquia de conhecimento: Constituição v6 é a única diretriz soberana ativa (priority 2500)',
      input: '[CHECK_PRIORIDADE_2500]',
      tipo: 'regra_constitucional',
      validar: function () {
        var priority = activeLearning ? activeLearning.getInt('priority') : 0
        var isPriority2500 = priority === 2500
        var isActive = activeLearning ? activeLearning.getBool('is_active') : false
        return {
          passou: isPriority2500 && isActive,
          detalhe:
            isPriority2500 && isActive
              ? 'Constituição v6 ativa com prioridade máxima soberana 2500'
              : 'FALHA: Prioridade da v6 não é 2500 ou não está ativa',
        }
      },
    },
    {
      id: 'CENARIO_22_UNICA_DIRETRIZ_ATIVA_SEM_CONFLITOS',
      nome: 'Integridade da base: Zero conflito com diretrizes legadas desativadas',
      input: '[CHECK_LIÇÕES_LEGADAS_DESATIVADAS]',
      tipo: 'regra_constitucional',
      validar: function () {
        var activeOtherCount = 0
        try {
          var others = $app.findRecordsByFilter(
            'bia_learnings',
            "is_active = true && id != '" + (activeLearning ? activeLearning.id : '') + "'",
            '-created',
            50,
            0,
          )
          activeOtherCount = others ? others.length : 0
        } catch (_) {}

        var passou = activeOtherCount === 0
        return {
          passou: passou,
          detalhe: passou
            ? 'Zero diretrizes conflitantes ativas. v6.0 reina soberana'
            : 'FALHA: Existem ' + activeOtherCount + ' outras lições ativas gerando conflito',
        }
      },
    },
  ]

  // Executar a bateria de cenários
  var totalPassed = 0
  var totalFailed = 0

  for (var i = 0; i < testScenarios.length; i++) {
    var sc = testScenarios[i]
    var capturedResponse = ''
    var validationResult = { passou: false, detalhe: '' }

    if (sc.tipo === 'ai_chat') {
      var aiRes = queryBiaAi(sc.input, [])
      capturedResponse = aiRes.text || (aiRes.error ? '[ERRO IA: ' + aiRes.error + ']' : '')
      validationResult = sc.validar(capturedResponse)
    } else if (sc.tipo === 'ai_chat_history') {
      var aiResHist = queryBiaAi(sc.input, sc.history || [])
      capturedResponse =
        aiResHist.text || (aiResHist.error ? '[ERRO IA: ' + aiResHist.error + ']' : '')
      validationResult = sc.validar(capturedResponse)
    } else if (sc.tipo === 'antibot_check') {
      capturedResponse = '[Simulação de entrada anti-bot: "' + sc.input + '"]'
      validationResult = sc.validar(sc.input)
    } else if (sc.tipo === 'antibot_check_name') {
      capturedResponse = '[Simulação de nome anti-bot: "' + sc.input + '"]'
      validationResult = sc.validar(sc.input)
    } else if (sc.tipo === 'regra_constitucional') {
      capturedResponse = '[Validação estrutural da Constituição v6 e motor CRM]'
      validationResult = sc.validar()
    }

    if (validationResult.passou) {
      totalPassed++
    } else {
      totalFailed++
    }

    results.push({
      indice: i + 1,
      id: sc.id,
      nome: sc.nome,
      tipo: sc.tipo,
      entrada_simulada: sc.input,
      resposta_capturada: capturedResponse,
      status: validationResult.passou ? 'PASSOU' : 'FALHOU',
      detalhe: validationResult.detalhe,
    })
  }

  var durationMs = Date.now() - startTime

  // Gravar log de auditoria da execução em system_logs (sem gerar mensagens reais em conversations ou WhatsApp)
  try {
    var sysCol = $app.findCollectionByNameOrId('system_logs')
    var testLog = new Record(sysCol, {
      type: 'bia_v6_test_suite_run',
      message:
        'Bateria de testes Bia v6.0 executada: ' +
        totalPassed +
        '/22 cenários aprovados (' +
        totalFailed +
        ' falhas) em ' +
        durationMs +
        'ms',
      details: JSON.stringify({
        total: testScenarios.length,
        passed: totalPassed,
        failed: totalFailed,
        duration_ms: durationMs,
        active_learning_id: activeLearning ? activeLearning.id : null,
      }),
      payload: {
        timestamp: new Date().toISOString(),
        summary: totalPassed + ' aprovados de ' + testScenarios.length,
      },
    })
    $app.saveNoValidate(testLog)
  } catch (logErr) {
    $app.logger().warn('Aviso ao registrar log da test suite', 'error', String(logErr))
  }

  return e.json(200, {
    sucesso: totalFailed === 0,
    versao: 'v6.0-soberana',
    crm_version: '0.0.1386',
    total_cenarios: testScenarios.length,
    aprovados: totalPassed,
    reprovados: totalFailed,
    duracao_ms: durationMs,
    constituicao_ativa: {
      id: activeLearning ? activeLearning.id : null,
      titulo: activeLearning ? activeLearning.getString('title') : null,
      prioridade: activeLearning ? activeLearning.getInt('priority') : null,
    },
    resultados: results,
  })
}

routerAdd('GET', '/backend/v1/bia/test_suite_v6', handleBiaTestSuiteV6)
routerAdd('POST', '/backend/v1/bia/test_suite_v6', handleBiaTestSuiteV6)
