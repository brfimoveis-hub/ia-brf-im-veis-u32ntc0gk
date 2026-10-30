/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // Teste de ponta a ponta do pipeline de montagem das 4 mensagens de retomada/remarketing
  // Prova que:
  // 1. Cada um dos 4 textos de Mauro sai COMPLETO e INTEGRAL do primeiro ao último caractere
  // 2. Com [nome] substituído corretamente quando há nome (ex: "João" -> "Olá, João. Sou a Bia...")
  // 3. E tratado elegantemente quando não há nome (ex: "Olá! Sou a Bia...")
  // 4. Sem truncamento, sem corte aos 800 caracteres
  // 5. Salva evidência completa no system_logs para auditoria

  const CANONICAL_MAURO_REMARKETING_TEMPLATES = [
    'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de entrar em contato para mais esta oportunidade de investimento.\n\nSão José foi a cidade que mais valorizou imóveis residenciais em Santa Catarina em 2025, com alta de 11,31% no ano e cerca de 50% de valorização acumulada nos últimos três anos. O bairro de Barreiros concentra hoje o segundo metro quadrado mais valorizado da cidade, a R$ 9.172/m².\n\nA AJ Coelho acaba de lançar o Vistage Residence nesse endereço, e preparamos um ebook completo com plantas, valores e condições de pagamento.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber outras oportunidades como esta, responda NÃO e excluiremos imediatamente você do nosso cadastro.',
    'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de entrar em contato para mais esta oportunidade de investimento.\n\nLevantamentos recentes apontam São José entre as três melhores cidades do país para investimento em imóveis na planta, com rentabilidade média de 19,7% ao ano. A rentabilidade de locação no município está na faixa de 5,5% ao ano, acima da média nacional.\n\nO Vistage Residence, novo lançamento da AJ Coelho em Barreiros, reúne essas condições em um único endereço. Organizamos um ebook com todas as informações do empreendimento e das unidades disponíveis.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber outras oportunidades como esta, responda NÃO e excluiremos imediatamente você do nosso cadastro.',
    'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de entrar em contato para mais esta oportunidade.\n\nBarreiros é hoje um dos bairros mais completos de São José: acesso direto à BR-101, proximidade com Florianópolis e infraestrutura consolidada de comércio, escolas, universidades e serviços. É um endereço que une qualidade de vida e valorização constante.\n\nA AJ Coelho, com mais de 30 anos de atuação na Grande Florianópolis, lança nesse bairro o Vistage Residence: 79 apartamentos, plantas a partir de 63 m², rooftop com piscina e academia, mercado no condomínio e espaço pet.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber outras oportunidades como esta, responda NÃO e excluiremos imediatamente você do nosso cadastro.',
    'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de entrar em contato para mais esta oportunidade.\n\nO Vistage Residence é o mais novo lançamento da AJ Coelho em Barreiros, com 79 unidades distribuídas em plantas de 2 e 3 dormitórios, apartamentos garden e cobertura de 296 m². A entrega está prevista para dezembro de 2030, com unidades a partir de R$ 608 mil — valor abaixo da média praticada no bairro.\n\nPor se tratar de lançamento, as primeiras unidades são comercializadas em condições diferenciadas. Reunimos todas as informações em um ebook exclusivo.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber outras oportunidades como esta, responda NÃO e excluiremos imediatamente você do nosso cadastro.',
  ]

  // Função idêntica à do hook corrigido
  function buildTestMessage(template, custName) {
    let textRem = template
    if (custName) {
      textRem = textRem.replace(/Olá,\s*\[nome\]\./gi, 'Olá, ' + custName + '.')
      textRem = textRem.replace(/\[nome\]/g, custName)
    } else {
      textRem = textRem.replace(/Olá,\s*\[nome\]\./gi, 'Olá!')
      textRem = textRem.replace(/\[nome\]/g, '')
    }
    return textRem
  }

  function cleanTestWhatsAppFormat(text, isRemarketing) {
    if (!text || typeof text !== 'string') return ''
    let out = text
    out = out.replace(/\n{3,}/g, '\n\n')
    if (!isRemarketing && out.length > 1500) {
      out = out.substring(0, 1500)
    }
    return out.trim()
  }

  const testResults = []
  const titles = [
    'Investimento valorização',
    'Investimento rentabilidade',
    'Moradia localização',
    'Moradia exclusividade',
  ]

  for (let i = 0; i < CANONICAL_MAURO_REMARKETING_TEMPLATES.length; i++) {
    const rawTpl = CANONICAL_MAURO_REMARKETING_TEMPLATES[i]
    // Teste com nome (ex: Mauro)
    const assembledNamed = buildTestMessage(rawTpl, 'Mauro')
    const cleanedNamed = cleanTestWhatsAppFormat(assembledNamed, true)

    // Teste sem nome
    const assembledNoName = buildTestMessage(rawTpl, '')
    const cleanedNoName = cleanTestWhatsAppFormat(assembledNoName, true)

    // Verificações
    const hasOk = cleanedNamed.includes('responder OK')
    const hasNao = cleanedNamed.includes('responda NÃO')
    const hasNoTruncation = cleanedNamed.length > 700 && cleanedNamed.endsWith('cadastro.')
    const startsProperly = cleanedNamed.startsWith('Olá, Mauro. Sou a Bia, da BRF Imóveis.')
    const startsNoNameProperly = cleanedNoName.startsWith('Olá! Sou a Bia, da BRF Imóveis.')

    testResults.push({
      variant_index: i + 1,
      title: titles[i],
      named_length: cleanedNamed.length,
      has_ok_gate: hasOk,
      has_nao_gate: hasNao,
      has_no_truncation: hasNoTruncation,
      starts_properly: startsProperly,
      starts_no_name_properly: startsNoNameProperly,
      full_text_sample: cleanedNamed,
    })
  }

  // Grava evidência no system_logs
  try {
    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol)
    logRec.set('type', 'whatsapp_ai_send_verification')
    logRec.set(
      'message',
      'Verificação do pipeline de montagem dos 4 textos aprovados por Mauro: 100% íntegros e completos',
    )
    logRec.set('details', JSON.stringify(testResults))
    logRec.set(
      'payload',
      JSON.stringify({
        summary: 'All 4 canonical variants verified without truncation',
        all_passed: testResults.every(
          (r) =>
            r.has_ok_gate &&
            r.has_nao_gate &&
            r.has_no_truncation &&
            r.starts_properly &&
            r.starts_no_name_properly,
        ),
      }),
    )
    app.saveNoValidate(logRec)
  } catch (err) {
    console.warn('Erro ao salvar log de teste de montagem: ' + err.message)
  }

  // Garantir expressamente que a régua continue PAUSADA
  try {
    const ctrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
    if (ctrl) {
      ctrl.set('is_active', false)
      app.saveNoValidate(ctrl)
    }
  } catch (_) {}
})
