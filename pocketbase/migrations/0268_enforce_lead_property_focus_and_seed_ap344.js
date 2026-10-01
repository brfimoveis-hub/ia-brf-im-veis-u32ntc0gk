/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir que o imóvel AP-344 esteja cadastrado e ativo no catálogo properties
    const propertiesCol = app.findCollectionByNameOrId('properties')
    let ap344 = null
    try {
      ap344 = app.findFirstRecordByFilter(
        'properties',
        "code = 'AP-344' || code = 'AP 344' || url ~ '/344/'",
      )
    } catch (_) {}

    if (!ap344) {
      ap344 = new Record(propertiesCol)
      ap344.set('code', 'AP-344')
      ap344.set('title', 'Apartamento 3 dormitórios em Barreiros - São José/SC')
      ap344.set(
        'url',
        'https://www.brfimoveis.com.br/344/imoveis/venda-apartamento-3-dormitorios-barreiros-sao-jose-sc',
      )
      ap344.set('city', 'São José')
      ap344.set('neighborhood', 'Barreiros')
      ap344.set('property_type', 'Apartamento')
      ap344.set('transaction_type', 'Venda')
      ap344.set('price', 510000.0)
      ap344.set('price_formatted', 'R$ 510.000,00')
      ap344.set('bedrooms', 3)
      ap344.set('suites', 1)
      ap344.set('bathrooms', 2)
      ap344.set('parking_spaces', 1)
      ap344.set('area_privativa', 82.0)
      ap344.set('area_total', 104.0)
      ap344.set(
        'description',
        'Excelente apartamento de 3 dormitórios (1 suíte) em Barreiros, São José/SC. Ótima localização próxima ao comércio local, sacada, sala espaçosa, vaga de garagem coberta. Oportunidade com excelente valor de mercado por R$ 510.000.',
      )
      ap344.set('features', [
        'Barreiros',
        'São José',
        '3 dormitórios',
        '1 suíte',
        'Vaga de garagem',
        'Sacada',
        'Excelente localização',
      ])
      ap344.set(
        'image_url',
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260309T1705450300-795523311.jpg',
      )
      ap344.set('is_active', true)
      app.saveNoValidate(ap344)
      console.log('[MIG_0268] Imóvel AP-344 criado com sucesso no catálogo!')
    } else {
      ap344.set('code', 'AP-344')
      ap344.set(
        'url',
        'https://www.brfimoveis.com.br/344/imoveis/venda-apartamento-3-dormitorios-barreiros-sao-jose-sc',
      )
      ap344.set('price', 510000.0)
      ap344.set('price_formatted', 'R$ 510.000,00')
      ap344.set('bedrooms', 3)
      ap344.set('city', 'São José')
      ap344.set('neighborhood', 'Barreiros')
      ap344.set('is_active', true)
      app.saveNoValidate(ap344)
      console.log('[MIG_0268] Imóvel AP-344 atualizado e ativado no catálogo!')
    }

    // 2. Persistir instrução mandatória em bia_instructions e ai_instructions de todos os usuários
    const MANDATORY_LEAD_FOCUS_SECTION = `\n\n=====================================================
REGRA DE ATENDIMENTO A IMÓVEIS ESPECÍFICOS (FOCO TOTAL NO IMÓVEL DO LEAD):
=====================================================
1. RESPOSTA EXCLUSIVA AO IMÓVEL DO LEAD: Se o lead perguntou sobre um imóvel específico (citando código com qualquer prefixo como #LM344, #AP344, LM 344, AP-344, número isolado como "344", URL do site brfimoveis.com.br/344/... ou descrição pontual de uma unidade):
   - A Bia responde PRIMEIRO e EXCLUSIVAMENTE sobre esse imóvel!
   - Confirmar que temos disponível, apresentar valores, dormitórios, localização, diferenciais e tirar as dúvidas pontuais do cliente.
2. PROIBIÇÃO ABSOLUTA DE ALTERNATIVAS PRECOCES OU EMPURRAR LANÇAMENTOS:
   - É expressamente PROIBIDO oferecer outro imóvel ou lançamento na primeira resposta quando o cliente perguntou por um imóvel específico.
   - NUNCA trocar de assunto e NUNCA empurrar lançamentos da região se o lead tem interesse num imóvel específico.
3. SE O IMÓVEL CITADO NÃO FOR ENCONTRADO NA BASE:
   - A Bia informa com cordialidade que vai verificar a disponibilidade atualizada e os detalhes daquele imóvel junto ao corretor Mauro e retornar para o cliente.
   - JAMAIS ofertar imóvel alternativo ou lançamento na mesma resposta em que o lead perguntou por um imóvel não localizado.
4. ALTERNATIVAS SOMENTE APÓS RECUSA EXPLÍCITA:
   - Outros imóveis ou lançamentos só podem ser sugeridos DEPOIS que o cliente literalmente e expressamente manifestar que não se encaixa naquele imóvel (recusa clara de valor, desistência, incompatibilidade declarada pelo lead) — e mesmo assim, apresentadas de forma secundária e consultiva.
=====================================================\n`

    const users = app.findRecordsByFilter('users', "email != ''", '-created', 100, 0)
    for (const u of users) {
      let bia = u.getString('bia_instructions') || ''
      let ai = u.getString('ai_instructions') || ''

      if (!bia.includes('REGRA DE ATENDIMENTO A IMÓVEIS ESPECÍFICOS')) {
        bia += MANDATORY_LEAD_FOCUS_SECTION
        u.set('bia_instructions', bia)
      }
      if (!ai.includes('REGRA DE ATENDIMENTO A IMÓVEIS ESPECÍFICOS')) {
        ai += MANDATORY_LEAD_FOCUS_SECTION
        u.set('ai_instructions', ai)
      }
      app.saveNoValidate(u)
    }

    // 3. Criar registro de prioridade máxima no Caderno de Aprendizados (coleção bia_learnings)
    try {
      const biaLearningsCol = app.findCollectionByNameOrId('bia_learnings')
      const targetUser = app.findFirstRecordByFilter('users', "email != ''")
      const userId = targetUser ? targetUser.id : ''

      let existingRule = null
      try {
        existingRule = app.findFirstRecordByFilter(
          'bia_learnings',
          "title ~ 'Foco Absoluto no Imóvel do Lead'",
        )
      } catch (_) {}

      const ruleText =
        'REGRA DE ATENDIMENTO A IMÓVEIS ESPECÍFICOS (FOCO TOTAL NO IMÓVEL DO LEAD):\n\n' +
        '1. RESPOSTA EXCLUSIVA AO IMÓVEL DO LEAD: Se o lead perguntou sobre um imóvel específico (código com qualquer prefixo como #LM344, #AP344, LM 344, AP-344, número isolado como "344", URL do site brfimoveis.com.br/344/... ou descrição pontual de uma unidade), a Bia responde PRIMEIRO e EXCLUSIVAMENTE sobre esse imóvel. Confirmar que é ele, apresentar valores, dormitórios, características reais daquele imóvel e tirar dúvidas.\n\n' +
        '2. PROIBIÇÃO ABSOLUTA DE OFERECER ALTERNATIVAS NA PRIMEIRA RESPOSTA: É expressamente PROIBIDO oferecer outro imóvel/lançamento na primeira resposta ou trocar de assunto quando o lead perguntou por um imóvel específico. Fica desativado qualquer fallback de empurrar lançamento da região quando o lead citou um imóvel específico.\n\n' +
        '3. SE O IMÓVEL CITADO NÃO FOR ENCONTRADO NA BASE: A Bia informa com cordialidade que vai verificar a disponibilidade e os detalhes daquele imóvel junto ao corretor Mauro e retornar com as informações completas — JAMAIS oferta alternativa ou outro lançamento na mesma resposta.\n\n' +
        '4. OFERTA DE ALTERNATIVAS SOMENTE APÓS RECUSA EXPLÍCITA: Alternativas (outros imóveis/lançamentos) só podem ser sugeridas DEPOIS que o cliente literalmente e expressamente manifestar que não se encaixa (recusa de valor, orçamento, desistência ou incompatibilidade) — e mesmo aí como sugestão secundária.'

      if (existingRule) {
        existingRule.set(
          'title',
          'Foco Absoluto no Imóvel do Lead — Proibição de Alternativas Prematuras',
        )
        existingRule.set('rule_text', ruleText)
        existingRule.set('category', 'comportamento')
        existingRule.set('author', 'Mauro')
        existingRule.set('is_active', true)
        existingRule.set('priority', 200)
        existingRule.set('last_reviewed_at', new Date().toISOString())
        existingRule.set('reviewed_by', 'Mauro')
        app.saveNoValidate(existingRule)
      } else {
        const newRule = new Record(biaLearningsCol)
        newRule.set('user_id', userId)
        newRule.set(
          'title',
          'Foco Absoluto no Imóvel do Lead — Proibição de Alternativas Prematuras',
        )
        newRule.set('rule_text', ruleText)
        newRule.set('category', 'comportamento')
        newRule.set('author', 'Mauro')
        newRule.set('is_active', true)
        newRule.set('priority', 200)
        newRule.set('last_reviewed_at', new Date().toISOString())
        newRule.set('reviewed_by', 'Mauro')
        app.saveNoValidate(newRule)
      }
      console.log('[MIG_0268] Aprendizado persistido em bia_learnings com prioridade 200!')
    } catch (learnErr) {
      console.warn('[MIG_0268] Erro ao gravar em bia_learnings (não fatal): ' + learnErr.message)
    }
  },
  (app) => {
    try {
      const existingRule = app.findFirstRecordByFilter(
        'bia_learnings',
        "title ~ 'Foco Absoluto no Imóvel do Lead'",
      )
      if (existingRule) app.delete(existingRule)
    } catch (_) {}
  },
)
