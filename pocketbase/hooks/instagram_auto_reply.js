// ======================================================================
// instagram_auto_reply.js — Caminho resiliente de resposta da Bia no Instagram Direct
//
// Contexto (bug 11/11): leads do Direct recebiam apenas uma "resposta fantasma"
// gerada no on_customer_create (sem canal, nunca enviada) e NENHUM [AI_REPLY]
// do caminho principal chegou a rodar. Este hook garante que TODA mensagem de
// lead no canal instagram receba resposta da Bia enviada de verdade ao Direct:
//   - POST /{ig_user_id}/messages com recipient.id = IGSID do remetente
//   - LOG COMPLETO do Graph em TODO envio: system_logs.instagram_send_result
//     (statusCode, body bruto, recipient_id, message_id) — nunca mais ficar
//     cegos entre o aceite da Graph e a entrega no celular.
//   - dedupe forte (não responde duas vezes a mesma mensagem do lead)
// Regra de hooks: handlers autossuficientes (funções declaradas DENTRO do handler).
// ======================================================================

onRecordAfterCreateSuccess((e) => {
  try {
    var rec = e.record
    var sender = rec.getString('sender') || ''
    if (sender !== 'customer' && sender !== 'user' && sender !== 'lead') return e.next()
    var channel = rec.getString('channel') || ''
    if (channel !== 'instagram') return e.next()

    var customerId = rec.getString('customer_id') || ''
    var customerMessage = (rec.getString('content') || '').trim()
    if (!customerId || !customerMessage) return e.next()

    function igLogSendResult(userId, info) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logsCol)
        log.set('user_id', userId || '')
        log.set('type', 'instagram_send_result')
        log.set(
          'message',
          '[IG_SEND_RESULT] status=' +
            (info.statusCode === null ? 'null' : info.statusCode) +
            ' recipient=' +
            (info.recipientId || 'n/a') +
            ' target=' +
            (info.targetId || 'n/a') +
            ' message_id=' +
            (info.messageId || 'n/a') +
            ' origin=' +
            (info.origin || 'conversations_hook'),
        )
        log.set(
          'details',
          JSON.stringify({
            url: info.url || null,
            statusCode: info.statusCode,
            recipient_id: info.recipientId || null,
            target_id: info.targetId || null,
            message_id: info.messageId || null,
            token_prefix: info.tokenPrefix || null,
            origin: info.origin || 'conversations_hook',
            error: info.error || null,
          }),
        )
        log.set(
          'payload',
          JSON.stringify({ request: info.request || null, response: info.response || null }),
        )
        $app.saveNoValidate(log)
      } catch (_) {}
    }

    var customer = null
    try {
      customer = $app.findRecordById('customers', customerId)
    } catch (_) {}
    if (!customer) return e.next()
    try {
      if (customer.getBool('is_blocked')) return e.next()
    } catch (_) {}

    // Dedupe forte: se já existe resposta 'ai' criada DEPOIS da última mensagem do lead,
    // outro fluxo (ai_auto_reply) já respondeu — nunca reenviar.
    try {
      var lastCustArr = $app.findRecordsByFilter(
        'conversations',
        "customer_id = '{:cid}' && sender = 'customer'",
        '-created',
        1,
        0,
        { cid: customerId },
      )
      var lastAiArr = $app.findRecordsByFilter(
        'conversations',
        "customer_id = '{:cid}' && sender = 'ai'",
        '-created',
        1,
        0,
        { cid: customerId },
      )
      if (lastCustArr.length > 0 && lastAiArr.length > 0) {
        var tCust = new Date(lastCustArr[0].getString('created')).getTime()
        var tAi = new Date(lastAiArr[0].getString('created')).getTime()
        if (tAi > tCust) {
          console.log(
            '[IG_AUTO_REPLY] Já respondido por outro fluxo, pulando customer=' + customerId,
          )
          return e.next()
        }
      }
    } catch (_) {}

    // Divisão de papéis com o caminho principal (ai_auto_reply):
    // - regua_automations_active=true  -> o fluxo principal responde (fluxo completo);
    //   este hook NÃO envia (evita resposta duplicada).
    // - regua_automations_active=false -> o fluxo principal ADIA (e o ciclo de
    //   persistência também está pausado); este hook assume a resposta do Direct.
    //   A régua pausada governa o envio outbound de campanha, não a resposta a um
    //   lead que acabou de escrever no Direct (regra do Mauro: Bia gera 24/7).
    var mainFlowActive = true
    try {
      const ctrl = $app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
      if (ctrl) mainFlowActive = !!ctrl.getBool('is_active')
    } catch (_) {}
    if (mainFlowActive) {
      console.log('[IG_AUTO_REPLY] Fluxo principal ativo (regua_automations_active=true), pulando')
      return e.next()
    }

    // Kill-switch por cliente
    try {
      var rawTags = customer.get('tags')
      var tagList = []
      if (Array.isArray(rawTags)) tagList = rawTags
      else if (typeof rawTags === 'string') {
        try {
          var parsedTags = JSON.parse(rawTags)
          if (Array.isArray(parsedTags)) tagList = parsedTags
        } catch (_) {}
      }
      if (tagList.indexOf('ai_paused') !== -1) return e.next()
    } catch (_) {}

    // IGSID do remetente (notes gravadas pelo webhook do Direct)
    var igNotes = customer.getString('notes') || ''
    var igSenderId = ''
    var sidMatch = igNotes.match(/IG Sender ID:\s*(\S+)/i)
    if (sidMatch) igSenderId = sidMatch[1]
    if (!igSenderId) {
      var originStr = customer.getString('last_origin') || ''
      var originNumMatch = originStr.match(/(\d{10,25})/)
      if (originNumMatch) igSenderId = originNumMatch[1]
    }
    if (!igSenderId) {
      console.warn('[IG_AUTO_REPLY] Sem IGSID para customer=' + customerId + ', pulando')
      return e.next()
    }

    // Janela de 24h da Meta
    var isWithin24h = true
    try {
      var lastCustMsgs = $app.findRecordsByFilter(
        'conversations',
        "customer_id = '{:cid}' && sender = 'customer'",
        '-created',
        1,
        0,
        { cid: customerId },
      )
      if (lastCustMsgs.length > 0) {
        var diffHours =
          (new Date().getTime() - new Date(lastCustMsgs[0].getString('created')).getTime()) /
          3600000
        if (diffHours > 24) isWithin24h = false
      }
    } catch (_) {}
    if (!isWithin24h) {
      console.warn('[IG_AUTO_REPLY] Fora da janela de 24h, pulando customer=' + customerId)
      return e.next()
    }

    // Usuário/token (prioriza page token da conexão OAuth atual)
    var userId = customer.getString('user_id') || ''
    var userRecord = null
    try {
      if (userId) userRecord = $app.findRecordById('users', userId)
    } catch (_) {}
    if (!userRecord) {
      try {
        var usersWithTok = $app.findRecordsByFilter(
          'users',
          "meta_instagram_page_token != '' || meta_instagram_user_token != '' || meta_page_access_token != ''",
          '-updated',
          1,
          0,
        )
        if (usersWithTok.length > 0) {
          userRecord = usersWithTok[0]
          userId = userRecord.id
        }
      } catch (_) {}
    }
    var igToken = userRecord
      ? (
          userRecord.getString('meta_instagram_page_token') ||
          userRecord.getString('meta_instagram_user_token') ||
          userRecord.getString('meta_page_access_token') ||
          ''
        ).trim()
      : ''
    if (!igToken) {
      console.warn('[IG_AUTO_REPLY] Sem token IG para customer=' + customerId + ', pulando')
      return e.next()
    }

    // Alvo do endpoint: IG Recipient ID salvo pelo webhook > meta_instagram_business_id > ID oficial
    var igTargetId = ''
    var recipMatch = igNotes.match(/IG Recipient ID:\s*(\S+)/i)
    if (recipMatch && recipMatch[1] && recipMatch[1] !== 'undefined' && recipMatch[1] !== 'null') {
      igTargetId = recipMatch[1].trim()
    }
    if (!igTargetId && userRecord) {
      igTargetId = (userRecord.getString('meta_instagram_business_id') || '').trim()
    }
    if (!igTargetId) igTargetId = '17841418593400936'

    // Prompt compacto com a Constituição da Bia (users.bia_instructions)
    var biaInstructions = userRecord ? userRecord.getString('bia_instructions') || '' : ''
    if (!biaInstructions) {
      biaInstructions = userRecord ? userRecord.getString('ai_instructions') || '' : ''
    }
    var displayName = (customer.getString('first_name') || customer.getString('name') || '').trim()
    if (/^Lead Instagram/.test(displayName) || /^\d+$/.test(displayName)) displayName = ''

    var messages = []
    messages.push({
      role: 'system',
      content:
        'Você é Bia, consultora da BRF Imóveis.\n' +
        (biaInstructions
          ? 'INSTRUÇÕES SOBERANAS (siga integralmente):\n' + biaInstructions + '\n\n'
          : '') +
        'CONTEXTO: atendimento pelo Direct do Instagram @brf_imoveis_. ' +
        (displayName
          ? 'Nome do lead: ' + displayName + '. '
          : 'O lead não informou o nome; trate de forma cordial e genérica. ') +
        'Responda à última mensagem do lead em no máximo 3 frases curtas, tom humano e acolhedor, ' +
        'sem placeholders, sem markdown, sem metadados como [STATUS:...] ou [PHASE:...]. ' +
        'Nunca revele que é um sistema automatizado.',
    })
    try {
      var historyArr = $app.findRecordsByFilter(
        'conversations',
        "customer_id = '{:cid}' && (sender = 'customer' || sender = 'ai')",
        '-created',
        8,
        0,
        { cid: customerId },
      )
      var historySanitized = []
      for (var hIdx = 0; hIdx < historyArr.length; hIdx++) {
        var hRec = historyArr[hIdx]
        if (hRec.id === rec.id) continue
        var hContent = (hRec.getString('content') || '').trim()
        if (!hContent) continue
        historySanitized.push({
          role: hRec.getString('sender') === 'ai' ? 'assistant' : 'user',
          content: hContent,
        })
      }
      historySanitized.reverse()
      for (var mIdx = 0; mIdx < historySanitized.length; mIdx++)
        messages.push(historySanitized[mIdx])
    } catch (_) {}
    messages.push({ role: 'user', content: customerMessage })

    var responseText = ''
    try {
      var chatRes = $ai.chat({ model: 'fast', messages: messages })
      if (chatRes && chatRes.choices && chatRes.choices[0] && chatRes.choices[0].message) {
        responseText = (chatRes.choices[0].message.content || '').trim()
      }
    } catch (aiErr) {
      console.warn('[IG_AUTO_REPLY] $ai.chat falhou: ' + String(aiErr))
    }

    responseText = (responseText || '')
      .replace(/\[STATUS:\s*.*?\]/gi, '')
      .replace(/\[PHASE:\s*.*?\]/gi, '')
      .replace(/\[AUDIO\]/gi, '')
      .replace(/\[VIDEO\]/gi, '')
      .replace(/\[Nome\]/gi, displayName || '')
      .replace(/\{Nome\}/gi, displayName || '')
      .trim()

    if (!responseText || responseText === 'SKIP_MESSAGE') {
      var brHour = new Date(new Date().getTime() - 3 * 3600 * 1000).getUTCHours()
      var saudacao = brHour < 12 ? 'Bom dia' : brHour < 18 ? 'Boa tarde' : 'Boa noite'
      responseText = displayName
        ? saudacao + ', ' + displayName + '! Sou a Bia, da BRF Imóveis. Como posso te ajudar?'
        : saudacao + '! Sou a Bia, da BRF Imóveis. Como posso te ajudar?'
      console.warn(
        '[IG_AUTO_REPLY] IA sem texto; usando saudação segura para customer=' + customerId,
      )
    }

    // Re-checagem de dedupe imediatamente antes do envio (evita corrida com o fluxo principal)
    try {
      var recheckArr = $app.findRecordsByFilter(
        'conversations',
        "customer_id = '{:cid}' && sender = 'ai'",
        '-created',
        1,
        0,
        { cid: customerId },
      )
      if (recheckArr.length > 0) {
        var rAge =
          (new Date().getTime() - new Date(recheckArr[0].getString('created')).getTime()) / 60000
        if (rAge < 2 && (recheckArr[0].getString('content') || '').trim() === responseText) {
          console.log('[IG_AUTO_REPLY] Resposta idêntica recente, pulando envio')
          return e.next()
        }
      }
    } catch (_) {}

    var igEndpointUrl = 'https://graph.facebook.com/v22.0/' + igTargetId + '/messages'
    var igPayloadObj = { recipient: { id: igSenderId }, message: { text: responseText } }
    var sendRes = null
    try {
      sendRes = $http.send({
        url: igEndpointUrl,
        method: 'POST',
        headers: { Authorization: 'Bearer ' + igToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(igPayloadObj),
        timeout: 20,
      })
    } catch (httpErr) {
      igLogSendResult(userId, {
        statusCode: null,
        recipientId: igSenderId,
        targetId: igTargetId,
        url: igEndpointUrl,
        tokenPrefix: igToken.substring(0, 15) + '...',
        error: String(httpErr),
        request: igPayloadObj,
      })
      console.error('[IG_AUTO_REPLY] HTTP exception no envio IG: ' + String(httpErr))
      return e.next()
    }

    var resBody = sendRes && sendRes.json ? sendRes.json : sendRes ? sendRes.body : null
    var resMessageId =
      resBody && resBody.message_id
        ? resBody.message_id
        : resBody && resBody.recipient && resBody.recipient.message_id
          ? resBody.recipient.message_id
          : ''
    var ok200 = sendRes && sendRes.statusCode >= 200 && sendRes.statusCode < 300

    igLogSendResult(userId, {
      statusCode: sendRes ? sendRes.statusCode : null,
      recipientId: igSenderId,
      targetId: igTargetId,
      messageId: resMessageId,
      url: igEndpointUrl,
      tokenPrefix: igToken.substring(0, 15) + '...',
      response: resBody,
      request: { recipient: { id: igSenderId }, text_len: responseText.length },
    })

    if (ok200) {
      console.log(
        '[IG_AUTO_REPLY] DM IG enviada customer=' +
          customerId +
          ' recipient=' +
          igSenderId +
          ' message_id=' +
          (resMessageId || 'n/a'),
      )
      try {
        const replyRec = new Record($app.findCollectionByNameOrId('conversations'))
        replyRec.set('user_id', userId || '')
        replyRec.set('customer_id', customerId)
        replyRec.set('sender', 'ai')
        replyRec.set('content', responseText)
        replyRec.set('channel', 'instagram')
        $app.save(replyRec)
      } catch (_) {}
    } else {
      var errObj = resBody && resBody.error ? resBody.error : {}
      console.warn(
        '[IG_AUTO_REPLY] Envio IG NÃO aceito status=' +
          (sendRes ? sendRes.statusCode : 'null') +
          ' code=' +
          (errObj.code !== undefined ? errObj.code : 'none') +
          ' subcode=' +
          (errObj.error_subcode !== undefined ? errObj.error_subcode : 'none') +
          ' msg="' +
          (errObj.message || '') +
          '"',
      )
      // Token IG expirado (401 code=190): registra também no painel do CRM
      // (/configuracoes) para a renovação manual não ficar só nos logs do servidor.
      if (
        sendRes &&
        sendRes.statusCode === 401 &&
        errObj.code === 190 &&
        userId &&
        typeof $app !== 'undefined'
      ) {
        try {
          var tokUser = $app.findRecordById('users', userId)
          if (tokUser) {
            tokUser.set('meta_token_status', 'expired')
            $app.saveNoValidate(tokUser)
          }
        } catch (_) {}
      }
    }
  } catch (hookErr) {
    console.warn('[IG_AUTO_REPLY] Erro não-fatal: ' + String(hookErr))
  }

  return e.next()
}, 'conversations')

