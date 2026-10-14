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
      lowerMsg.includes('escolha uma das opções') ||
      lowerMsg.includes('protocolo de atendimento:')
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
    if (rawName && !rawName.includes('+') && !/^\d+$/.test(rawName)) {
      custName = rawName.split(' ')[0]
    }
    var greeting = custName ? 'Olá, ' + custName + '!' : 'Olá! Tudo bem?'
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
      // D+14: Checando se a busca continua ativa / despedida elegante de ciclo
      return (
        greeting +
        ' Espero que esteja tudo ótimo! Como não tivemos retorno recente, passo para checar se a sua busca por imóvel ainda continua ativa ou se prefere pausar por enquanto. Vou deixar você à vontade, e quando quiser retomar, o corretor Mauro e eu estamos por aqui!'
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
  try {
    var scheduledCustomers = app.findRecordsByFilter(
      'customers',
      "next_follow_up_at != '' && next_follow_up_at <= '" +
        nowIso +
        "' && (persistence_status = 'ativo' || persistence_status = 'aguardando_momento' || persistence_status = '') && is_blocked = false",
      'next_follow_up_at',
      20,
      0,
    )

    for (var sIdx = 0; sIdx < scheduledCustomers.length; sIdx++) {
      var sCust = scheduledCustomers[sIdx]
      var sCustId = sCust.id

      // Guarda: ai_paused nas tags
      var sTagsRaw = sCust.get('tags') || []
      var sTagsStr = JSON.stringify(sTagsRaw)
      if (sTagsStr.includes('ai_paused') || sCust.getBool('is_blocked')) continue

      // Verificar conversas do cliente
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

      if (sConvs.length === 0) continue

      var sLatest = sConvs[0]
      var sLatestTime = new Date(sLatest.getString('created') || sLatest.get('created')).getTime()

      // Guarda: Não disparar se última mensagem < 24h
      if (nowMsGlobal - sLatestTime < oneDayMs) continue

      // Guarda: Não disparar se o cliente respondeu depois da última retomada (se a última foi do cliente, o ai_auto_reply deve responder)
      if (sLatest.getString('sender') === 'customer') {
        continue
      }

      // Guarda: Anti-bot
      if (isAutomatedThreadOrBot(sCust, sLatest)) continue

      var currentStep = sCust.getString('follow_up_step') || 'd1'

      // CASO ESPECIAL D+14: Se já executou D+14 e venceu sem resposta, esgotou a régua!
      // "Ao esgotar D+14 sem resposta: tag frio no cliente, persistence_status pausado, follow_up_step finalizado, log, e cessar envios."
      if (currentStep === 'd14' || currentStep === 'finalizado') {
        if (!acquireLock(sCustId)) continue
        try {
          // Adiciona tag "frio"
          var finalTags = []
          if (Array.isArray(sTagsRaw)) {
            finalTags = sTagsRaw.filter(function (t) {
              return typeof t === 'string'
            })
          }
          if (!finalTags.includes('frio')) {
            finalTags.push('frio')
          }
          sCust.set('tags', finalTags)
          sCust.set('persistence_status', 'pausado')
          sCust.set('follow_up_step', 'finalizado')
          sCust.set('next_follow_up_at', '')
          app.saveNoValidate(sCust)

          // Registrar log de encerramento de persistência
          try {
            var logsCol = app.findCollectionByNameOrId('system_logs')
            var logEnd = new Record(logsCol)
            logEnd.set('user_id', activeUserRecord ? activeUserRecord.id : '')
            logEnd.set('type', 'persistence_cycle_finished')
            logEnd.set(
              'message',
              'Régua de persistência D+14 esgotada sem resposta. Lead marcado como frio e persistência pausada.',
            )
            logEnd.set(
              'details',
              JSON.stringify({
                customer_id: sCustId,
                customer_name: sCust.getString('name') || '',
                customer_phone: sCust.getString('phone') || '',
                final_step: 'd14',
              }),
            )
            app.saveNoValidate(logEnd)
          } catch (_) {}

          console.log(
            '[BIA_PERSISTENCE] Régua esgotada para cliente ' +
              sCustId +
              ' (status->pausado, tag->frio)',
          )
        } finally {
          releaseLock(sCustId)
        }
        continue
      }

      // Próximo passo da régua
      var nextStep = 'd3'
      if (currentStep === 'd1') nextStep = 'd3'
      else if (currentStep === 'd3') nextStep = 'd7'
      else if (currentStep === 'd7') nextStep = 'd14'

      // Guarda: Não reenviar retomada do mesmo estágio
      if (nextStep === currentStep) continue

      if (!acquireLock(sCustId)) continue

      try {
        var msgTextScheduled = buildPersistenceMessage(nextStep, sCust, '')
        var ok = sendPersistenceMarketingMessage(
          sCust,
          msgTextScheduled,
          activeUserRecord,
          nextStep,
        )

        if (ok) {
          sCust.set('follow_up_step', nextStep)
          sCust.set('follow_up_count', (sCust.getInt('follow_up_count') || 0) + 1)
          sCust.set('last_follow_up_at', nowIso)
          sCust.set('next_follow_up_at', calculateNextFollowUp(nextStep))
          app.saveNoValidate(sCust)
          executedCount++
          console.log(
            '[BIA_PERSISTENCE] Retomada agendada (' + nextStep + ') enviada para ' + sCustId,
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
    var idleCustomers = app.findRecordsByFilter(
      'customers',
      "(persistence_status = 'ativo' || persistence_status = '') && is_blocked = false && (next_follow_up_at = '' || next_follow_up_at = null) && (follow_up_step = '' || follow_up_step = null)",
      '-updated',
      25,
      0,
    )

    for (var idIdx = 0; idIdx < idleCustomers.length; idIdx++) {
      var iCust = idleCustomers[idIdx]
      var iCustId = iCust.id

      // Guarda: ai_paused
      var iTagsRaw = iCust.get('tags') || []
      var iTagsStr = JSON.stringify(iTagsRaw)
      if (iTagsStr.includes('ai_paused') || iCust.getBool('is_blocked')) continue

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

      if (lastConvs.length === 0) continue

      var latestMsg = lastConvs[0]
      var latestCreated = new Date(
        latestMsg.getString('created') || latestMsg.get('created'),
      ).getTime()
      var elapsedMs = nowMsGlobal - latestCreated

      // Guarda: só ativa follow-up se já se passaram pelo menos 24 horas de silêncio e menos de 72 horas
      if (elapsedMs < 24 * 3600 * 1000 || elapsedMs > 72 * 3600 * 1000) {
        continue
      }

      // Guarda: Se a última mensagem partiu do cliente há menos de 24h, não é o cron que trata
      if (latestMsg.getString('sender') === 'customer' && elapsedMs < 24 * 3600 * 1000) {
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
