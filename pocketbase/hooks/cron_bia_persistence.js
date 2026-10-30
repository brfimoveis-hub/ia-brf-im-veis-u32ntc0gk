/**
 * CRON: Automação da Régua de Persistência Comercial e Remarketing da Bia
 * (D+1, D+3, D+7, D+14, Remarketing / Nutrição Mensal)
 * Condução ativa contra o silêncio do cliente — Texto Único v3.1 (bia_learnings id tYVJIdIFb5rW4iq).
 *
 * PONTO ÚNICO DE ENVIO DE RETOMADAS/MARKETING — migrar para a API de Mensagens de Marketing (MM) da Meta até 13/10/2027;
 * descontinuação do envio de marketing via Cloud API nessa data.
 *
 * Periodicidade: 'STAR/15 8-17 STAR STAR STAR' (A cada 15 min, das 08h às 18h horário de Brasília, seg a sáb)
 */

cronAdd('bia_persistence_followup', '*/15 8-17 * * *', function () {
  var app = $app

  // ============================================================================
  // 0. TRAVA GLOBAL DE PAUSA MANUAL (app_controls: regua_automations_active)
  // Checada antes de qualquer processamento e a cada cliente do lote.
  // ============================================================================
  function isReguaActiveNow() {
    try {
      var ctrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
      if (ctrl) {
        return !!ctrl.getBool('is_active')
      }
    } catch (_) {
      try {
        var row = app
          .db()
          .newQuery(
            "SELECT is_active FROM app_controls WHERE key = 'regua_automations_active' LIMIT 1",
          )
          .one()
        if (row) {
          return row.is_active === 1 || row.is_active === true || row.is_active === '1'
        }
      } catch (_) {}
    }
    // Por segurança máxima, se não configurado ou erro, pausado
    return false
  }

  if (!isReguaActiveNow()) {
    console.log(
      '[BIA_PERSISTENCE] Régua de automações está PAUSADA MANUALMENTE (app_controls). Ciclo ignorado sem envios e sem alterar agendamentos.',
    )
    return
  }

  // ============================================================================
  // 1. PONTO ÚNICO DE ENVIO DE RETOMADAS / MARKETING (TEXTO E DOCUMENTOS)
  // ============================================================================
  function sendPersistenceMarketingMessage(customer, text, userRecord, stepName, documentMedia) {
    // Checagem inline de pausa: se o usuário pausar durante o processamento do lote,
    // interrompe envios pendentes imediatamente!
    if (!isReguaActiveNow()) {
      console.log(
        '[BIA_PERSISTENCE] [sendPersistenceMarketingMessage] Régua pausada durante o lote! Cancelando envio.',
      )
      return false
    }

    if (!text || typeof text !== 'string') return false
    var isRemarketingStep = stepName === 'remarketing' || stepName === 'nurturing_monthly'
    var cleaned = cleanWhatsAppFormat(text, isRemarketingStep)
    if (!cleaned || cleaned.length < 5) return false

    // REGRA DE INTEGRIDADE RÍGIDA (Mauro):
    // Se for passo de remarketing/retomada, o texto DEVE ser integral e conter
    // os marcos obrigatórios de fechamento ("responder OK" e "responda NÃO").
    // Se qualquer anomalia cortar o texto, FALHAR RUIDOSAMENTE em vez de enviar mensagem quebrada!
    if (isRemarketingStep) {
      var hasOkGate =
        cleaned.indexOf('responder OK') !== -1 || cleaned.indexOf('responda OK') !== -1
      var hasNaoGate =
        cleaned.indexOf('responda NÃO') !== -1 || cleaned.indexOf('responda NAO') !== -1
      var isFullLength = cleaned.length >= 350
      if (!hasOkGate || !hasNaoGate || !isFullLength) {
        console.error(
          '[BIA_PERSISTENCE] FALHA GRAVE DE INTEGRIDADE: Tentativa de disparo de mensagem de remarketing incompleta/truncada para ' +
            customer.id +
            ' (tam: ' +
            cleaned.length +
            ', hasOk: ' +
            hasOkGate +
            ', hasNao: ' +
            hasNaoGate +
            '). ENVIO ABORTADO!',
        )
        try {
          var errLogsCol = app.findCollectionByNameOrId('system_logs')
          var errLogRec = new Record(errLogsCol)
          errLogRec.set('user_id', userRecord ? userRecord.id : '')
          errLogRec.set('type', 'whatsapp_ai_send_error')
          errLogRec.set(
            'message',
            'Bloqueio de integridade: texto de remarketing incompleto para ' +
              (customer.getString('phone') || customer.id),
          )
          errLogRec.set(
            'payload',
            JSON.stringify({
              customer_id: customer.id,
              step: stepName,
              text_length: cleaned.length,
              preview: cleaned.substring(0, 150),
              error: 'MENSAGEM_TRUNCADA_OU_SEM_GATES',
            }),
          )
          app.saveNoValidate(errLogRec)
        } catch (_) {}
        return false
      }
    }

    var customerId = customer.id
    var toPhone = customer.getString('phone') || customer.get('phone') || ''
    toPhone = String(toPhone).replace(/\D/g, '')
    // Remove zero inicial de DDD (ex: 048984360590 -> 48984360590)
    if (toPhone.startsWith('0') && toPhone.length >= 11) {
      toPhone = toPhone.substring(1)
    }
    // Números com 8 ou 9 dígitos locais (sem DDD explícito): assumir DDD 48 de Florianópolis/BRF
    if (toPhone.length === 8 || toPhone.length === 9) {
      toPhone = '48' + toPhone
    }
    if (toPhone.length < 10) return false
    if (!toPhone.startsWith('55') && toPhone.length <= 11) {
      toPhone = '55' + toPhone
    }

    var token = ''
    var phoneId = ''
    var userId = ''

    if (userRecord) {
      token = userRecord.getString('meta_whatsapp_access_token') || ''
      phoneId = userRecord.getString('meta_whatsapp_phone_number_id') || ''
      userId = userRecord.id || ''
    }

    if (!token)
      token = $os.getenv('WHATSAPP_TOKEN') || $os.getenv('META_WHATSAPP_ACCESS_TOKEN') || ''
    if (!phoneId)
      phoneId = $os.getenv('WHATSAPP_PHONE_ID') || $os.getenv('META_WHATSAPP_PHONE_NUMBER_ID') || ''

    if (!token || !phoneId) {
      console.warn('[BIA_PERSISTENCE] [sendPersistenceMarketingMessage] Credenciais Meta ausentes.')
      return false
    }

    var normalizedCurrent = normalizeTextForDedup(cleaned)

    // Deduplicação estrita contra system_logs recentes de whatsapp_ai_send
    try {
      var recentLogs = app.findRecordsByFilter(
        'system_logs',
        "type = 'whatsapp_ai_send' && payload ~ '" + customerId + "'",
        '-created',
        5,
        0,
      )
      for (var lIdx = 0; lIdx < recentLogs.length; lIdx++) {
        var logItem = recentLogs[lIdx]
        var pStr = logItem.getString('payload') || ''
        try {
          var pObj = JSON.parse(pStr)
          var sentText = pObj.full_text || pObj.preview || ''
          if (sentText) {
            var normSent = normalizeTextForDedup(sentText)
            if (
              normSent === normalizedCurrent ||
              (normSent.length >= 80 && normalizedCurrent.indexOf(normSent) === 0)
            ) {
              console.log(
                '[BIA_PERSISTENCE] DEDUP ATIVADO: Mensagem já enviada anteriormente para ' +
                  customerId +
                  '. Bloqueando duplicata.',
              )
              return false
            }
          }
        } catch (_) {}
      }
    } catch (dedupErr) {
      console.warn('[BIA_PERSISTENCE] Aviso dedup: ' + dedupErr.message)
    }

    // REGRA DE OURO (Mauro):
    // Na régua de retomada/remarketing (1º disparo): NENHUM link e NENHUM anexo.
    // O PDF só é entregue mediante resposta "Sim" pelo interceptor em ai_auto_reply.js.
    // Se for passo com anexo explícito autorizado (ex: prometido ou outra rotina):
    var textToSend = cleaned
    if (
      stepName !== 'remarketing' &&
      stepName !== 'nurturing_monthly' &&
      documentMedia &&
      documentMedia.link
    ) {
      var directLink = documentMedia.link
      if (textToSend.indexOf(directLink) === -1) {
        var docLabel = documentMedia.caption || 'Material oficial'
        textToSend = textToSend + '\n\n📄 *' + docLabel + ':*\n' + directLink
      }
    }

    // Registrar conversa na tabela conversations
    try {
      var convCol = app.findCollectionByNameOrId('conversations')
      var conv = new Record(convCol)
      conv.set('user_id', userId || customer.getString('user_id') || '')
      conv.set('customer_id', customerId)
      conv.set('sender', 'ai')
      conv.set('content', textToSend)
      conv.set('channel', 'whatsapp')
      app.save(conv)
    } catch (cErr) {
      console.warn('[BIA_PERSISTENCE] Aviso ao registrar conversa: ' + cErr.message)
    }

    // Disparo HTTP de texto para a Meta Graph API v21.0
    var url = 'https://graph.facebook.com/v21.0/' + phoneId + '/messages'
    var isOk = false
    var sendRes = null

    try {
      sendRes = $http.send({
        url: url,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'text',
          text: { preview_url: true, body: textToSend },
        }),
        timeout: 20,
      })

      if (sendRes && sendRes.statusCode >= 200 && sendRes.statusCode < 300) {
        isOk = true
      }
    } catch (httpErr) {
      console.error('[BIA_PERSISTENCE] Erro HTTP Meta: ' + httpErr.message)
    }

    // Se o envio do texto teve sucesso e há documento a anexar:
    // REGRA DE OURO (Mauro): na régua de retomada/remarketing não vai documento.
    var docSent = false
    if (
      isOk &&
      stepName !== 'remarketing' &&
      stepName !== 'nurturing_monthly' &&
      documentMedia &&
      documentMedia.link
    ) {
      try {
        var docPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'document',
          document: {
            link: documentMedia.link,
            filename: documentMedia.filename || 'Material.pdf',
          },
        }
        if (documentMedia.caption) {
          docPayload.document.caption = documentMedia.caption
        }

        var docRes = $http.send({
          url: url,
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(docPayload),
          timeout: 25,
        })
        if (docRes && docRes.statusCode >= 200 && docRes.statusCode < 300) {
          docSent = true
          console.log('[BIA_PERSISTENCE] Documento WhatsApp enviado com sucesso para ' + toPhone)
        } else {
          console.warn(
            '[BIA_PERSISTENCE] Envio do documento retornou status ' +
              (docRes ? docRes.statusCode : 'null') +
              ' (link já entregue no corpo do texto)',
          )
        }
      } catch (docErr) {
        console.warn('[BIA_PERSISTENCE] Falha ao enviar anexo de documento: ' + docErr.message)
      }
    }

    // Registrar system_logs (type='whatsapp_ai_send')
    try {
      var logsCol = app.findCollectionByNameOrId('system_logs')
      var logRec = new Record(logsCol)
      logRec.set('user_id', userId || '')
      logRec.set('type', 'whatsapp_ai_send')
      logRec.set(
        'message',
        isOk
          ? 'Retomada de persistência (' +
              (stepName || 'followup') +
              ') enviada com sucesso para ' +
              toPhone +
              (docSent ? ' [com documento anexo]' : '')
          : 'Falha ao enviar retomada de persistência (' +
              (stepName || 'followup') +
              ') para ' +
              toPhone,
      )
      logRec.set(
        'details',
        JSON.stringify({
          statusCode: sendRes ? sendRes.statusCode : 0,
          response: sendRes ? sendRes.json || sendRes.body : null,
          phone_id: phoneId,
          to: toPhone,
          step: stepName || '',
          customer_id: customerId,
          document_sent: docSent,
          document_info: documentMedia
            ? { filename: documentMedia.filename, link: documentMedia.link }
            : null,
        }),
      )
      logRec.set(
        'payload',
        JSON.stringify({
          preview: cleaned.substring(0, 120),
          full_text: cleaned,
          customer_id: customerId,
          follow_up_step: stepName || '',
          document_sent: docSent,
        }),
      )
      app.saveNoValidate(logRec)
    } catch (logErr) {
      console.warn('[BIA_PERSISTENCE] Falha ao gravar log whatsapp_ai_send: ' + logErr.message)
    }

    return isOk
  }

  // ============================================================================
  // 2. FORMATAÇÃO E SANITIZAÇÃO DE TEXTO DO WHATSAPP
  // ============================================================================
  function cleanWhatsAppFormat(text, isRemarketing) {
    if (!text || typeof text !== 'string') return ''
    var out = text

    // Remove tags de máquina internas e colchetes
    out = out.replace(/\[STATUS:[^\]]*\]/gi, '')
    out = out.replace(/\[PHASE:[^\]]*\]/gi, '')
    out = out.replace(/\[FOLLOW_UP_STEP:[^\]]*\]/gi, '')
    out = out.replace(/\[PROMISE_CONTEXT:[^\]]*\]/gi, '')
    out = out.replace(/\[PROMISE_PENDING:[^\]]*\]/gi, '')
    out = out.replace(/\[HANDOVER:[^\]]*\]/gi, '')
    out = out.replace(/\[PERMUTA\]/gi, '')
    out = out.replace(/\[PROFILE:[^\]]*\]/gi, '')
    out = out.replace(/\[PRICE_RANGE:[^\]]*\]/gi, '')
    out = out.replace(/\[NEIGHBORHOOD:[^\]]*\]/gi, '')
    out = out.replace(/\[URGENCY:[^\]]*\]/gi, '')
    out = out.replace(/\[AUDIO\]/gi, '')
    out = out.replace(/\[VIDEO\]/gi, '')

    // Remove markdown inválido no WhatsApp
    out = out.replace(/^#{1,6}\s+/gm, '')
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$1: $2')

    // Normaliza quebras triplas
    out = out.replace(/\n{3,}/g, '\n\n')

    // REGRA DE OURO (Mauro):
    // Os 4 textos de Remarketing/Retomada aprovados têm entre 800 e 1100 caracteres.
    // NUNCA truncar textos de remarketing/retomada!
    // Para follow-ups curtos (D+1, D+3...), manter limite de segurança alto (1500 chars).
    if (!isRemarketing && out.length > 1500) {
      var truncated = out.substring(0, 1500)
      var lastPeriod = Math.max(
        truncated.lastIndexOf('.\n'),
        truncated.lastIndexOf('!\n'),
        truncated.lastIndexOf('?\n'),
        truncated.lastIndexOf('\n\n'),
        truncated.lastIndexOf('.'),
      )
      if (lastPeriod > 1000) {
        out = truncated.substring(0, lastPeriod + 1).trim()
      } else {
        out = truncated.trim() + '...'
      }
    }
    return out.trim()
  }

  function normalizeTextForDedup(txt) {
    if (!txt) return ''
    return String(txt).replace(/\s+/g, ' ').trim().toLowerCase()
  }

  // ============================================================================
  // 3. JANELA DE HORÁRIO COMERCIAL (America/Sao_Paulo UTC-3: 08h00 às 18h00, seg a sáb)
  // ============================================================================
  function isBrasiliaBusinessHours() {
    var now = new Date()
    var utcTime = now.getTime() + now.getTimezoneOffset() * 60000
    var brTime = new Date(utcTime - 3 * 3600000)
    var dayOfWeek = brTime.getDay()
    if (dayOfWeek === 0) return false // Domingo pausado por respeito comercial

    var hours = brTime.getHours()
    return hours >= 8 && hours < 18
  }

  if (!isBrasiliaBusinessHours()) {
    console.log(
      '[BIA_PERSISTENCE] Fora da janela de atendimento de Brasília (08h-18h seg-sáb). Pausando execução.',
    )
    return
  }

  // ============================================================================
  // 4. CARREGAR TEXTO ÚNICO DA BIA (bia_learnings id tYVJIdIFb5rW4iq, prioridade 1000)
  // ============================================================================
  var sovereignRuleText = ''
  try {
    var sovereignRec = app.findRecordById('bia_learnings', 'tYVJIdIFb5rW4iq')
    if (sovereignRec && sovereignRec.getBool('is_active')) {
      sovereignRuleText = sovereignRec.getString('rule_text') || ''
    }
  } catch (_) {}

  if (!sovereignRuleText) {
    try {
      var activeLearnings = app.findRecordsByFilter(
        'bia_learnings',
        'is_active = true',
        '-priority,-created',
        1,
        0,
      )
      if (activeLearnings && activeLearnings.length > 0) {
        sovereignRuleText = activeLearnings[0].getString('rule_text') || ''
      }
    } catch (_) {}
  }

  // ============================================================================
  // 5. RESOLVER USUÁRIO E CREDENCIAIS META DO SISTEMA
  // ============================================================================
  var activeUserRecord = null
  try {
    var usersWithMeta = app.findRecordsByFilter(
      'users',
      "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
      '-created',
      1,
      0,
    )
    if (usersWithMeta.length > 0) {
      activeUserRecord = usersWithMeta[0]
    }
  } catch (_) {}

  // ============================================================================
  // 6. AQUISIÇÃO E LIBERAÇÃO DA TRAVA ai_processing COM TTL 3 MIN (180000ms)
  // ============================================================================
  var lockTtlMs = 180000

  function acquireLock(customerId) {
    var acquired = false
    try {
      app.runInTransaction(function (txApp) {
        var cust = txApp.findRecordById('customers', customerId)
        var rawTags = cust.get('tags')
        var tags = []
        if (Array.isArray(rawTags)) {
          tags = rawTags.filter(function (t) {
            return typeof t === 'string'
          })
        } else if (typeof rawTags === 'string') {
          try {
            var p = JSON.parse(rawTags)
            if (Array.isArray(p))
              tags = p.filter(function (t) {
                return typeof t === 'string'
              })
          } catch (_) {}
        }

        var nowMs = new Date().getTime()
        var lockPrefix = 'ai_processing:'
        var activeLock = false

        for (var i = 0; i < tags.length; i++) {
          var t = tags[i]
          if (t.indexOf(lockPrefix) === 0) {
            var lockTime = parseInt(t.substring(lockPrefix.length), 10)
            if (!isNaN(lockTime) && nowMs - lockTime < lockTtlMs) {
              activeLock = true
              break
            }
          }
        }

        if (activeLock) {
          throw new Error('LOCKED')
        }

        var newTags = tags.filter(function (t) {
          return t !== 'ai_processing' && t.indexOf('ai_processing:') !== 0
        })
        newTags.push('ai_processing:' + nowMs)
        cust.set('tags', newTags)
        txApp.saveNoValidate(cust)
        acquired = true
      })
    } catch (err) {
      if (err.message !== 'LOCKED') {
        console.warn(
          '[BIA_PERSISTENCE] Erro na trava ai_processing para ' + customerId + ': ' + err.message,
        )
      }
      return false
    }
    return acquired
  }

  function releaseLock(customerId) {
    try {
      var cust = app.findRecordById('customers', customerId)
      var rawTags = cust.get('tags')
      var tags = []
      if (Array.isArray(rawTags)) {
        tags = rawTags.filter(function (t) {
          return typeof t === 'string'
        })
      } else if (typeof rawTags === 'string') {
        try {
          var p = JSON.parse(rawTags)
          if (Array.isArray(p))
            tags = p.filter(function (t) {
              return typeof t === 'string'
            })
        } catch (_) {}
      }

      var cleanedTags = tags.filter(function (t) {
        return t !== 'ai_processing' && t.indexOf('ai_processing:') !== 0
      })
      cust.set('tags', cleanedTags)
      app.saveNoValidate(cust)
    } catch (_) {
      try {
        app
          .db()
          .newQuery(
            "UPDATE customers SET tags = (SELECT json_group_array(value) FROM json_each(customers.tags) WHERE value NOT LIKE 'ai_processing%') WHERE id = {:id}",
          )
          .bind({ id: customerId })
          .execute()
      } catch (_) {}
    }
  }

  // ============================================================================
  // 7. DETECÇÃO DE THREAD AUTOMATIZADA / BOT (ANTI-BOT SYSTEM MESSAGES)
  // ============================================================================
  function isAutomatedThreadOrBot(customerRecord, lastConv) {
    var custName = customerRecord.getString('name') || ''
    var lastContent = lastConv ? lastConv.getString('content') || '' : ''

    // 1. Telefone/Nome com indicativo de robô/sistema
    var lowerName = custName.toLowerCase()
    if (
      lowerName.includes('bot') ||
      lowerName.includes('auto reply') ||
      lowerName.includes('resposta automática') ||
      lowerName.includes('atendimento virtual') ||
      lowerName.includes('meta business')
    ) {
      return true
    }

    // 2. Mensagem com termos inequívocos de auto-resposta/bot
    var lowerMsg = lastContent.toLowerCase()
    if (
      lowerMsg.includes('esta é uma mensagem automática') ||
      lowerMsg.includes('esta e uma mensagem automatica') ||
      lowerMsg.includes('mensagem gravada automaticamente') ||
      (lowerMsg.includes('horário de atendimento') && lowerMsg.includes('retornaremos')) ||
      lowerMsg.includes('não responda a este número') ||
      lowerMsg.includes('nao responda a este numero') ||
      lowerMsg.includes('digite 1 para') ||
      lowerMsg.includes('digite uma opção') ||
      lowerMsg.includes('digite uma opcao') ||
      lowerMsg.includes('escolha uma das opções') ||
      lowerMsg.includes('protocolo de atendimento:') ||
      lowerMsg.includes('responda a pesquisa do meu atendimento') ||
      lowerMsg.includes('sua opinião é muito importante para nós') ||
      lowerMsg.includes('como você classifica nosso atendimento') ||
      lowerMsg.includes('continue setting up your account')
    ) {
      return true
    }

    return false
  }

  // ============================================================================
  // 8. PARSER DE VARIANTES DA RÉGUA EXTRAÍDO DINAMICAMENTE DO TEXTO ÚNICO
  // ============================================================================
  // OS 4 TEXTOS APROVADOS PELO MAURO PARA A RÉGUA DE RETOMADA (VERBATIM E CANÔNICOS)
  var CANONICAL_MAURO_REMARKETING_TEMPLATES = [
    'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade de investimento.\n\nSão José foi a cidade que mais valorizou imóveis residenciais em Santa Catarina em 2025: alta de 11,31% no ano e cerca de 50% de valorização acumulada nos últimos três anos.\n\nBarreiros concentra hoje o segundo metro quadrado mais valorizado da cidade: R$ 9.172/m².\n\nA AJ Coelho acaba de lançar o Vistage Residence neste endereço.\n\nPreparamos um ebook completo, com plantas, valores e condições de pagamento.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro.',
    'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade de investimento.\n\nSão José está entre as três melhores cidades do país para investimento em imóveis na planta: rentabilidade média de 19,7% ao ano e aluguel rendendo cerca de 5,5% ao ano, acima da média nacional.\n\nO Vistage Residence, novo lançamento da AJ Coelho em Barreiros, reúne essas condições em um único endereço.\n\nOrganizamos um ebook com todas as informações do empreendimento e das unidades disponíveis.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro.',
    'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade.\n\nBarreiros é um dos bairros mais completos de São José: acesso direto à BR-101, perto de Florianópolis, com comércio, escolas, universidades e serviços no dia a dia.\n\nÉ um endereço que une qualidade de vida e valorização constante.\n\nA AJ Coelho, com mais de 30 anos na Grande Florianópolis, lança aí o Vistage Residence: 79 apartamentos, plantas a partir de 63 m², rooftop com piscina e academia, mercado no condomínio e espaço pet.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro.',
    'Olá, [nome]. Sou a Bia, da BRF Imóveis.\n\nComo você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade.\n\nO Vistage Residence é o mais novo lançamento da AJ Coelho em Barreiros: 79 unidades, com plantas de 2 e 3 dormitórios, apartamentos garden e cobertura de 296 m².\n\nA entrega está prevista para dezembro de 2030, com unidades a partir de R$ 608 mil — valor abaixo da média praticada no bairro.\n\nPor ser lançamento, as primeiras unidades são comercializadas em condições diferenciadas.\n\nReunimos todas as informações em um ebook exclusivo.\n\nPara receber em primeira mão e escolher a melhor planta, basta responder OK.\n\nSe não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro.',
  ]

  function extractTemplatesFromConstitution(ruleText) {
    var defaultTemplates = {
      remarketing: CANONICAL_MAURO_REMARKETING_TEMPLATES.slice(),
      d1: [
        '{SAUDACAO} Passando para saber se você conseguiu dar uma olhada na opção{CONTEXTO_IMOVEL} ou se ficou alguma dúvida sobre a localização, planta ou fluxo inicial.',
        '{SAUDACAO} Lembrei da sua busca imobiliária e separei novidades na região que você procurou — quer que eu te conte o que encontrei?',
        '{SAUDACAO} Conseguiu avaliar com calma o que conversamos{CONTEXTO_IMOVEL}? Se quiser que eu te mostre algum detalhe da planta ou da região, me avise por aqui!',
      ],
      d3: [
        '{SAUDACAO} Separei um diferencial marcante{CONTEXTO_IMOVEL}: a valorização projetada na região e as áreas de lazer completas têm chamado bastante atenção. Gostaria de dar uma olhada na planta detalhada ou nas opções de unidades disponíveis?',
        '{SAUDACAO} Um ponto muito elogiado{CONTEXTO_IMOVEL} é o aproveitamento dos espaços e o lazer pensado para a rotina da família. Quer que eu te envie a disposição das áreas de lazer?',
        '{SAUDACAO} Pensando no seu interesse{CONTEXTO_IMOVEL}, vale destacar a infraestrutura do entorno e o potencial de valorização do endereço. Faz sentido para o seu momento conhecer mais desse ponto?',
      ],
      d7: [
        '{SAUDACAO} Gostaria de verificar se a compra do imóvel ainda está no seu radar para este mês. Conseguimos condições bem facilitadas de entrada e parcelamento{CONTEXTO_IMOVEL}. Como estão os seus planos por aí?',
        '{SAUDACAO} Surgiram condições bem diferenciadas de fluxo e entrada flexível{CONTEXTO_IMOVEL}. Como está o seu planejamento para dar esse passo nas próximas semanas?',
        '{SAUDACAO} Passando para checar como estão seus planos imobiliários este mês. Temos formatos de pagamento bem acessíveis{CONTEXTO_IMOVEL}. Posso te mostrar como fica a estimativa de entrada?',
      ],
      d14: [
        '{SAUDACAO} Espero que esteja tudo ótimo! Como não tivemos retorno recente, passo para checar se a sua busca por imóvel ainda continua ativa{CONTEXTO_IMOVEL} ou se prefere pausar por enquanto. O corretor Mauro e eu estamos sempre à disposição por aqui!',
        '{SAUDACAO} Tudo bem? Só passando para confirmar se seus planos para compra de imóvel continuam firmes{CONTEXTO_IMOVEL} ou se você prefere retomar mais adiante. Sem compromisso, conte sempre com a gente!',
        '{SAUDACAO} Sei que a rotina é corrida! Passo apenas para saber se faz sentido mantermos o contato sobre sua busca imobiliária{CONTEXTO_IMOVEL} ou se você prefere um tempo. Estamos à sua disposição por aqui.',
      ],
    }

    if (!ruleText || typeof ruleText !== 'string') {
      return defaultTemplates
    }

    // Parser robusto para blocos multilinhas de variantes
    function extractMultiLineVariants(sectionHeaderRegex) {
      var lines = ruleText.split('\n')
      var inSection = false
      var list = []
      var currentBlock = null

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i]
        if (sectionHeaderRegex.test(line)) {
          inSection = true
          continue
        }
        if (inSection) {
          // Fim da seção ao encontrar próximo degrau ou item numerado fora de variante
          if (line.match(/^(\s*-\s*Degrau|\s*###|\s*##)/i) && !line.match(/VARIANTE/i)) {
            if (currentBlock) {
              list.push(currentBlock.trim())
              currentBlock = null
            }
            break
          }

          // Início de nova variante: [VARIANTE X ...] ou VARIANTE X
          var vStartMatch = line.match(
            /(?:\[VARIANTE\s*\d+[^\]]*\]|VARIANTE\s*\d+[^:]*)\s*:\s*(.*)/i,
          )
          if (vStartMatch) {
            if (currentBlock) {
              list.push(currentBlock.trim())
            }
            var firstLine = (vStartMatch[1] || '').trim()
            // Remove aspas de abertura se houver
            firstLine = firstLine.replace(/^["“]/, '')
            currentBlock = firstLine
          } else if (currentBlock !== null) {
            // Continuação do bloco multilinha da variante atual
            var cleanLine = line
            // Se encontrar aspas de fechamento no final da linha
            if (cleanLine.endsWith('"') || cleanLine.endsWith('”')) {
              cleanLine = cleanLine.substring(0, cleanLine.length - 1)
            }
            currentBlock += '\n' + cleanLine
          }
        }
      }

      if (currentBlock) {
        list.push(currentBlock.trim())
      }

      var filtered = []
      for (var j = 0; j < list.length; j++) {
        var item = list[j]
          .replace(/^["“]/, '')
          .replace(/["”]$/, '')
          .trim()
        // Uma variante da régua precisa ter pelo menos 250 caracteres (corpo completo aprovado por Mauro)
        if (item.length >= 250) {
          filtered.push(item)
        }
      }

      return filtered.length > 0 ? filtered : null
    }

    try {
      var rem = extractMultiLineVariants(
        /(?:Degrau\s*Remarketing|Rotação\s*Determinística|Versões\s*Aprovadas)/i,
      )
      // SÓ aceita sobrescrever se cada variante tiver texto substancial e corpo completo
      if (rem && rem.length >= 3) {
        var allComplete = true
        for (var k = 0; k < rem.length; k++) {
          if (rem[k].length < 250 || rem[k].indexOf('responder OK') === -1) {
            allComplete = false
            break
          }
        }
        if (allComplete) {
          defaultTemplates.remarketing = rem
        } else {
          console.warn(
            '[BIA_PERSISTENCE] Variantes extraídas do Texto Único incompletas. Mantendo canônicos de Mauro.',
          )
        }
      }
    } catch (parseErr) {
      console.warn('[BIA_PERSISTENCE] Erro no parser de variantes: ' + parseErr.message)
    }

    return defaultTemplates
  }

  var parsedTemplates = extractTemplatesFromConstitution(sovereignRuleText)

  // ============================================================================
  // 9. RESOLUÇÃO DINÂMICA DO LANÇAMENTO, LOCALIZAÇÃO E MATERIAL NA BASE
  // ============================================================================
  //
  // REGRA DE OURO (Mauro):
  // 1. NUNCA afirmar ou pressupor que um material foi enviado se ele não foi.
  // 2. O fallback para o lançamento vigente principal SÓ é permitido para o texto
  //    de REMARKETING ("Um tempo atrás você entrou em contato... tomei a liberdade
  //    de enviar esta oportunidade da [LANÇAMENTO] em [BAIRRO/CIDADE]").
  // 3. Nos degraus consultivos de follow-up (D+1, D+3, D+7, D+14), que dizem
  //    "passando para saber se você conseguiu dar uma olhada na opção em relação ao X",
  //    o imóvel SÓ pode ser citado se houver foco real E apresentação prévia
  //    comprovada no histórico de conversas do cliente.
  // 4. O e-book/book SÓ pode ser prometido no texto "(envio junto o e-book)" se o
  //    arquivo físico/link existir de fato na Base de Conhecimento (ai_knowledge_files).
  // ============================================================================

  /**
   * Detecta se o cliente já recebeu de fato uma apresentação de imóvel no histórico.
   * Retorna objeto com:
   * - hasPresentation: boolean
   * - propertyId: string (ID da property se identificada)
   * - propertyTitle: string (Título da property)
   * - code: string (Código da property se identificado)
   */
  function checkCustomerPresentationHistory(customer, conversationsList) {
    var hist = {
      hasPresentation: false,
      propertyId: '',
      propertyTitle: '',
      code: '',
    }

    var customerId = customer.id

    // 1. Detectar imóvel em foco no próprio registro do cliente (notes, origin_history, tags)
    var cNotes = customer.getString('notes') || ''
    var cOriginHist = customer.getString('origin_history') || ''
    var combinedCustText = cNotes + ' ' + cOriginHist

    var codeMatch = combinedCustText.match(/(?:#|\b)(AP|LM|TR|SO|CA|ARU)\s*(\d+)\b/i)
    if (codeMatch) {
      hist.code = (codeMatch[1] + codeMatch[2]).toUpperCase()
      try {
        var foundProps = app.findRecordsByFilter(
          'properties',
          "is_active = true && (code = '" +
            hist.code +
            "' || code = '" +
            codeMatch[1].toUpperCase() +
            ' ' +
            codeMatch[2] +
            "')",
          '-updated',
          1,
          0,
        )
        if (foundProps && foundProps.length > 0) {
          hist.propertyId = foundProps[0].id
          hist.propertyTitle =
            foundProps[0].getString('title') || foundProps[0].getString('code') || ''
        }
      } catch (_) {}
    }

    // 2. Analisar histórico real de conversas da Bia / AI com este cliente
    var convs = conversationsList || []
    if (convs.length === 0) {
      try {
        convs = app.findRecordsByFilter(
          'conversations',
          "customer_id = '" + customerId + "'",
          '-created',
          20,
          0,
        )
      } catch (_) {}
    }

    if (!convs || convs.length === 0) {
      // Cliente NUNCA teve conversas registradas (ex.: recém-importado do Google Contacts)
      return hist
    }

    // Palavras/padrões de apresentação/envio de material pela IA ou corretor:
    // Tolerante a variações, tags [STATUS], [PHASE], [PROMISE_*] e menções a lançamentos
    var presentationPatterns = [
      /\[STATUS:\s*.*?Apresentação/i,
      /\[STATUS:\s*3\b/i,
      /\[PHASE:\s*(?:apresentação|apresentacao)/i,
      /\[PROMISE_/i,
      /a partir de r\$\s*[\d\.]+/i,
      /valor a partir de/i,
      /plantas? de \d+/i,
      /dormit[óo]rios c\//i,
      /apresento o /i,
      /apresento a /i,
      /conhecer o lan[çc]amento/i,
      /dossi[êe]/i,
      /brfimoveis\.com\.br\//i,
      /envio (o |o e-|o pdf|as fotos|a apresenta)/i,
      /enviando (o |o e-|o pdf|as fotos|a apresenta)/i,
      /segue o (material|book|e-book|link|dossi[êe])/i,
      /d[êe] uma olhada no lan[çc]amento/i,
      /rooftop com piscina/i,
      /residence barreiros/i,
      /vistage residence/i,
      /vistage/i,
      /guarda(ei|mos) o vistage/i,
      /separei (o |uma oportunidade|o vistage)/i,
    ]

    for (var i = 0; i < convs.length; i++) {
      var convRec = convs[i]
      var content = convRec.getString('content') || ''
      var sender = convRec.getString('sender') || ''

      // A apresentação deve ter partido da IA ou de corretor humano para o cliente
      if (sender === 'ai' || sender === 'agent' || sender === 'system') {
        // Ignora mensagens que são a própria retomada D+1 que disparou errada hoje
        if (
          content.indexOf('Passando para saber se você conseguiu dar uma olhada na opção') !== -1 ||
          content.indexOf('Conseguiu avaliar com calma o que conversamos em relação ao') !== -1
        ) {
          continue
        }

        for (var p = 0; p < presentationPatterns.length; p++) {
          if (presentationPatterns[p].test(content)) {
            hist.hasPresentation = true
            break
          }
        }

        // Tentar identificar menção a código de imóvel na mensagem de apresentação
        if (!hist.propertyId) {
          var matchInMsg = content.match(/(?:#|\b)(AP|LM|TR|SO|CA|ARU)\s*(\d+)\b/i)
          if (matchInMsg) {
            hist.code = (matchInMsg[1] + matchInMsg[2]).toUpperCase()
            try {
              var pByMsg = app.findRecordsByFilter(
                'properties',
                "is_active = true && (code = '" +
                  hist.code +
                  "' || code = '" +
                  matchInMsg[1].toUpperCase() +
                  ' ' +
                  matchInMsg[2] +
                  "')",
                '-updated',
                1,
                0,
              )
              if (pByMsg && pByMsg.length > 0) {
                hist.propertyId = pByMsg[0].id
                hist.propertyTitle =
                  pByMsg[0].getString('title') || pByMsg[0].getString('code') || ''
              }
            } catch (_) {}
          }
        }

        // Se citou Vistage Residence especificamente na apresentação
        if (!hist.propertyId && /vistage/i.test(content)) {
          try {
            var vProps = app.findRecordsByFilter(
              'properties',
              "is_active = true && title ~ 'Vistage'",
              '-updated',
              1,
              0,
            )
            if (vProps && vProps.length > 0) {
              hist.propertyId = vProps[0].id
              hist.propertyTitle = vProps[0].getString('title') || vProps[0].getString('code') || ''
            }
          } catch (_) {}
        }

        if (hist.hasPresentation && hist.propertyId) {
          break
        }
      }
    }

    return hist
  }

  /**
   * Resolução de dados do imóvel/lançamento e material de apoio.
   *
   * @param {Record} customer - Registro do cliente
   * @param {string} step - Degrau pretendido ('remarketing', 'd1', 'd3', 'd7', 'd14')
   * @param {Array} conversationsList - Histórico recente de conversas do cliente
   * @param {Object} presentationHistory - Resultado de checkCustomerPresentationHistory
   */
  function resolveLaunchAndKnowledgeData(customer, step, conversationsList, presentationHistory) {
    var result = {
      launchName: '',
      location: '',
      materialText: '',
      documentMedia: null,
      propertyId: '',
      propertyTitle: '',
      hasPriorPresentation: false,
      allowPropertyMention: false,
    }

    var presHist =
      presentationHistory || checkCustomerPresentationHistory(customer, conversationsList)
    result.hasPriorPresentation = presHist.hasPresentation

    var isRemarketingStep = step === 'remarketing' || step === 'nurturing_monthly'

    var focusProperty = null

    // 1. Se há imóvel identificado na apresentação prévia OU no cadastro do cliente
    if (presHist.propertyId) {
      try {
        focusProperty = app.findRecordById('properties', presHist.propertyId)
      } catch (_) {}
    }

    if (focusProperty) {
      result.propertyId = focusProperty.id
      result.propertyTitle =
        focusProperty.getString('title') || focusProperty.getString('code') || ''
      result.launchName = focusProperty.getString('title') || 'Lançamento'
      var neighF = focusProperty.getString('neighborhood') || ''
      var cityF = focusProperty.getString('city') || ''
      if (neighF && cityF) {
        result.location = neighF + ' / ' + cityF
      } else {
        result.location = neighF || cityF || 'na Grande Florianópolis'
      }
      // Nos degraus D+1/D+3/D+7/D+14, só permite citar o imóvel se realmente houve apresentação prévia
      if (result.hasPriorPresentation) {
        result.allowPropertyMention = true
      }
    }

    // 2. Se for REMARKETING (e apenas no REMARKETING), podemos recorrer ao lançamento vigente
    //    principal como oportunidade ativa a ser apresentada
    if (isRemarketingStep && (!focusProperty || !result.launchName)) {
      try {
        var pubLaunches = app.findRecordsByFilter(
          'launches',
          "status = 'publicado'",
          '-updated',
          1,
          0,
        )
        if (pubLaunches && pubLaunches.length > 0) {
          var pLaunch = pubLaunches[0]
          var lName = pLaunch.getString('enterprise_name') || pLaunch.getString('name') || ''
          var lLoc = pLaunch.getString('location') || ''
          result.launchName = lName
          result.location = lLoc

          var matchedProps = app.findRecordsByFilter(
            'properties',
            "is_active = true && title ~ '" + (pLaunch.getString('name') || 'Lançamento') + "'",
            '-updated',
            1,
            0,
          )
          if (matchedProps && matchedProps.length > 0) {
            focusProperty = matchedProps[0]
            result.propertyId = focusProperty.id
            result.propertyTitle =
              focusProperty.getString('title') || focusProperty.getString('code') || ''
          }
        }
      } catch (_) {}

      // Fallback adicional para properties de lançamento ativo
      if (!focusProperty && !result.launchName) {
        try {
          var activeLms = app.findRecordsByFilter(
            'properties',
            "is_active = true && (code ~ 'LM' || property_type ~ 'lancamento')",
            '-updated',
            1,
            0,
          )
          if (activeLms && activeLms.length > 0) {
            focusProperty = activeLms[0]
            result.propertyId = focusProperty.id
            result.propertyTitle =
              focusProperty.getString('title') || focusProperty.getString('code') || ''
            result.launchName = focusProperty.getString('title') || 'Lançamento'
            var neighLm = focusProperty.getString('neighborhood') || ''
            var cityLm = focusProperty.getString('city') || ''
            result.location =
              neighLm && cityLm
                ? neighLm + ' / ' + cityLm
                : neighLm || cityLm || 'na Grande Florianópolis'
          }
        } catch (_) {}
      }
    }

    if (!result.location) {
      result.location = 'na Grande Florianópolis'
    }

    // 3. Buscar material de apresentação legítimo na Base de Conhecimento (ai_knowledge_files)
    //
    // REGRAS RIGOROSAS DO PROPRIETÁRIO (Mauro):
    // (1) NUNCA prometer material que não é o material.
    // (2) 1ª apresentação SEM preço cheio — tabelas e políticas de vendas NUNCA podem ser enviadas
    //     como anexo ao cliente; são exclusivas para raciocínio interno da Bia.
    // (3) BLACKLIST estrita por nome: arquivos que comecem por ou contenham "TABELA",
    //     "POLITICA"/"POLÍTICA", "preço"/"preco", "valores" NUNCA podem ser selecionados
    //     como documentMedia / materialText.
    // (4) WHITELIST de material de apresentação: o material só é legítimo se o nome contiver
    //     "book", "ebook"/"e-book", "apresentaç"/"apresentac", "folder", ou for vídeo/pasta oficial
    //     de imagens com link público de Drive no extracted_text.
    // (5) Se não houver arquivo físico real nem link público de apresentação legítimo:
    //     documentMedia = null E materialText = '' (a mensagem sai sem "(envio junto o e-book)").
    //     Log: "[BIA_PERSISTENCE] Material de apresentação legítimo indisponível para <propertyId> — remarketing sai sem anexo"
    var pbBaseUrl =
      $os.getenv('PUBLIC_URL') ||
      $os.getenv('PB_PUBLIC_URL') ||
      $os.getenv('POCKETBASE_URL') ||
      $os.getenv('VITE_POCKETBASE_URL') ||
      $os.getenv('PB_INSTANCE_URL') ||
      'https://crm.brfimoveis.com.br'

    try {
      function isBlacklistedAttachment(nameStr) {
        if (!nameStr) return false
        var s = String(nameStr).toLowerCase().trim()
        if (
          s.includes('tabela') ||
          s.includes('politica') ||
          s.includes('política') ||
          s.includes('preco') ||
          s.includes('preço') ||
          s.includes('valores')
        ) {
          return true
        }
        return false
      }

      function isLegitimatePresentationName(nameStr) {
        if (!nameStr) return false
        var s = String(nameStr).toLowerCase().trim()
        if (
          s.includes('book') ||
          s.includes('ebook') ||
          s.includes('e-book') ||
          s.includes('apresentaç') ||
          s.includes('apresentac') ||
          s.includes('folder')
        ) {
          return true
        }
        return false
      }

      function extractDriveLinkFromText(txt) {
        if (!txt) return ''
        var m = String(txt).match(/https:\/\/drive\.google\.com\/[^\s\)"'\]]+/i)
        return m ? m[0] : ''
      }

      // Buscar candidatos em ai_knowledge_files (tanto com arquivo físico quanto registros com link de Drive)
      var candidateRecords = []
      if (result.propertyId) {
        try {
          candidateRecords = app.findRecordsByFilter(
            'ai_knowledge_files',
            "is_active = true && property_id = '" + result.propertyId + "'",
            '-updated',
            30,
            0,
          )
        } catch (_) {}
      }
      if ((!candidateRecords || candidateRecords.length === 0) && result.launchName) {
        var searchName = result.launchName
          .replace(/residence|residencial|edifício|lançamento/gi, '')
          .trim()
        if (searchName.length >= 3) {
          try {
            candidateRecords = app.findRecordsByFilter(
              'ai_knowledge_files',
              "is_active = true && (name ~ '" +
                searchName +
                "' || enterprise ~ '" +
                searchName +
                "')",
              '-updated',
              30,
              0,
            )
          } catch (_) {}
        }
      }

      // Fallback global de segurança para o lançamento oficial em foco (Vistage Residence):
      // Garante que o registro BOOK VISTAGE RESIDENCE.pdf (ID fcvyoatlxt56do2) seja sempre incluído!
      if (!candidateRecords || candidateRecords.length === 0) {
        try {
          var defaultBookRec = app.findRecordById('ai_knowledge_files', 'fcvyoatlxt56do2')
          if (defaultBookRec && defaultBookRec.getBool('is_active')) {
            candidateRecords = [defaultBookRec]
          }
        } catch (_) {}
      }

      var legitimateDocMedia = null
      var legitimateMaterialText = ''

      if (candidateRecords && candidateRecords.length > 0) {
        // Passo 3.1: Prioridade 1 — Arquivo físico no PocketBase (file != '') com nome de apresentação legítimo
        for (var fIdx = 0; fIdx < candidateRecords.length; fIdx++) {
          var recF = candidateRecords[fIdx]
          var rNameF = recF.getString('name') || ''
          var physFile = recF.getString('file') || ''
          var fSize = recF.getInt('file_size') || 0

          if (isBlacklistedAttachment(rNameF)) {
            continue
          }

          if (physFile && (fSize > 0 || physFile.length > 0)) {
            if (isLegitimatePresentationName(rNameF)) {
              var colIdentifier =
                recF.collectionId ||
                (typeof recF.collectionName === 'function'
                  ? recF.collectionName()
                  : recF.collectionName) ||
                'ai_knowledge_files'
              var physUrl =
                pbBaseUrl.replace(/\/$/, '') +
                '/api/files/' +
                colIdentifier +
                '/' +
                recF.id +
                '/' +
                physFile
              legitimateDocMedia = {
                link: physUrl,
                filename: rNameF.endsWith('.pdf') ? rNameF : rNameF + '.pdf',
                caption: 'Material oficial: ' + (result.launchName || 'Lançamento'),
              }
              legitimateMaterialText = 'o e-book do lançamento'
              break
            }
          }
        }

        // Passo 3.2: Prioridade 2 — Registro com link público do Google Drive no extracted_text
        // (folder, galeria, vídeo ou book com link público de compartilhamento)
        if (!legitimateDocMedia) {
          for (var dIdx = 0; dIdx < candidateRecords.length; dIdx++) {
            var recD = candidateRecords[dIdx]
            var rNameD = recD.getString('name') || ''
            var extText = recD.getString('extracted_text') || ''
            var mimeD = recD.getString('mime_type') || ''

            if (isBlacklistedAttachment(rNameD)) {
              continue
            }

            var driveUrl = extractDriveLinkFromText(extText)
            if (driveUrl) {
              // Somente documentos/arquivos de apresentação de verdade (PDF, vídeo, galeria/pasta).
              // Ignorar arquivos markdown (.md) como mídia anexável via WhatsApp.
              if (rNameD.toLowerCase().endsWith('.md')) {
                continue
              }

              var isLegit =
                isLegitimatePresentationName(rNameD) ||
                rNameD.toLowerCase().includes('vídeo') ||
                rNameD.toLowerCase().includes('video') ||
                rNameD.toLowerCase().includes('pasta pública') ||
                rNameD.toLowerCase().includes('pasta publica') ||
                rNameD.toLowerCase().includes('imagens e vídeos') ||
                rNameD.toLowerCase().includes('galeria') ||
                mimeD.indexOf('video') === 0 ||
                mimeD.indexOf('google-apps.folder') !== -1

              if (isLegit) {
                // Link de drive para envio via WhatsApp document ou link direto
                legitimateDocMedia = {
                  link: driveUrl,
                  filename: rNameD.indexOf('.') !== -1 ? rNameD : rNameD + '.pdf',
                  caption: 'Material oficial: ' + (result.launchName || 'Lançamento'),
                }
                if (
                  rNameD.toLowerCase().includes('vídeo') ||
                  rNameD.toLowerCase().includes('video')
                ) {
                  legitimateMaterialText = 'o vídeo do lançamento'
                } else if (isLegitimatePresentationName(rNameD)) {
                  legitimateMaterialText = 'o e-book do lançamento'
                } else {
                  legitimateMaterialText = 'o material oficial do lançamento'
                }
                break
              }
            }
          }
        }
      }

      if (legitimateDocMedia) {
        result.documentMedia = legitimateDocMedia
        result.materialText = legitimateMaterialText
      } else {
        result.documentMedia = null
        result.materialText = ''
        console.log(
          '[BIA_PERSISTENCE] Material de apresentação legítimo indisponível para ' +
            (result.propertyId || result.launchName || 'propriedade') +
            ' — remarketing sai sem anexo',
        )
      }
    } catch (kErr) {
      console.warn(
        '[BIA_PERSISTENCE] Erro ao buscar material na Base de Conhecimento: ' + kErr.message,
      )
      result.documentMedia = null
      result.materialText = ''
    }

    return result
  }

  // ============================================================================
  // 10. CONSTRUÇÃO DO TEXTO DAS RETOMADAS COM VARIÂNCIA E SORTEIO POR CLIENTE
  // ============================================================================
  function buildPersistenceMessageWithVariance(step, customer, launchInfo) {
    var rawName = (customer.getString('name') || customer.getString('first_name') || '').trim()
    var custName = ''
    var cleanDigitsOnly = rawName.replace(/\D/g, '')
    var isGenericPlaceholder =
      !rawName ||
      rawName.toLowerCase() === 'sem nome' ||
      rawName.toLowerCase().startsWith('sem nome') ||
      rawName.toLowerCase() === 'whatsapp' ||
      rawName.toLowerCase().includes('whatsapp business') ||
      rawName.startsWith('+') ||
      cleanDigitsOnly.length >= 8 ||
      /^\d+$/.test(rawName)
    if (!isGenericPlaceholder) {
      var candidate = rawName.split(' ')[0].replace(/[^\p{L}]/gu, '')
      if (candidate.length >= 2) {
        custName = candidate
      }
    }
    // Saudação com identificação oficial da Bia (Mauro):
    // Na 1ª mensagem / retomada / remarketing: "Bia da BRF Imóveis — bom dia/boa tarde/boa noite, tudo bem?" (com nome quando confiável)
    var brTimePersistence = new Date(Date.now() - 3 * 3600 * 1000)
    var pBrHour = brTimePersistence.getUTCHours()
    var pTimeWord = pBrHour < 12 ? 'bom dia' : pBrHour < 18 ? 'boa tarde' : 'boa noite'
    var greeting = custName
      ? 'Bia da BRF Imóveis — ' + pTimeWord + ', ' + custName + ', tudo bem?'
      : 'Bia da BRF Imóveis — ' + pTimeWord + ', tudo bem?'

    // Sorteio determinístico/variado por cliente
    function pickVariant(variantsList) {
      if (!variantsList || variantsList.length === 0) return ''
      var seed = 0
      var cId = customer.id || ''
      for (var i = 0; i < cId.length; i++) {
        seed = (seed * 31 + cId.charCodeAt(i)) % 1000007
      }
      var count = customer.getInt('follow_up_count') || 0
      var idx = (seed + count) % variantsList.length
      return variantsList[idx]
    }

    if (step === 'promised_followup') {
      var promiseContext =
        customer.getString('promise_context') || 'os detalhes atualizados com o Mauro'
      return (
        greeting +
        ' Conforme combinamos, estou passando para te dar o retorno sobre ' +
        promiseContext +
        '. O Mauro e eu estamos à disposição! Ficou alguma dúvida sobre os próximos passos?'
      )
    }

    // REGRA ESTRITA: só preenche contexto com o nome do imóvel se allowPropertyMention for verdadeiro
    // (isto é: se comprovadamente houve apresentação prévia desse imóvel para o cliente)
    var propContext = ''
    if (launchInfo.allowPropertyMention && launchInfo.propertyTitle) {
      propContext = ' em relação ao *' + launchInfo.propertyTitle + '*'
    } else {
      propContext = ''
    }

    if (step === 'remarketing' || step === 'nurturing_monthly') {
      // Rotação determinística entre os 4 textos da régua aprovados pelo Mauro (VERBATIM)
      var variantsToUse =
        parsedTemplates && parsedTemplates.remarketing && parsedTemplates.remarketing.length >= 3
          ? parsedTemplates.remarketing
          : CANONICAL_MAURO_REMARKETING_TEMPLATES
      var remTemplate = pickVariant(variantsToUse)
      if (!remTemplate || remTemplate.length < 250) {
        remTemplate = CANONICAL_MAURO_REMARKETING_TEMPLATES[0]
      }
      var textRem = remTemplate

      // REGRA DE OURO (Mauro):
      // Substituição do placeholder [nome]:
      // - Se o cliente tiver nome real identificado: "Olá, João. Sou a Bia..."
      // - Se o cliente NÃO tiver nome real (ex: sem nome, número): "Olá! Sou a Bia..."
      // JAMAIS gerar texto seco como "Olá, tudo bem. Sou a Bia..." sem o restante do corpo!
      if (custName) {
        textRem = textRem.replace(/Olá,\s*\[nome\]\./gi, 'Olá, ' + custName + '.')
        textRem = textRem.replace(/\[nome\]/g, custName)
      } else {
        textRem = textRem.replace(/Olá,\s*\[nome\]\./gi, 'Olá!')
        textRem = textRem.replace(/\[nome\]/g, '')
      }

      var lName = launchInfo.launchName || 'Vistage Residence'
      var lLoc = launchInfo.location || 'Barreiros'
      textRem = textRem.replace(/\[LANÇAMENTO\]/g, lName)
      textRem = textRem.replace(/\[BAIRRO\/CIDADE\]/g, lLoc)
      textRem = textRem.replace(/\{MATERIAL_ANEXO\}/g, '')
      textRem = textRem.replace(/\[MATERIAL\]/g, '')

      if (textRem.indexOf('{SAUDACAO}') !== -1) {
        textRem = textRem.replace(/\{SAUDACAO\}/g, pTimeWord)
      }

      return textRem
    }

    if (step === 'd1') {
      var d1Template = pickVariant(parsedTemplates.d1)
      var textD1 = d1Template.replace(/\{SAUDACAO\}/g, greeting)
      if (propContext) {
        textD1 = textD1.replace(/\{CONTEXTO_IMOVEL\}/g, propContext)
      } else {
        // Pergunta consultiva genérica e elegante sobre a busca (sem citar imóvel que nunca foi enviado)
        textD1 = textD1.replace(/\{CONTEXTO_IMOVEL\}/g, ' sobre a sua busca imobiliária')
      }
      return textD1
    }

    if (step === 'd3') {
      var d3Template = pickVariant(parsedTemplates.d3)
      var textD3 = d3Template.replace(/\{SAUDACAO\}/g, greeting)
      if (propContext) {
        textD3 = textD3.replace(/\{CONTEXTO_IMOVEL\}/g, propContext)
      } else {
        textD3 = textD3.replace(/\{CONTEXTO_IMOVEL\}/g, ' nas opções que temos na região')
      }
      return textD3
    }

    if (step === 'd7') {
      var d7Template = pickVariant(parsedTemplates.d7)
      var textD7 = d7Template.replace(/\{SAUDACAO\}/g, greeting)
      if (propContext) {
        textD7 = textD7.replace(/\{CONTEXTO_IMOVEL\}/g, propContext)
      } else {
        textD7 = textD7.replace(/\{CONTEXTO_IMOVEL\}/g, ' para os imóveis disponíveis')
      }
      return textD7
    }

    if (step === 'd14') {
      var d1Template14 = pickVariant(parsedTemplates.d14)
      var textD14 = d1Template14.replace(/\{SAUDACAO\}/g, greeting)
      if (propContext) {
        textD14 = textD14.replace(/\{CONTEXTO_IMOVEL\}/g, propContext)
      } else {
        textD14 = textD14.replace(/\{CONTEXTO_IMOVEL\}/g, '')
      }
      return textD14
    }

    return ''
  }

  function calculateNextFollowUp(step) {
    var nowMs = Date.now()
    if (step === 'remarketing') {
      // Após remarketing inicial, aguardar ~30 dias para o próximo toque mensal
      return new Date(nowMs + 30 * 24 * 3600 * 1000).toISOString()
    }
    if (step === 'd1') {
      // De D1 para D3: +2 dias (~48h)
      return new Date(nowMs + 2 * 24 * 3600 * 1000).toISOString()
    }
    if (step === 'd3') {
      // De D3 para D7: +4 dias (~96h)
      return new Date(nowMs + 4 * 24 * 3600 * 1000).toISOString()
    }
    if (step === 'd7') {
      // De D7 para D14: +7 dias (~168h)
      return new Date(nowMs + 7 * 24 * 3600 * 1000).toISOString()
    }
    if (step === 'd14' || step === 'nurturing_monthly') {
      // Ciclo mensal: ~30 dias
      return new Date(nowMs + 30 * 24 * 3600 * 1000).toISOString()
    }
    return ''
  }

  // ============================================================================
  // 11. EXECUÇÃO DAS RETOMADAS COM GUARDAS COMPLETAS E ANTI-FLOOD
  // ============================================================================
  var executedCount = 0
  var nowIso = new Date().toISOString()
  var nowMsGlobal = Date.now()
  var oneDayMs = 24 * 60 * 60 * 1000
  var sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  // 11.1 PRIORIDADE A: Promessas pendentes com prazo vencido
  try {
    var promiseCustomers = app.findRecordsByFilter(
      'customers',
      "promise_pending = true && is_blocked = false && tags !~ 'telefone_invalido' && tags !~ 'erro_numero_whatsapp' && (persistence_status = 'ativo' || persistence_status = 'aguardando_momento' || persistence_status = '')",
      '-promise_made_at',
      10,
      0,
    )

    for (var pIdx = 0; pIdx < promiseCustomers.length; pIdx++) {
      if (!isReguaActiveNow()) {
        console.log(
          '[BIA_PERSISTENCE] Régua pausada durante processamento de promessas. Abortando lote.',
        )
        break
      }
      var pCust = promiseCustomers[pIdx]
      var pCustId = pCust.id

      // Guarda 1: ai_paused nas tags
      var pTagsRaw = pCust.get('tags') || []
      var pTagsStr = JSON.stringify(pTagsRaw)
      if (pTagsStr.includes('ai_paused') || pCust.getBool('is_blocked')) continue

      // Guarda 2: Verificar conversas do cliente
      var pConvs = []
      try {
        pConvs = app.findRecordsByFilter(
          'conversations',
          "customer_id = '" + pCustId + "'",
          '-created',
          15,
          0,
        )
      } catch (_) {}

      if (pConvs.length > 0) {
        var pLatest = pConvs[0]
        var pLatestTime = new Date(pLatest.getString('created') || pLatest.get('created')).getTime()
        if (nowMsGlobal - pLatestTime < oneDayMs) continue
        if (isAutomatedThreadOrBot(pCust, pLatest)) continue
      }

      if (!acquireLock(pCustId)) continue

      try {
        var pPresHist = checkCustomerPresentationHistory(pCust, pConvs)
        var lInfoProm = resolveLaunchAndKnowledgeData(pCust, 'promised_followup', pConvs, pPresHist)
        var msgText = buildPersistenceMessageWithVariance('promised_followup', pCust, lInfoProm)
        var sent = sendPersistenceMarketingMessage(
          pCust,
          msgText,
          activeUserRecord,
          'promised_followup',
          null,
        )
        if (sent) {
          pCust.set('promise_pending', false)
          pCust.set('last_follow_up_at', nowIso)
          pCust.set('next_follow_up_at', new Date(Date.now() + 2 * oneDayMs).toISOString())
          pCust.set('follow_up_step', 'd3')
          pCust.set('follow_up_count', (pCust.getInt('follow_up_count') || 0) + 1)
          pCust.set('persistence_status', 'ativo')
          app.saveNoValidate(pCust)
          executedCount++
          console.log('[BIA_PERSISTENCE] Promessa cumprida para cliente ' + pCustId)
        }
      } finally {
        releaseLock(pCustId)
      }
    }
  } catch (pErr) {
    console.warn('[BIA_PERSISTENCE] Erro no bloco de promessas pendentes: ' + pErr.message)
  }

  // 11.2 AGENDADOS: Clientes com next_follow_up_at vencido
  // Processa em lote seguro por execução (máx 15 por ciclo de 15 min), respeitando anti-flood
  try {
    var scheduledBatchLimit = 15
    var scheduledCustomers = app.findRecordsByFilter(
      'customers',
      "next_follow_up_at != '' && next_follow_up_at <= '" +
        nowIso +
        "' && tags !~ 'telefone_invalido' && tags !~ 'erro_numero_whatsapp' && (persistence_status = 'ativo' || persistence_status = 'aguardando_momento' || persistence_status = '') && is_blocked = false",
      'next_follow_up_at',
      50,
      0,
    )

    for (var sIdx = 0; sIdx < scheduledCustomers.length; sIdx++) {
      if (!isReguaActiveNow()) {
        console.log(
          '[BIA_PERSISTENCE] Régua pausada durante processamento de agendados. Abortando lote.',
        )
        break
      }
      if (executedCount >= scheduledBatchLimit) {
        console.log(
          '[BIA_PERSISTENCE] Limite de lote seguro por execução alcançado (' +
            scheduledBatchLimit +
            '). Fila continua na próxima execução.',
        )
        break
      }

      var sCust = scheduledCustomers[sIdx]
      var sCustId = sCust.id

      // Guarda 1: ai_paused ou cliente bloqueado
      var sTagsRaw = sCust.get('tags') || []
      var sTagsStr = JSON.stringify(sTagsRaw).toLowerCase()
      if (sTagsStr.includes('ai_paused') || sCust.getBool('is_blocked')) continue

      // Guarda 2: Não disparar se marcado como frio ou recusa ("não é o momento")
      if (sTagsStr.includes('frio') || sTagsStr.includes('não é o momento')) continue

      var currentStep = sCust.getString('follow_up_step') || 'd1'

      // Guarda 3: Se o cliente já foi finalizado explicitamente, não processar
      if (currentStep === 'finalizado') {
        continue
      }

      // Guarda 4: Verificar conversas e última interação para assegurar silêncio real > 24h
      var sConvs = []
      try {
        sConvs = app.findRecordsByFilter(
          'conversations',
          "customer_id = '" + sCustId + "'",
          '-created',
          20,
          0,
        )
      } catch (_) {}

      var sLatestTime = 0
      var sLatest = null
      if (sConvs.length > 0) {
        sLatest = sConvs[0]
        var sDateStr = sLatest.getString('created') || sLatest.get('created')
        if (sDateStr) sLatestTime = new Date(sDateStr).getTime()
      }

      if (!sLatestTime) {
        var lastFuStr = sCust.getString('last_follow_up_at')
        if (lastFuStr) sLatestTime = new Date(lastFuStr).getTime()
      }
      if (!sLatestTime) {
        var lastSentStr = sCust.getString('last_sent_at')
        if (lastSentStr) sLatestTime = new Date(lastSentStr).getTime()
      }
      if (!sLatestTime) {
        var updStr = sCust.getString('updated') || sCust.get('updated')
        if (updStr) sLatestTime = new Date(updStr).getTime()
      }

      // Guarda estrita de silêncio: não disparar se houve qualquer interação/envio nas últimas 24h
      if (sLatestTime && nowMsGlobal - sLatestTime < oneDayMs) {
        continue
      }

      // Guarda de resposta recente do cliente
      if (
        sLatest &&
        sLatest.getString('sender') === 'customer' &&
        nowMsGlobal - sLatestTime < oneDayMs
      ) {
        continue
      }

      // Guarda 5: Anti-bot
      if (isAutomatedThreadOrBot(sCust, sLatest)) continue

      // ======================================================================
      // GATE DE APRESENTAÇÃO PRÉVIA E DETERMINAÇÃO DO DEGRAU:
      //
      // REGRA:
      // Se o cliente NUNCA recebeu apresentação prévia de imóvel (caso típico do
      // backfill de Google Contacts ou leads sem histórico de produto enviado),
      // o cliente NÃO PODE receber degraus de seguimento (D+1, D+3, D+7) que afirmam
      // "passando para saber se você conseguiu dar uma olhada na opção/imóvel".
      // Nesses casos, o toque DEVE ser obrigatoriamente o REMARKETING de oportunidade.
      //
      // Só avança para D+3/D+7/D+14 se o cliente já tiver recebido apresentação prévia.
      // Se não tiver apresentação prévia e já recebeu remarketing, vai para nutrição mensal.
      // ======================================================================
      var presHistScheduled = checkCustomerPresentationHistory(sCust, sConvs)
      var followUpCount = sCust.getInt('follow_up_count') || 0
      var lastFollowUpAt = sCust.getString('last_follow_up_at') || ''
      var stepToExecute = currentStep
      var nextStepAfterSend = 'd3'

      var elapsedSinceInteraction = sLatestTime ? nowMsGlobal - sLatestTime : sevenDaysMs + 1000

      // DETERMINAÇÃO DO DEGRAU E PROGRESSÃO CORRETA DA CADÊNCIA:
      // Se não há apresentação prévia (base importada), o 1º toque é remarketing,
      // e os seguintes avançam na cadência ou nutrição mensal conforme rotação.
      // Clientes aptos a avançar na cadência: d1 -> d3 -> d7 -> d14 -> nurturing_monthly.
      if (!presHistScheduled.hasPresentation) {
        if (!lastFollowUpAt || followUpCount === 0) {
          stepToExecute =
            currentStep === 'd1' || currentStep === 'remarketing' ? 'remarketing' : currentStep
          nextStepAfterSend = stepToExecute === 'remarketing' ? 'd1' : 'nurturing_monthly'
        } else {
          if (currentStep === 'remarketing') {
            stepToExecute = 'd1'
            nextStepAfterSend = 'd3'
          } else if (currentStep === 'd1') {
            stepToExecute = 'd3'
            nextStepAfterSend = 'd7'
          } else if (currentStep === 'd3') {
            stepToExecute = 'd7'
            nextStepAfterSend = 'd14'
          } else if (currentStep === 'd7') {
            stepToExecute = 'd14'
            nextStepAfterSend = 'nurturing_monthly'
          } else {
            stepToExecute = 'nurturing_monthly'
            nextStepAfterSend = 'nurturing_monthly'
          }
        }
      } else {
        // CLIENTE COM HISTÓRICO DE APRESENTAÇÃO:
        if (!lastFollowUpAt || followUpCount === 0) {
          if (elapsedSinceInteraction >= sevenDaysMs) {
            stepToExecute = 'remarketing'
            nextStepAfterSend = 'd1'
          } else {
            stepToExecute = 'd1'
            nextStepAfterSend = 'd3'
          }
        } else {
          if (currentStep === 'remarketing') {
            stepToExecute = 'd1'
            nextStepAfterSend = 'd3'
          } else if (currentStep === 'd1') {
            stepToExecute = 'd3'
            nextStepAfterSend = 'd7'
          } else if (currentStep === 'd3') {
            stepToExecute = 'd7'
            nextStepAfterSend = 'd14'
          } else if (currentStep === 'd7') {
            stepToExecute = 'd14'
            nextStepAfterSend = 'nurturing_monthly'
          } else {
            stepToExecute = 'nurturing_monthly'
            nextStepAfterSend = 'nurturing_monthly'
          }
        }
      }

      if (!acquireLock(sCustId)) continue

      try {
        var launchInfo = resolveLaunchAndKnowledgeData(
          sCust,
          stepToExecute,
          sConvs,
          presHistScheduled,
        )
        var msgTextScheduled = buildPersistenceMessageWithVariance(stepToExecute, sCust, launchInfo)

        // REGRA DE OURO (Mauro):
        // NENHUM anexo e NENHUM link no primeiro disparo da régua de retomada/remarketing
        var docToSend = null

        var ok = sendPersistenceMarketingMessage(
          sCust,
          msgTextScheduled,
          activeUserRecord,
          stepToExecute,
          docToSend,
        )

        if (ok) {
          // AVANÇAR follow_up_step PARA O PRÓXIMO DEGRAU (para nunca ficar preso)
          sCust.set('follow_up_step', nextStepAfterSend)
          sCust.set('follow_up_count', followUpCount + 1)
          sCust.set('last_follow_up_at', nowIso)
          sCust.set('next_follow_up_at', calculateNextFollowUp(stepToExecute))
          sCust.set('persistence_status', 'ativo')
          app.saveNoValidate(sCust)
          executedCount++
          console.log(
            '[BIA_PERSISTENCE] Retomada (' +
              stepToExecute +
              ') enviada para ' +
              sCustId +
              '. Próximo degrau (' +
              nextStepAfterSend +
              ') agendado com sucesso.',
          )
        }
      } finally {
        releaseLock(sCustId)
      }
    }
  } catch (schErr) {
    console.warn(
      '[BIA_PERSISTENCE] Erro no bloco de next_follow_up_at agendados: ' + schErr.message,
    )
  }

  // 11.3 ENTRADA NA RÉGUA: Clientes em silêncio > 24h sem next_follow_up_at ou com follow_up_step vazio
  try {
    var idleBatchLimit = 15
    var idleCustomers = app.findRecordsByFilter(
      'customers',
      "tags !~ 'telefone_invalido' && tags !~ 'erro_numero_whatsapp' && (persistence_status = 'ativo' || persistence_status = '' || persistence_status = null) && is_blocked = false && (next_follow_up_at = '' || next_follow_up_at = null) && (follow_up_step = '' || follow_up_step = null)",
      '-updated',
      25,
      0,
    )

    for (var idIdx = 0; idIdx < idleCustomers.length; idIdx++) {
      if (!isReguaActiveNow()) {
        console.log(
          '[BIA_PERSISTENCE] Régua pausada durante processamento de novos entrantes. Abortando lote.',
        )
        break
      }
      if (executedCount >= idleBatchLimit) {
        break
      }

      var iCust = idleCustomers[idIdx]
      var iCustId = iCust.id

      // Guarda 1: ai_paused ou cliente bloqueado
      var iTagsRaw = iCust.get('tags') || []
      var iTagsStr = JSON.stringify(iTagsRaw).toLowerCase()
      if (iTagsStr.includes('ai_paused') || iCust.getBool('is_blocked')) continue

      // Guarda 2: Não disparar se frio ou recusa
      if (iTagsStr.includes('frio') || iTagsStr.includes('não é o momento')) continue

      var lastConvs = []
      try {
        lastConvs = app.findRecordsByFilter(
          'conversations',
          "customer_id = '" + iCustId + "'",
          '-created',
          15,
          0,
        )
      } catch (_) {}

      var latestCreated = 0
      var latestMsg = null
      if (lastConvs.length > 0) {
        latestMsg = lastConvs[0]
        var lDateStr = latestMsg.getString('created') || latestMsg.get('created')
        if (lDateStr) latestCreated = new Date(lDateStr).getTime()
      }

      if (!latestCreated) {
        var iLastSent = iCust.getString('last_sent_at')
        if (iLastSent) latestCreated = new Date(iLastSent).getTime()
      }
      if (!latestCreated) {
        var iUpd = iCust.getString('updated') || iCust.get('updated')
        if (iUpd) latestCreated = new Date(iUpd).getTime()
      }

      var elapsedMs = latestCreated ? nowMsGlobal - latestCreated : oneDayMs + 1000

      // Guarda: só ativa follow-up se já se passaram pelo menos 24 horas de silêncio
      if (elapsedMs < oneDayMs) {
        continue
      }

      // Guarda: Se a última mensagem partiu do cliente há menos de 24h, ai_auto_reply deve responder
      if (latestMsg && latestMsg.getString('sender') === 'customer' && elapsedMs < oneDayMs) {
        continue
      }

      // Guarda: anti-bot
      if (isAutomatedThreadOrBot(iCust, latestMsg)) continue

      // ======================================================================
      // GATE DE APRESENTAÇÃO PRÉVIA PARA NOVOS ENTRANTES NA RÉGUA:
      // Se não tem apresentação prévia registrada -> REMARKETING.
      // Se tem apresentação prévia E interação recente (24h - 7d) -> D+1.
      // Se tem apresentação prévia E interação antiga (> 7d) -> REMARKETING.
      // ======================================================================
      var presHistIdle = checkCustomerPresentationHistory(iCust, lastConvs)
      var entryStep = 'remarketing'
      if (presHistIdle.hasPresentation && elapsedMs < sevenDaysMs) {
        entryStep = 'd1'
      } else {
        entryStep = 'remarketing'
      }

      if (!acquireLock(iCustId)) continue

      try {
        var lInfoIdle = resolveLaunchAndKnowledgeData(iCust, entryStep, lastConvs, presHistIdle)
        var entryText = buildPersistenceMessageWithVariance(entryStep, iCust, lInfoIdle)
        // REGRA DE OURO (Mauro): NENHUM link e NENHUM anexo no primeiro disparo da régua de retomada/remarketing
        var docEntry = null

        var entrySent = sendPersistenceMarketingMessage(
          iCust,
          entryText,
          activeUserRecord,
          entryStep,
          docEntry,
        )
        if (entrySent) {
          var nextStepForIdle = entryStep === 'remarketing' ? 'd1' : 'd3'
          iCust.set('follow_up_step', nextStepForIdle)
          iCust.set('follow_up_count', (iCust.getInt('follow_up_count') || 0) + 1)
          iCust.set('last_follow_up_at', nowIso)
          iCust.set('next_follow_up_at', calculateNextFollowUp(entryStep))
          iCust.set('persistence_status', 'ativo')
          app.saveNoValidate(iCust)
          executedCount++
          console.log(
            '[BIA_PERSISTENCE] Retomada (' +
              entryStep +
              ') iniciada para ' +
              iCustId +
              '. Próximo degrau: ' +
              nextStepForIdle,
          )
        }
      } finally {
        releaseLock(iCustId)
      }
    }
  } catch (idleErr) {
    console.warn('[BIA_PERSISTENCE] Erro no bloco de clientes em silêncio: ' + idleErr.message)
  }

  console.log(
    '[BIA_PERSISTENCE] Execução concluída. Total de retomadas disparadas: ' + executedCount,
  )
})