// ----------------------------------------------------------------------
// Rota de teste controlado: GET /backend/v1/instagram_reply_test
// Somente o lead de teste do Instagram (IGSID 29124300553897260) — nunca clientes reais.
// Ex.: /backend/v1/instagram_reply_test?token=BRF%20IA%20CRM&text=Ola
// ----------------------------------------------------------------------
routerAdd('GET', '/backend/v1/instagram_reply_test', (e) => {
  var q = {}
  try {
    q = e.requestInfo().query || {}
  } catch (_) {}
  var token = String(q['token'] || '').trim()
  if (token !== 'BRF IA CRM') {
    return e.json(401, { error: 'token inválido' })
  }

  var TEST_IGSID = '29124300553897260'
  var customer = null
  try {
    var custArr = $app.findRecordsByFilter('customers', 'notes ~ {:sid}', 'created', 1, 0, {
      sid: TEST_IGSID,
    })
    if (custArr.length > 0) customer = custArr[0]
  } catch (_) {}
  if (!customer) {
    return e.json(404, { error: 'lead de teste Instagram não encontrado no CRM' })
  }

  function testLog(info) {
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('user_id', customer.getString('user_id') || '')
      log.set('type', 'instagram_send_result')
      log.set(
        'message',
        '[IG_SEND_RESULT] status=' +
          (info.statusCode === null ? 'null' : info.statusCode) +
          ' recipient=' +
          (info.recipientId || 'n/a') +
          ' target=' +
          (info.targetId || 'n/a') +
          ' message_id=' +
          (info.messageId || 'n/a') +
          ' origin=rota_teste',
      )
      log.set(
        'details',
        JSON.stringify({
          url: info.url || null,
          statusCode: info.statusCode,
          recipient_id: info.recipientId || null,
          target_id: info.targetId || null,
          message_id: info.messageId || null,
          token_prefix: info.tokenPrefix || null,
          origin: 'rota_teste',
          error: info.error || null,
        }),
      )
      log.set(
        'payload',
        JSON.stringify({ request: info.request || null, response: info.response || null }),
      )
      $app.saveNoValidate(log)
    } catch (_) {}
  }

  var igNotes = customer.getString('notes') || ''
  var igSenderId = ''
  var sidMatch = igNotes.match(/IG Sender ID:\s*(\S+)/i)
  if (sidMatch) igSenderId = sidMatch[1]
  if (!igSenderId) igSenderId = TEST_IGSID

  var userId = customer.getString('user_id') || ''
  var userRecord = null
  try {
    if (userId) userRecord = $app.findRecordById('users', userId)
  } catch (_) {}
  if (!userRecord) {
    try {
      var usersArr = $app.findRecordsByFilter(
        'users',
        "meta_instagram_page_token != '' || meta_instagram_user_token != '' || meta_page_access_token != ''",
        '-updated',
        1,
        0,
      )
      if (usersArr.length > 0) userRecord = usersArr[0]
    } catch (_) {}
  }
  var igToken = userRecord
    ? (
        userRecord.getString('meta_instagram_page_token') ||
        userRecord.getString('meta_instagram_user_token') ||
        userRecord.getString('meta_page_access_token') ||
        ''
      ).trim()
    : ''
  if (!igToken) {
    return e.json(400, { error: 'nenhum token IG configurado (meta_instagram_page_token vazio)' })
  }

  var igTargetId = ''
  var recipMatch = igNotes.match(/IG Recipient ID:\s*(\S+)/i)
  if (recipMatch && recipMatch[1] && recipMatch[1] !== 'undefined' && recipMatch[1] !== 'null') {
    igTargetId = recipMatch[1].trim()
  }
  if (!igTargetId && userRecord) {
    igTargetId = (userRecord.getString('meta_instagram_business_id') || '').trim()
  }
  if (!igTargetId) igTargetId = '17841418593400936'

  var testText = String(q['text'] || 'Teste de entrega BRF Imóveis — Bia no Direct.').trim()
  var endpoint = 'https://graph.facebook.com/v22.0/' + igTargetId + '/messages'
  var payloadObj = { recipient: { id: igSenderId }, message: { text: testText } }
  var sendRes = null
  try {
    sendRes = $http.send({
      url: endpoint,
      method: 'POST',
      headers: { Authorization: 'Bearer ' + igToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj),
      timeout: 20,
    })
  } catch (httpErr) {
    testLog({
      statusCode: null,
      recipientId: igSenderId,
      targetId: igTargetId,
      url: endpoint,
      tokenPrefix: igToken.substring(0, 15) + '...',
      error: String(httpErr),
      request: payloadObj,
    })
    return e.json(502, { error: 'exceção HTTP: ' + String(httpErr) })
  }

  var resBody = sendRes && sendRes.json ? sendRes.json : sendRes ? sendRes.body : null
  var resMessageId =
    resBody && resBody.message_id
      ? resBody.message_id
      : resBody && resBody.recipient && resBody.recipient.message_id
        ? resBody.recipient.message_id
        : ''
  testLog({
    statusCode: sendRes ? sendRes.statusCode : null,
    recipientId: igSenderId,
    targetId: igTargetId,
    messageId: resMessageId,
    url: endpoint,
    tokenPrefix: igToken.substring(0, 15) + '...',
    response: resBody,
    request: payloadObj,
  })

  return e.json(200, {
    statusCode: sendRes ? sendRes.statusCode : null,
    recipient_id: igSenderId,
    target_id: igTargetId,
    message_id: resMessageId || null,
    response: resBody,
  })
})
