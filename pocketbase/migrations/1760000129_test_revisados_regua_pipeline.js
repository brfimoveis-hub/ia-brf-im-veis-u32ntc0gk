migrate(
  (app) => {
    // 1760000129_test_revisados_regua_pipeline.js
    // Validação estrita dos 4 textos revisados:
    // 1. Extração do Texto Único (tYVJIdIFb5rW4iq) ou CANONICAL_MAURO_REMARKETING_TEMPLATES
    // 2. Substituição de [nome] com nome real e com cliente sem nome ('Olá!')
    // 3. Verificação de integridade (>= 350 caracteres, 'responder OK', 'responda NÃO')
    // 4. Verificação de quebras de linha (\n\n) no payload serializado
    // 5. Verificação da trava de rejeição de texto truncado (< 350 chars)

    const CANONICAL_MAURO_REMARKETING_TEMPLATES = [
      'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade de investimento.\n\nSão José foi a cidade que mais valorizou imóveis residenciais em Santa Catarina em 2025: alta de 11,31% no ano e cerca de 50% de valorização acumulada nos últimos três anos.\n\nBarreiros concentra hoje o segundo metro quadrado mais valorizado da cidade: R$ 9.172/m².\n\nA AJ Coelho acaba de lançar o Vistage Residence neste endereço.\n\nPreparamos um ebook completo, com plantas, valores e condições de pagamento.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro.',
      'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade de investimento.\n\nSão José está entre as três melhores cidades do país para investimento em imóveis na planta: rentabilidade média de 19,7% ao ano e aluguel rendendo cerca de 5,5% ao ano, acima da média nacional.\n\nO Vistage Residence, novo lançamento da AJ Coelho em Barreiros, reúne essas condições em um único endereço.\n\nOrganizamos um ebook com todas as informações do empreendimento e das unidades disponíveis.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro.',
      'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade.\n\nBarreiros é um dos bairros mais completos de São José: acesso direto à BR-101, perto de Florianópolis, com comércio, escolas, universidades e serviços no dia a dia.\n\nÉ um endereço que une qualidade de vida e valorização constante.\n\nA AJ Coelho, com mais de 30 anos na Grande Florianópolis, lança aí o Vistage Residence: 79 apartamentos, plantas a partir de 63 m², rooftop com piscina e academia, mercado no condomínio e espaço pet.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro.',
      'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade.\n\nO Vistage Residence é o mais novo lançamento da AJ Coelho em Barreiros: 79 unidades, com plantas de 2 e 3 dormitórios, apartamentos garden e cobertura de 296 m².\n\nA entrega está prevista para dezembro de 2030, com unidades a partir de R$ 608 mil — valor abaixo da média praticada no bairro.\n\nPor ser lançamento, as primeiras unidades são comercializadas em condições diferenciadas.\n\nReunimos todas as informações em um ebook exclusivo.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro.',
    ]

    function cleanWhatsAppFormat(text) {
      if (!text || typeof text !== 'string') return ''
      var out = text
      out = out.replace(/\[STATUS:[^\]]*\]/gi, '')
      out = out.replace(/\[PHASE:[^\]]*\]/gi, '')
      out = out.replace(/\[FOLLOW_UP_STEP:[^\]]*\]/gi, '')
      out = out.replace(/^#{1,6}\s+/gm, '')
      out = out.replace(/\n{3,}/g, '\n\n')
      return out.trim()
    }

    function checkIntegrity(cleaned) {
      var hasOkGate =
        cleaned.indexOf('responder OK') !== -1 || cleaned.indexOf('responda OK') !== -1
      var hasNaoGate =
        cleaned.indexOf('responda NÃO') !== -1 || cleaned.indexOf('responda NAO') !== -1
      var isFullLength = cleaned.length >= 350
      return hasOkGate && hasNaoGate && isFullLength
    }

    function assembleMessage(rawTpl, custName) {
      var textRem = rawTpl
      if (custName) {
        textRem = textRem.replace(/Olá,\s*\[nome\]\./gi, 'Olá, ' + custName + '.')
        textRem = textRem.replace(/\[nome\]/g, custName)
      } else {
        textRem = textRem.replace(/Olá,\s*\[nome\]\./gi, 'Olá!')
        textRem = textRem.replace(/\[nome\]/g, '')
      }
      return cleanWhatsAppFormat(textRem)
    }

    // 1. Validar cada um dos 4 textos com cliente COM NOME ("Carlos")
    for (let i = 0; i < CANONICAL_MAURO_REMARKETING_TEMPLATES.length; i++) {
      const raw = CANONICAL_MAURO_REMARKETING_TEMPLATES[i]
      const assembled = assembleMessage(raw, 'Carlos')
      if (!checkIntegrity(assembled)) {
        throw new Error(
          `Texto ${i + 1} com nome falhou na checagem de integridade! Tam: ${assembled.length}`,
        )
      }
      if (!assembled.startsWith('Olá, Carlos. Sou a Bia')) {
        throw new Error(
          `Texto ${i + 1} não começou com 'Olá, Carlos. Sou a Bia'! Começou com: ${assembled.substring(0, 30)}`,
        )
      }
      // Verificar quebras de linha \n\n
      const doubleBreakCount = (assembled.match(/\n\n/g) || []).length
      if (doubleBreakCount < 5) {
        throw new Error(
          `Texto ${i + 1} possui menos de 5 quebras duplas de linha (\n\n)! Encontradas: ${doubleBreakCount}`,
        )
      }
      // Simular serialização JSON Meta
      const metaPayload = JSON.stringify({
        messaging_product: 'whatsapp',
        to: '5548999999999',
        type: 'text',
        text: { preview_url: true, body: assembled },
      })
      const parsedBack = JSON.parse(metaPayload)
      if (parsedBack.text.body !== assembled) {
        throw new Error(`Serialização JSON Meta alterou o corpo do texto ${i + 1}!`)
      }
    }

    // 2. Validar cada um dos 4 textos com cliente SEM NOME (deve dar "Olá! Sou a Bia...")
    for (let i = 0; i < CANONICAL_MAURO_REMARKETING_TEMPLATES.length; i++) {
      const raw = CANONICAL_MAURO_REMARKETING_TEMPLATES[i]
      const assembled = assembleMessage(raw, '')
      if (!checkIntegrity(assembled)) {
        throw new Error(
          `Texto ${i + 1} sem nome falhou na checagem de integridade! Tam: ${assembled.length}`,
        )
      }
      if (!assembled.startsWith('Olá! Sou a Bia')) {
        throw new Error(
          `Texto ${i + 1} sem nome não começou com 'Olá! Sou a Bia'! Começou com: ${assembled.substring(0, 30)}`,
        )
      }
      if (assembled.includes('tudo bem')) {
        throw new Error(`Texto ${i + 1} sem nome incluiu 'tudo bem' indevidamente!`)
      }
      if (assembled.includes('[nome]')) {
        throw new Error(`Texto ${i + 1} ainda contém o placeholder [nome]!`)
      }
    }

    // 3. Testar a trava de rejeição contra mensagem truncada (< 350 chars)
    const truncatedMsg =
      'Olá, Carlos. Sou a Bia, da BRF Imóveis. O Vistage Residence acaba de lançar. responder OK responda NÃO.'
    if (checkIntegrity(truncatedMsg)) {
      throw new Error(
        'A trava de integridade DEVERIA REJEITAR mensagem truncada de 105 chars, mas aprovou!',
      )
    }

    // 4. Testar a trava de rejeição contra mensagem sem "responder OK" ou sem "responda NÃO"
    const missingOk = CANONICAL_MAURO_REMARKETING_TEMPLATES[0].replace(/responder OK/g, 'diga sim')
    if (checkIntegrity(missingOk)) {
      throw new Error(
        'A trava de integridade DEVERIA REJEITAR mensagem sem responder OK, mas aprovou!',
      )
    }

    const missingNao = CANONICAL_MAURO_REMARKETING_TEMPLATES[0].replace(
      /responda NÃO/g,
      'responda sair',
    )
    if (checkIntegrity(missingNao)) {
      throw new Error(
        'A trava de integridade DEVERIA REJEITAR mensagem sem responda NÃO, mas aprovou!',
      )
    }

    console.log(
      '[MIG_1760000129] Pipeline de montagem e integridade dos 4 textos revisados APROVADO COM SUCESSO 100%!',
    )
  },
  (app) => {
    console.log('[MIG_1760000129] Rollback executado.')
  },
)
