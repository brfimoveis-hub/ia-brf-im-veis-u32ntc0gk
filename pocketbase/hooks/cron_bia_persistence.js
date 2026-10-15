/**
 * CRON: Automação da Régua de Persistência Comercial da Bia (D+1, D+3, D+7, D+14)
 * Condução ativa contra o silêncio do cliente — Texto Único v3.1 (bia_learnings id tYVJIdIFb5rW4iq).
 *
 * PONTO ÚNICO DE ENVIO DE RETOMADAS/MARKETING — migrar para a API de Mensagens de Marketing (MM) da Meta até 13/10/2027; descontinuação do envio de marketing via Cloud API nessa data.
 *
 * Periodicidade: 'STAR/15 8-20 STAR STAR STAR' (A cada 15 min, das 08h às 20h horário de Brasília, seg a sáb)
 */

cronAdd('bia_persistence_followup', '*/15 8-20 * * *', function () {
  var app = $app

  // ============================================================================
  // 1. PONTO ÚNICO DE ENVIO DE RETOMADAS / MARKETING
  // ============================================================================
  // PONTO ÚNICO DE ENVIO DE RETOMADAS/MARKETING — migrar para a API de Mensagens de Marketing (MM) da Meta até 13/10/2027; descontinuação do envio de marketing via Cloud API nessa data
  function sendPersistenceMarketingMessage(customer, text, userRecord, stepName) {
    if (!text || typeof text !== 'string') return false
    var cleaned = cleanWhatsAppFormat(text)
    if (!cleaned || cleaned.length < 5) return false

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

    // Registrar conversa na tabela conversations
    try {
      var convCol = app.findCollectionByNameOrId('conversations')
      var conv = new Record(convCol)
      conv.set('user_id', userId || customer.getString('user_id') || '')
      conv.set('customer_id', customerId)
      conv.set('sender', 'ai')
      conv.set('content', cleaned)
      conv.set('channel', 'whatsapp')
      app.save(conv)
    } catch (cErr) {
      console.warn('[BIA_PERSISTENCE] Aviso ao registrar conversa: ' + cErr.message)
    }

    // Disparo HTTP para a Meta Graph API v21.0
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
          text: { preview_url: false, body: cleaned },
        }),
        timeout: 20,
      })

      if (sendRes && sendRes.statusCode >= 200 && sendRes.statusCode < 300) {
        isOk = true
      }
    } catch (httpErr) {
      console.error('[BIA_PERSISTENCE] Erro HTTP Meta: ' + httpErr.message)
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
              toPhone
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
        }),
      )
      logRec.set(
        'payload',
        JSON.stringify({
          preview: cleaned.substring(0, 120),
          full_text: cleaned,
          customer_id: customerId,
          follow_up_step: stepName || '',
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
  function cleanWhatsAppFormat(text) {
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

    // Limite de 800 caracteres para follow-up consultivo
    if (out.length > 800) {
      var truncated = out.substring(0, 800)
      var lastPeriod = Math.max(
        truncated.lastIndexOf('.\n'),
        truncated.lastIndexOf('!\n'),
        truncated.lastIndexOf('?\n'),
        truncated.lastIndexOf('\n\n'),
        truncated.lastIndexOf('.'),
      )
      if (lastPeriod > 500) {
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
  // 3. JANELA DE HORÁRIO COMERCIAL (UTC-3: 08h00 às 20h00, seg a sáb)
  // ============================================================================
  function isBrasiliaBusinessHours() {
    var now = new Date()
    var utcTime = now.getTime() + now.getTimezoneOffset() * 60000
    var brTime = new Date(utcTime - 3 * 3600000)
    var dayOfWeek = brTime.getDay()
    if (dayOfWeek === 0) return false // Domingo pausado por respeito comercial

    var hours = brTime.getHours()
    return hours >= 8 && hours < 20
  }

  if (!isBrasiliaBusinessHours()) {
    console.log(
      '[BIA_PERSISTENCE] Fora da janela de atendimento de Brasília (08h-20h seg-sáb). Pausando execução.',
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
    var custPhone = customerRecord.getString('phone') || ''
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
  // 8. CONSTRUÇÃO DO TEXTO DAS RETOMADAS CONFORME SEÇÃO 2 DO TEXTO ÚNICO v3.1
  // ============================================================================
  // "retome com toque leve no dia seguinte com uma pergunta consultiva (D+1);
  // após 3 dias com um diferencial marcante do imóvel em foco (D+3);
  // após 1 semana com uma condição facilitada de pagamento (D+7);
  // após 2 semanas checando se a busca continua ativa (D+14);
  // Ao esgotar D+14 sem resposta: tag frio no cliente, persistence_status pausado, follow_up_step finalizado e cessar envios."
  function buildPersistenceMessage(step, customer, lastPropertyTitle) {
    var rawName = (customer.getString('name') || customer.getString('first_name') || '').trim()
    var custName = ''
    // Validação estrita do nome: não usar número cru, telefone formatado, "Sem nome" ou texto inválido
    var cleanDigitsOnly = rawName.replace(/\D/g, '')
    var isGenericPlaceholder =
      !rawName ||
      rawName.toLowerCase() === 'sem nome' ||
      rawName.toLowerCase().startsWith('sem nome') ||
      rawName.toLowerCase() === 'whatsapp' ||
      rawName.toLowerCase().includes('whatsapp business') ||
      rawName.startsWith('+') ||
      cleanDigitsOnly.length >= 8 || // Telefone ou número cru
      /^\d+$/.test(rawName)
    if (!isGenericPlaceholder) {
      var candidate = rawName.split(' ')[0].replace(/[^\p{L}]/gu, '')
      if (candidate.length >= 2) {
        custName = candidate
      }
    }
    var greeting = custName ? 'Olá, ' + custName + '!' : 'Olá! Tudo bem?'
    // Tenta detectar o imóvel em foco se não foi passado explicitamente
    if (!lastPropertyTitle) {
      try {
        var cNotes = customer.getString('notes') || ''
        var cOriginHist = customer.getString('origin_history') || ''
        var match =
          cNotes.match(/#(?:AP|LM|TR|SO|CA|ARU)\s*\d+/i) ||
          cOriginHist.match(/#(?:AP|LM|TR|SO|CA|ARU)\s*\d+/i)
        if (match) {
          lastPropertyTitle = match[0].toUpperCase()
        }
      } catch (_) {}
    }

    var propContext = lastPropertyTitle
      ? ' em relação ao *' + lastPropertyTitle + '*'
      : ' sobre a sua busca imobiliária'

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

    if (step === 'd1') {
      // D+1: Toque leve no dia seguinte com pergunta consultiva sobre o imóvel em pauta
      return (
        greeting +
        ' Passando para saber se você conseguiu dar uma olhada na opção' +
        propContext +
        ' ou se ficou alguma dúvida sobre a localização, planta ou fluxo inicial.'
      )
    }

    if (step === 'd3') {
      // D+3: Diferencial marcante do imóvel em foco (lazer, localização, rentabilidade)
      return (
        greeting +
        ' Separei um diferencial marcante' +
        propContext +
        ': a valorização projetada na região e as áreas de lazer completas têm chamado bastante atenção. Gostaria de dar uma olhada na planta detalhada ou nas opções de unidades disponíveis?'
      )
    }

    if (step === 'd7') {
      // D+7: Condição facilitada de pagamento / parcelamento / verificação de timing
      return (
        greeting +
        ' Gostaria de verificar se a compra do imóvel ainda está no seu radar para este mês. Conseguimos condições bem facilitadas de entrada e parcelamento' +
        propContext +
        '. Como estão os seus planos por aí?'
      )
    }

    if (step === 'd14') {
      // D+14: Checando se a busca continua ativa / pergunta leve de continuidade
      return (
        greeting +
        ' Espero que esteja tudo ótimo! Como não tivemos retorno recente, passo para checar se a sua busca por imóvel ainda continua ativa' +
        propContext +
        ' ou se prefere pausar por enquanto. O corretor Mauro e eu estamos sempre à disposição por aqui!'
      )
    }

    if (step === 'nurturing_monthly') {
      // Pós-D+14: Aquecimento espaçado (~30 dias) baseado no padrão consultivo D+7 do Texto Único
      // (pergunta leve, sem tabela, sem empurrar, checando radar e planos)
      return (
        greeting +
        ' Gostaria de verificar se a compra do imóvel ainda está no seu radar' +
        propContext +
        '. Tivemos atualizações recentes nas condições e no mercado da região. Como estão os seus planos por aí no momento?'
      )
    }

    return ''
  }

  function calculateNextFollowUp(step) {
    var nowMs = Date.now()
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
      // De D14 para primeiro aquecimento espaçado (~30 dias) e ciclos seguintes a cada ~30 dias
      return new Date(nowMs + 30 * 24 * 3600 * 1000).toISOString()
    }
    return ''
  }

  // ============================================================================
  // 9. EXECUÇÃO DAS RETOMADAS COM GUARDAS COMPLETAS
  // ============================================================================
  var executedCount = 0
  var nowIso = new Date().toISOString()
  var nowMsGlobal = Date.now()
  var oneDayMs = 24 * 60 * 60 * 1000

  // 9.1 PRIORIDADE A: Promessas pendentes com prazo vencido
  try {
    var promiseCustomers = app.findRecordsByFilter(
      'customers',
      "promise_pending = true && is_blocked = false && (persistence_status = 'ativo' || persistence_status = 'aguardando_momento' || persistence_status = '')",
      '-promise_made_at',
      10,
      0,
    )

    for (var pIdx = 0; pIdx < promiseCustomers.length; pIdx++) {
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
          2,
          0,
        )
      } catch (_) {}

      if (pConvs.length > 0) {
        var pLatest = pConvs[0]
        var pLatestTime = new Date(pLatest.getString('created') || pLatest.get('created')).getTime()
        // Não disparar se última mensagem < 24h
        if (nowMsGlobal - pLatestTime < oneDayMs) continue
        // Não disparar em bots/auto-respostas
        if (isAutomatedThreadOrBot(pCust, pLatest)) continue
      }

      if (!acquireLock(pCustId)) continue

      try {
        var msgText = buildPersistenceMessage('promised_followup', pCust, '')
        var sent = sendPersistenceMarketingMessage(
          pCust,
          msgText,
          activeUserRecord,
          'promised_followup',
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

  // 9.2 AGENDADOS: Clientes com next_follow_up_at vencido
  // Processa em lote seguro por execução (15 por execução a cada 15 min), respeitando anti-flood e mantendo todas as guardas
  try {
    var scheduledBatchLimit = 15
    var scheduledCustomers = app.findRecordsByFilter(
      'customers',
      "next_follow_up_at != '' && next_follow_up_at <= '" +
        nowIso +
        "' && (persistence_status = 'ativo' || persistence_status = 'aguardando_momento' || persistence_status = '') && is_blocked = false",
      'next_follow_up_at',
      50,
      0,
    )

    for (var sIdx = 0; sIdx < scheduledCustomers.length; sIdx++) {
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
          2,
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

      // Se não há mensagens na tabela conversations (ex.: importados do Google Contacts ou antes do registro unificado),
      // consulta last_follow_up_at, last_sent_at, updated ou created do cliente
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

      // Guarda de resposta recente do cliente: se a última mensagem foi do cliente e tem menos de 24h,
      // a IA de resposta imediata (ai_auto_reply) deve tratar, não o cron de persistência.
      // Porém, se o cliente falou há dias/semanas e ninguém respondeu ou o lead esfriou, a retomada deve resgatá-lo.
      if (
        sLatest &&
        sLatest.getString('sender') === 'customer' &&
        nowMsGlobal - sLatestTime < oneDayMs
      ) {
        continue
      }

      // Guarda 5: Anti-bot
      if (isAutomatedThreadOrBot(sCust, sLatest)) continue

      // Determinar o degrau a disparar e o próximo agendamento:
      // Se o cliente nunca recebeu um follow_up (follow_up_count === 0 ou last_follow_up_at vazio) e está com 'd1',
      // o primeiro disparo agendado é o D+1, e o próximo será D+3!
      // Se ele já recebeu D+1, avança para D+3; de D+3 para D+7; de D+7 para D+14; de D+14 para aquecimento mensal.
      var followUpCount = sCust.getInt('follow_up_count') || 0
      var lastFollowUpAt = sCust.getString('last_follow_up_at') || ''
      var stepToExecute = currentStep
      var nextStepAfterSend = 'd3'

      if (!lastFollowUpAt || followUpCount === 0) {
        stepToExecute = currentStep || 'd1'
        if (stepToExecute === 'd1') nextStepAfterSend = 'd3'
        else if (stepToExecute === 'd3') nextStepAfterSend = 'd7'
        else if (stepToExecute === 'd7') nextStepAfterSend = 'd14'
        else nextStepAfterSend = 'nurturing_monthly'
      } else {
        if (currentStep === 'd1') {
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

      if (!acquireLock(sCustId)) continue

      try {
        var msgTextScheduled = buildPersistenceMessage(stepToExecute, sCust, '')
        var ok = sendPersistenceMarketingMessage(
          sCust,
          msgTextScheduled,
          activeUserRecord,
          stepToExecute,
        )

        if (ok) {
          sCust.set('follow_up_step', stepToExecute)
          sCust.set('follow_up_count', followUpCount + 1)
          sCust.set('last_follow_up_at', nowIso)
          sCust.set('next_follow_up_at', calculateNextFollowUp(stepToExecute))
          sCust.set('persistence_status', 'ativo')
          app.saveNoValidate(sCust)
          executedCount++
          console.log(
            '[BIA_PERSISTENCE] Retomada agendada (' +
              stepToExecute +
              ') enviada para ' +
              sCustId +
              '. Próximo degrau (' +
              nextStepAfterSend +
              ') agendado.',
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

  // 9.3 ENTRADA NA RÉGUA (D+1): Clientes em silêncio > 24h sem next_follow_up_at ou com follow_up_step vazio
  try {
    var idleBatchLimit = 15
    var idleCustomers = app.findRecordsByFilter(
      'customers',
      "(persistence_status = 'ativo' || persistence_status = '' || persistence_status = null) && is_blocked = false && (next_follow_up_at = '' || next_follow_up_at = null) && (follow_up_step = '' || follow_up_step = null)",
      '-updated',
      25,
      0,
    )

    for (var idIdx = 0; idIdx < idleCustomers.length; idIdx++) {
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
          2,
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

      if (!acquireLock(iCustId)) continue

      try {
        var d1Text = buildPersistenceMessage('d1', iCust, '')
        var d1Sent = sendPersistenceMarketingMessage(iCust, d1Text, activeUserRecord, 'd1')
        if (d1Sent) {
          iCust.set('follow_up_step', 'd1')
          iCust.set('follow_up_count', (iCust.getInt('follow_up_count') || 0) + 1)
          iCust.set('last_follow_up_at', nowIso)
          iCust.set('next_follow_up_at', calculateNextFollowUp('d1'))
          iCust.set('persistence_status', 'ativo')
          app.saveNoValidate(iCust)
          executedCount++
          console.log('[BIA_PERSISTENCE] Retomada D+1 iniciada para ' + iCustId)
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
