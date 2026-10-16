/**
 * REENVIO DIRIGIDO DO E-BOOK / BOOK OFICIAL (VISTAGE RESIDENCE)
 *
 * Endpoints:
 * - GET  /backend/v1/ebook-resend/audit
 *   Varre a base e identifica com precisão:
 *   1. Clientes que já receberam mensagem da Bia/régua/remarketing/correção.
 *   2. Clientes que NUNCA receberam o material com link oficial legítimo no corpo.
 *   3. Aplica filtros obrigatórios de proteção:
 *      - Não bloqueados (is_blocked = false)
 *      - Não pausados (persistence_status != 'pausado')
 *      - Não frios / desinteressados (sem 'frio'/'não é o momento' nas tags/status)
 *      - Sem diálogo vivo nas últimas 24h
 *      - Sem e-book já entregue (dedup estrito)
 *   Retorna contagem total de abordados, quantos já têm e-book, quantos estão pendentes elegíveis,
 *   quantos foram desqualificados (bloqueados, pausados, 24h viva) e a lista detalhada para conferência.
 *
 * - POST /backend/v1/ebook-resend/batch
 *   Dispara um lote controlado (máximo 15 por ciclo, anti-flood) para os clientes pendentes:
 *   - Formato padronizado e consertado:
 *     Identificação oficial Bia ("Bia da BRF Imóveis — bom dia/boa tarde, tudo bem?"),
 *     link do book NO CORPO da mensagem,
 *     legenda "Material oficial: Vistage Residence",
 *     pergunta leve no final ("Faz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?").
 *     SEM link de site, SEM preço cheio, SEM tabelas/políticas (blacklist preservada).
 *   - Validação da janela comercial de Brasília (8h às 18h seg a sáb).
 *   - Respeita trava de 3 min (ai_processing).
 *   - Registra em conversations (channel: 'whatsapp', sender: 'ai').
 *   - Registra auditoria completa em system_logs (type: 'ebook_resend_item' e 'ebook_resend_batch').
 */

function getBrasiliaHourAndWindow() {
  var now = new Date()
  var utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  var brTime = new Date(utcTime - 3 * 3600000)
  var brHour = brTime.getHours()
  var brDay = brTime.getDay() // 0 = Domingo
  var isWindow = brDay !== 0 && brHour >= 8 && brHour < 18
  return {
    hour: brHour,
    minute: brTime.getMinutes(),
    dayOfWeek: brDay,
    isCommercialWindow: isWindow,
    iso: now.toISOString(),
  }
}

function resolveCustomerCleanPhone(rawPhone) {
  if (!rawPhone) return ''
  var toPhone = String(rawPhone).replace(/\D/g, '')
  if (toPhone.startsWith('0') && toPhone.length >= 11) {
    toPhone = toPhone.substring(1)
  }
  if (toPhone.length === 8 || toPhone.length === 9) {
    toPhone = '48' + toPhone
  }
  if (toPhone.length < 10) return ''
  if (!toPhone.startsWith('55') && toPhone.length <= 11) {
    toPhone = '55' + toPhone
  }
  return toPhone
}

