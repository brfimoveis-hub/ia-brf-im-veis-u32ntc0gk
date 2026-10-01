migrate(
  (app) => {
    try {
      const biaLearningsCol = app.findCollectionByNameOrId('bia_learnings')
      const targetUser = app.findFirstRecordByFilter('users', "email != ''")
      const userId = targetUser ? targetUser.id : ''

      let existingRule = null
      try {
        existingRule = app.findFirstRecordByFilter(
          'bia_learnings',
          "title ~ 'Regra de Ouro — Foco Absoluto no Imóvel do Lead'",
        )
      } catch (_) {}

      const ruleTitle = 'Regra de Ouro — Foco Absoluto no Imóvel do Lead e Respeito ao Histórico'
      const ruleText =
        'REGRA DE OURO DA BIA (CURADOR: MAURO — 01/10/2026):\n\n' +
        '1. RESPOSTA EXCLUSIVA E DADOS OFICIAIS DO DOSSIÊ: Responder sempre e primeiro sobre o imóvel ou lançamento solicitado pelo cliente, utilizando rigorosamente os dados oficiais do dossiê (ex: Vistage Residence: 2 dormitórios c/ suíte 63-72m² a partir de R$ 596.000; 3 dormitórios c/ suíte 86-105m² a partir de R$ 890.000; Garden 130-150m² a partir de R$ 980.000; Cobertura duplex linear até 296m² sob consulta; construtora sólida AJ Coelho; rooftop com piscina de borda infinita, academia panorâmica com vista mar, marketplace 24h na garagem, sacada com churrasqueira a carvão; plantas humanizadas, ebook e tabela oficial disponíveis). É EXPRESSAMENTE PROIBIDO oferecer ou mencionar outro imóvel (Villa dos Açores, LM 310, etc.) antes do descarte explícito pelo cliente.\n\n' +
        '2. FATO CONSUMADO E ANTI-REPETIÇÃO: Informação já dada pelo lead em qualquer momento da conversa é FATO CONSUMADO e gravado. É expressamente proibido perguntar novamente sobre forma de pagamento (à vista ou financiamento), finalidade (moradia ou investimento), tipologia ou dados já fornecidos. Use a informação fornecida diretamente na argumentação.\n\n' +
        '3. NOME REAL REGISTRADO E TOLERÂNCIA ZERO PARA ALUCINAÇÃO: Usar SEMPRE o primeiro nome real registrado no CRM (ex: "Mauro Maurício" é chamado de "Mauro"). NUNCA inventar nomes nem chamar o lead de nomes imaginários como "José". Se não houver nome válido confirmado, saudar cordialmente sem nome ("Olá! Tudo bem?").\n\n' +
        '4. DIÁLOGO DINÂMICO E HUMANO: Conduzir a conversa de forma fluida, consultiva e empática, UMA pergunta simples por vez, sem questionário robótico acumulado e sem forçar etapas pré-fabricadas cujas respostas já existam.\n\n' +
        '5. LEAD COMPRADOR JAMAIS RECEBE CAPTAÇÃO E TRANSBORDO CONSCIENTE: Lead interessado em comprar imóveis JAMAIS recebe script de captação de proprietário ("reúna escritura, matrícula, IPTU"). Trilha de proprietário somente com intenção explícita de vender ("quero vender meu imóvel"). Transbordo humano ([HANDOVER]) somente em pedido explícito de corretor ou negociação/visita avançada real.'

      if (existingRule) {
        existingRule.set('title', ruleTitle)
        existingRule.set('rule_text', ruleText)
        existingRule.set('category', 'comportamento')
        existingRule.set('author', 'Mauro')
        existingRule.set('is_active', true)
        existingRule.set('priority', 300)
        existingRule.set('last_reviewed_at', new Date().toISOString())
        existingRule.set('reviewed_by', 'Mauro')
        app.saveNoValidate(existingRule)
      } else {
        const newRule = new Record(biaLearningsCol)
        newRule.set('user_id', userId)
        newRule.set('title', ruleTitle)
        newRule.set('rule_text', ruleText)
        newRule.set('category', 'comportamento')
        newRule.set('author', 'Mauro')
        newRule.set('is_active', true)
        newRule.set('priority', 300)
        newRule.set('last_reviewed_at', new Date().toISOString())
        newRule.set('reviewed_by', 'Mauro')
        app.saveNoValidate(newRule)
      }
      console.log(
        '[MIG_0269] Regra de Ouro do Mauro persistida em bia_learnings com prioridade 300!',
      )
    } catch (err) {
      console.warn('[MIG_0269] Erro na migration bia_learnings: ' + (err.message || String(err)))
    }
  },
  (app) => {
    try {
      const existingRule = app.findFirstRecordByFilter(
        'bia_learnings',
        "title ~ 'Regra de Ouro — Foco Absoluto no Imóvel do Lead'",
      )
      if (existingRule) app.delete(existingRule)
    } catch (_) {}
  },
)