function resolveCustomerFirstName(cust) {
  if (!cust) return ''
  var fName = (cust.getString('first_name') || '').trim()
  var fullName = (cust.getString('name') || '').trim()
  var candidate = fName || fullName
  if (!candidate) return ''
  if (
    candidate.includes('+') ||
    candidate.includes('@') ||
    /^\d+$/.test(candidate.replace(/[\s\(\)\-\.]/g, ''))
  ) {
    return ''
  }
  if (
    /^(lead|cliente|contato|teste|whatsapp|meta|novo|usuario|usuário|imóvel|imovel|sem nome)\b/i.test(
      candidate,
    )
  ) {
    return ''
  }
  var parts = candidate.split(/\s+/).filter(Boolean)
  var first = parts[0]
  if (!first || first.length < 2 || /[0-9_#\*\/\\]/.test(first)) return ''
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

function resolveOfficialVistageBookLink(app) {
  var defaultDriveLink =
    'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'
  try {
    var recs = app.findRecordsByFilter(
      'ai_knowledge_files',
      "id = 'fcvyoatlxt56do2' || (is_active = true && (name ~ 'Vistage' || name ~ 'BOOK') && extracted_text ~ 'drive.google.com')",
      '-updated',
      1,
      0,
    )
    if (recs && recs.length > 0) {
      var ext = recs[0].getString('extracted_text') || ''
      var m = ext.match(/https:\/\/drive\.google\.com\/[^\s\)"'\]]+/i)
      if (m && m[0]) {
        return m[0]
      }
    }
  } catch (_) {}
  return defaultDriveLink
}

function hasReceivedOfficialEbook(convs, bookLink) {
  if (!convs || convs.length === 0) return false
  var normLink = (bookLink || '').trim()

  for (var i = 0; i < convs.length; i++) {
    var c = convs[i]
    var content = c.getString('content') || ''
    var channel = c.getString('channel') || ''

    if (
      (normLink && content.indexOf(normLink) !== -1) ||
      content.indexOf('1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG') !== -1 ||
      content.indexOf('Apresentacao_Vistage_Residence') !== -1 ||
      (content.indexOf('Material oficial: Vistage Residence') !== -1 &&
        content.indexOf('drive.google.com') !== -1) ||
      channel === 'acao_matinal_ebook' ||
      content.indexOf('[acao_matinal_ebook]') !== -1 ||
      content.indexOf('[reenvio_ebook_vistage]') !== -1
    ) {
      return true
    }
  }
  return false
}

function checkCustomerExclusions(cust, convs, nowMs) {
  var status = (cust.getString('status') || '').toLowerCase()
  var phase = (cust.getString('phase') || '').toLowerCase()
  var pStatus = (cust.getString('persistence_status') || '').toLowerCase()
  var followUpStep = (cust.getString('follow_up_step') || '').toLowerCase()
  var isBlocked = !!cust.getBool('is_blocked')

  var rawTags = cust.get('tags') || []
  var tagsList = []
  if (Array.isArray(rawTags)) {
    tagsList = rawTags
      .filter(function (t) {
        return typeof t === 'string'
      })
      .map(function (t) {
        return t.toLowerCase()
      })
  } else if (typeof rawTags === 'string') {
    try {
      var parsed = JSON.parse(rawTags)
      if (Array.isArray(parsed)) {
        tagsList = parsed.map(function (t) {
          return String(t).toLowerCase()
        })
      }
    } catch (_) {}
  }

  if (isBlocked || status.includes('bloqueado') || tagsList.includes('bloqueado')) {
    return { excluded: true, reason: 'bloqueado' }
  }
  if (pStatus === 'pausado' || tagsList.includes('ai_paused')) {
    return { excluded: true, reason: 'pausado' }
  }
  if (
    status.includes('perdido') ||
    phase.includes('perdido') ||
    tagsList.includes('frio') ||
    tagsList.includes('não é o momento') ||
    tagsList.includes('nao e o momento')
  ) {
    return { excluded: true, reason: 'frio_ou_perdido' }
  }
  if (followUpStep === 'finalizado') {
    return { excluded: true, reason: 'finalizado' }
  }

  // Diálogo vivo / interação nas últimas 24h
  var oneDayMs = 24 * 60 * 60 * 1000
  if (convs && convs.length > 0) {
    var latestConv = convs[0]
    var cTime = new Date(latestConv.getString('created')).getTime()
    if (nowMs - cTime < oneDayMs) {
      return {
        excluded: true,
        reason: 'conversa_viva_24h',
        last_sender: latestConv.getString('sender') || 'unknown',
      }
    }
  }

  return { excluded: false, reason: null }
}

/**
 * Auditoria completa de clientes
 */
function auditEbookResendCandidates(app) {
  var bookLink = resolveOfficialVistageBookLink(app)
  var now = new Date()
  var nowMs = now.getTime()

  // Buscar todos os clientes que já receberam mensagem ou foram abordados pela Bia/régua/remarketing
  var allCustomers = []
  try {
    allCustomers = app.findRecordsByFilter('customers', "phone != ''", '-updated', 1000, 0)
  } catch (err) {
    console.error('[EBOOK_RESEND] Erro ao buscar clientes: ' + err.message)
    return { error: err.message }
  }

  var approachedList = []
  var alreadyDeliveredList = []
  var excludedList = []
  var eligiblePendingList = []

  for (var i = 0; i < allCustomers.length; i++) {
    var cust = allCustomers[i]
    var custId = cust.id
    var phone = resolveCustomerCleanPhone(cust.getString('phone'))
    if (!phone || phone.length < 10) continue

    // Buscar conversas deste cliente
    var convs = []
    try {
      convs = app.findRecordsByFilter(
        'conversations',
        "customer_id = '" + custId + "'",
        '-created',
        30,
        0,
      )
    } catch (_) {}

    // Critério: já recebeu mensagem da régua/remarketing/Bia OU possui histórico de follow-up
    var hasPriorApproach = false
    var lastSentAt = cust.getString('last_sent_at') || ''
    var lastFollowUpAt = cust.getString('last_follow_up_at') || ''
    var followUpCount = cust.getInt('follow_up_count') || 0
    var followUpStep = cust.getString('follow_up_step') || ''

    if (convs.length > 0 || lastSentAt || lastFollowUpAt || followUpCount > 0 || followUpStep) {
      hasPriorApproach = true
    }

    if (!hasPriorApproach) {
      continue
    }

    var greetingName = resolveCustomerFirstName(cust)
    var clientSummary = {
      id: custId,
      name: cust.getString('name') || 'Sem nome',
      greeting_name: greetingName,
      phone: phone,
      status: cust.getString('status') || '',
      follow_up_step: followUpStep,
      follow_up_count: followUpCount,
      last_conv_date: convs.length > 0 ? convs[0].getString('created') : null,
    }

    approachedList.push(clientSummary)

    // Checar se já recebeu o e-book legítimo
    if (hasReceivedOfficialEbook(convs, bookLink)) {
      alreadyDeliveredList.push(clientSummary)
      continue
    }

    // Checar exclusões obrigatórias (bloqueado, pausado, frio, 24h viva)
    var exclusionCheck = checkCustomerExclusions(cust, convs, nowMs)
    if (exclusionCheck.excluded) {
      clientSummary.exclusion_reason = exclusionCheck.reason
      excludedList.push(clientSummary)
      continue
    }

    // Cliente é ELEGÍVEL e PENDENTE
    eligiblePendingList.push(clientSummary)
  }

  return {
    book_link: bookLink,
    total_approached: approachedList.length,
    already_delivered: alreadyDeliveredList.length,
    excluded_count: excludedList.length,
    eligible_pending_count: eligiblePendingList.length,
    eligible_pending: eligiblePendingList,
    excluded_breakdown: excludedList,
  }
}

// ============================================================================
// ENDPOINT: GET /backend/v1/ebook-resend/audit
// ============================================================================
routerAdd('GET', '/backend/v1/ebook-resend/audit', function (c) {
  var app = $app
  var windowInfo = getBrasiliaHourAndWindow()
  var audit = auditEbookResendCandidates(app)

  if (audit.error) {
    return c.json(500, { success: false, error: audit.error })
  }

  return c.json(200, {
    success: true,
    commercial_window: windowInfo,
    book_link: audit.book_link,
    summary: {
      total_approached: audit.total_approached,
      already_delivered: audit.already_delivered,
      excluded_count: audit.excluded_count,
      eligible_pending_count: audit.eligible_pending_count,
    },
    eligible_pending: audit.eligible_pending,
    excluded_sample: audit.excluded_breakdown.slice(0, 10),
    checked_at: new Date().toISOString(),
  })
})

// ============================================================================
// ENDPOINT: POST /backend/v1/ebook-resend/batch
// ============================================================================
routerAdd(
  'POST',
  '/backend/v1/ebook-resend/batch',
  function (c) {
    var app = $app
    var windowInfo = getBrasiliaHourAndWindow()

    // 1. Verificar credenciais Meta WhatsApp do usuário logado ou sistema
    var metaToken = ''
    var metaPhoneId = ''
    var activeUserId = ''

    try {
      var authRec = c.requestInfo().auth
      if (authRec) {
        activeUserId = authRec.id
        metaToken = (authRec.getString('meta_whatsapp_access_token') || '').trim()
        metaPhoneId = (authRec.getString('meta_whatsapp_phone_number_id') || '').trim()
      }
    } catch (_) {}

    if (!metaToken || !metaPhoneId) {
      try {
        var usersWithMeta = app.findRecordsByFilter(
          'users',
          "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
          '-created',
          1,
          0,
        )
        if (usersWithMeta && usersWithMeta.length > 0) {
          metaToken = (usersWithMeta[0].getString('meta_whatsapp_access_token') || '').trim()
          metaPhoneId = (usersWithMeta[0].getString('meta_whatsapp_phone_number_id') || '').trim()
          if (!activeUserId) activeUserId = usersWithMeta[0].id
        }
      } catch (_) {}
    }

    if (!metaToken || !metaPhoneId) {
      return c.json(400, {
        success: false,
        error: 'Credenciais do Meta WhatsApp Cloud API não configuradas no sistema.',
      })
    }

    // 2. Parâmetros da requisição
    var body = {}
    try {
      body = c.requestInfo().body || {}
    } catch (_) {}

    var forceOutsideWindow = !!body.force_outside_window
    var maxBatchSize = parseInt(body.batch_size || 15, 10)
    if (isNaN(maxBatchSize) || maxBatchSize < 1) maxBatchSize = 15
    if (maxBatchSize > 15) maxBatchSize = 15 // Teto rígido anti-flood: 15 por ciclo

    if (!windowInfo.isCommercialWindow && !forceOutsideWindow) {
      return c.json(400, {
        success: false,
        error:
          'Fora do horário comercial de Brasília (8h às 18h, seg a sáb). Para enviar mesmo assim, marque a confirmação expressa.',
        commercial_window: windowInfo,
      })
    }

    // 3. Executar auditoria para obter a lista estrita dos pendentes
    var audit = auditEbookResendCandidates(app)
    if (audit.error) {
      return c.json(500, { success: false, error: audit.error })
    }

    var pendingList = audit.eligible_pending || []
    if (pendingList.length === 0) {
      return c.json(200, {
        success: true,
        dispatched_count: 0,
        remaining_pending: 0,
        message: 'Nenhum cliente elegível pendente de e-book no momento!',
      })
    }

    // Pegar até maxBatchSize
    var batch = pendingList.slice(0, maxBatchSize)
    var bookLink = audit.book_link

    var salutationWord =
      windowInfo.hour < 12 ? 'bom dia' : windowInfo.hour < 18 ? 'boa tarde' : 'boa noite'
    var metaUrl = 'https://graph.facebook.com/v21.0/' + metaPhoneId + '/messages'

    var dispatched = []
    var failed = []

    for (var bIdx = 0; bIdx < batch.length; bIdx++) {
      var item = batch[bIdx]
      var custId = item.id
      var phoneNum = item.phone
      var gName = item.greeting_name

      // Trava blindada ai_processing
      var lockAcquired = false
      try {
        var custRec = app.findRecordById('customers', custId)
        var rawTags = custRec.get('tags') || []
        var tags = []
        if (Array.isArray(rawTags)) {
          tags = rawTags.filter(function (t) {
            return typeof t === 'string'
          })
        }
        var nowMs = Date.now()
        var lockPrefix = 'ai_processing:'
        var isLocked = false
        for (var tIdx = 0; tIdx < tags.length; tIdx++) {
          var t = tags[tIdx]
          if (t.indexOf(lockPrefix) === 0) {
            var lockTime = parseInt(t.substring(lockPrefix.length), 10)
            if (!isNaN(lockTime) && nowMs - lockTime < 180000) {
              isLocked = true
              break
            }
          }
        }
        if (isLocked) {
          failed.push({ id: custId, phone: phoneNum, error: 'Locked (ai_processing ativa)' })
          continue
        }

        var newTags = tags.filter(function (t) {
          return t !== 'ai_processing' && t.indexOf('ai_processing:') !== 0
        })
        newTags.push('ai_processing:' + nowMs)
        custRec.set('tags', newTags)
        app.saveNoValidate(custRec)
        lockAcquired = true
      } catch (lockErr) {
        failed.push({ id: custId, phone: phoneNum, error: 'Erro de trava: ' + lockErr.message })
        continue
      }

      // Montagem do texto consertado conforme especificação:
      // Identificação oficial Bia ("Bia da BRF Imóveis — bom dia/boa tarde, tudo bem?"),
      // Contextualização com o link oficial no corpo,
      // Legenda "Material oficial: Vistage Residence",
      // Pergunta leve final,
      // SEM link de site, SEM preço cheio.
      var greetingPart = gName
        ? 'Bia da BRF Imóveis — ' + salutationWord + ', ' + gName + ', tudo bem?'
        : 'Bia da BRF Imóveis — ' + salutationWord + ', tudo bem?'

      var fullMessageText =
        greetingPart +
        '\n\nLembrei de você e separei o material oficial do Vistage Residence em Barreiros, São José/SC:' +
        '\n\n📄 *Material oficial: Vistage Residence*' +
        '\n' +
        bookLink +
        '\n\nFaz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?'

      var sendSuccess = false
      var sendError = ''

      try {
        var sendRes = $http.send({
          url: metaUrl,
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + metaToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phoneNum,
            type: 'text',
            text: { preview_url: true, body: fullMessageText },
          }),
          timeout: 25,
        })

        if (sendRes && sendRes.statusCode >= 200 && sendRes.statusCode < 300) {
          sendSuccess = true
        } else {
          var errBody = ''
          try {
            errBody = JSON.stringify(sendRes ? sendRes.json || sendRes.body : '')
          } catch (_) {}
          sendError = 'HTTP ' + (sendRes ? sendRes.statusCode : 0) + ': ' + errBody
        }
      } catch (httpErr) {
        sendError = 'Exceção HTTP: ' + httpErr.message
      }

      // Liberação de lock e gravação de histórico
      try {
        var cUpdate = app.findRecordById('customers', custId)
        var cRawTags = cUpdate.get('tags') || []
        var cTags = []
        if (Array.isArray(cRawTags)) {
          cTags = cRawTags.filter(function (t) {
            return typeof t === 'string' && t.indexOf('ai_processing') !== 0
          })
        }

        if (sendSuccess) {
          cTags.push('ebook_vistage_entregue')
          cUpdate.set('tags', cTags)
          cUpdate.set('last_follow_up_at', new Date().toISOString())
          cUpdate.set(
            'next_follow_up_at',
            new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
          )
          cUpdate.set('follow_up_step', 'd3')
          cUpdate.set('follow_up_count', (cUpdate.getInt('follow_up_count') || 0) + 1)
          cUpdate.set('persistence_status', 'ativo')
          app.saveNoValidate(cUpdate)

          // Gravar conversa
          try {
            var convCol = app.findCollectionByNameOrId('conversations')
            var convRec = new Record(convCol)
            convRec.set('user_id', activeUserId || cUpdate.getString('user_id') || '')
            convRec.set('customer_id', custId)
            convRec.set('sender', 'ai')
            convRec.set('content', fullMessageText)
            convRec.set('channel', 'whatsapp')
            app.saveNoValidate(convRec)
          } catch (_) {}

          // Gravar system_logs individual
          try {
            var logsCol = app.findCollectionByNameOrId('system_logs')
            var logRec = new Record(logsCol)
            logRec.set('user_id', activeUserId)
            logRec.set('type', 'ebook_resend_item')
            logRec.set(
              'message',
              'E-book Vistage reenviado com sucesso para ' +
                phoneNum +
                ' [' +
                (gName || 'Sem nome') +
                ']',
            )
            logRec.set(
              'details',
              JSON.stringify({
                customer_id: custId,
                phone: phoneNum,
                name: item.name,
                book_link: bookLink,
                status: 'sucesso',
              }),
            )
            logRec.set('payload', JSON.stringify({ message: fullMessageText }))
            app.saveNoValidate(logRec)
          } catch (_) {}

          dispatched.push({ id: custId, phone: phoneNum, name: item.name })
        } else {
          cUpdate.set('tags', cTags)
          app.saveNoValidate(cUpdate)
          failed.push({ id: custId, phone: phoneNum, error: sendError })
        }
      } catch (cleanupErr) {
        console.warn('[EBOOK_RESEND] Erro pós-envio: ' + cleanupErr.message)
      }
    }

    // Gravar log de resumo do lote em system_logs
    try {
      var sLogsCol = app.findCollectionByNameOrId('system_logs')
      var batchLog = new Record(sLogsCol)
      batchLog.set('user_id', activeUserId)
      batchLog.set('type', 'ebook_resend_batch')
      batchLog.set(
        'message',
        'Lote de reenvio de e-book concluído: ' +
          dispatched.length +
          ' enviados com sucesso, ' +
          failed.length +
          ' falhas.',
      )
      batchLog.set(
        'details',
        JSON.stringify({
          dispatched_count: dispatched.length,
          failed_count: failed.length,
          total_attempted: batch.length,
          remaining_pending: Math.max(0, pendingList.length - dispatched.length),
          dispatched: dispatched,
          failed: failed,
          operator: activeUserId,
        }),
      )
      app.saveNoValidate(batchLog)
    } catch (_) {}

    return c.json(200, {
      success: true,
      dispatched_count: dispatched.length,
      failed_count: failed.length,
      remaining_pending: Math.max(0, pendingList.length - dispatched.length),
      dispatched: dispatched,
      failed: failed,
      message:
        dispatched.length +
        ' clientes receberam o material oficial Vistage com o link no corpo com sucesso!',
    })
  },
  $apis.requireAuth(),
)
