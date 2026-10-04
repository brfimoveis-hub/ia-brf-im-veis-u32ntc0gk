// @ts-nocheck
/// <reference path="../pb_data/types.d.ts" />

/**
 * Motor de Persistência da Bia — Job Agendado de Retomadas (Pilares A e B)
 * Executa a cada 15 minutos na janela das 08h às 20h:
 * cronAdd('bia_persistence_followup', '*\/15 8-20 * * *')
 *
 * A cada execução:
 * 1. Respeita horário comercial (janela do cron 8-20h + validação UTC-3 horário de Brasília).
 * 2. Trava ai_processing com liberação estrita no finally (TTL 3 min).
 * 3. Busca conversas elegíveis:
 *    - next_follow_up_at vencido (ou sem próximo follow-up mas elegível por tempo)
 *    - persistence_status = 'ativo' ou 'aguardando_momento'
 *    - promise_pending = true cumprir antes de tudo (Pilar B - Promessa feita)
 * 4. Dispara a mensagem de retomada da escala D+1 / D+3 / D+7 / D+14:
 *    - Cada toque com conteúdo diferente:
 *      * D+1: Pergunta consultiva leve sobre o imóvel em pauta ou dúvida pendente.
 *      * D+3: Novo ângulo / diferencial do imóvel em foco (localização, lazer, vaga, rentabilidade).
 *      * D+7: Condição / forma de pagamento / verificação de timing para o mês.
 *      * D+14: Validação de fechamento de ciclo / despedida elegante mantendo canal aberto.
 * 5. Avança follow_up_step, follow_up_count, last_follow_up_at, next_follow_up_at.
 * 6. Após D+14 migra para 'nurturing_monthly' (1 toque por mês, 30 dias de intervalo, nunca spam).
 * 7. Deduplicação por conteúdo normalizado (evita mensagens idênticas).
 * 8. Formatação WhatsApp rigorosa (*negrito simples*, sem tabelas markdown, sem cabeçalhos ###).
 * 9. Envio real via WhatsApp Cloud API idêntico ao ai_auto_reply.js (type: 'whatsapp_ai_send' em system_logs).
 * 10. Logs claros por execução: quantas retomadas disparadas, para quem e qual etapa.
 *
 * RESTRIÇÕES GOJA: Sem matchAll, sem for..of em Set/Map, sem spreads de objeto, sem optional chaining.
 */

cronAdd('bia_persistence_followup', '*/15 8-20 * * *', function () {
  var app = $app

  // 1. Função inline de formatação e guarda WhatsApp na saída
  function cleanWhatsAppFormat(text) {
    if (!text) return ''
    var out = String(text)
    out = out.replace(/\[HANDOVER:[^\]]*\]/gi, '').trim()
    out = out.replace(/\btransbordo\b/gi, 'atendimento especializado')
    out = out.replace(/\btrasbordo\b/gi, 'atendimento especializado')
    out = out.replace(/^[ \t]*#{1,6}[ \t]*/gm, '')
    out = out.replace(/#{1,6}/g, '')
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '*$1*')

    var lines = out.split('\n')
    var cleanedLines = []
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim()
      if (line.indexOf('|') !== -1) {
        if (/^\|?[-:\s|]+\|?$/.test(line)) {
          continue
        }
        var cells = line.split('|')
        var validCells = []
        for (var c = 0; c < cells.length; c++) {
          var cell = cells[c].trim()
          if (cell.length > 0) validCells.push(cell)
        }
        if (validCells.length >= 2) {
          cleanedLines.push('• ' + validCells[0] + ': ' + validCells.slice(1).join(' — '))
        } else if (validCells.length === 1) {
          cleanedLines.push('• ' + validCells[0])
        }
      } else {
        cleanedLines.push(lines[i])
      }
    }
    out = cleanedLines.join('\n')
    out = out.replace(/\n{3,}/g, '\n\n')

    if (out.length > 950) {
      var truncated = out.substring(0, 950)
      var lastPeriod = Math.max(
        truncated.lastIndexOf('. '),
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

  // 2. Normalização para dedup
  function normalizeTextForDedup(txt) {
    if (!txt) return ''
    return String(txt).replace(/\s+/g, ' ').trim().toLowerCase()
  }

  // 3. Janela de horário de Brasília (UTC-3: 08h00 às 20h00, seg a sáb)
  function isBrasiliaBusinessHours() {
    var now = new Date()
    var utcTime = now.getTime() + now.getTimezoneOffset() * 60000
    var brTime = new Date(utcTime - 3 * 3600000)
    var dayOfWeek = brTime.getDay()
    if (dayOfWeek === 0) return false // Domingo pausado por gentileza comercial

    var hours = brTime.getHours()
    return hours >= 8 && hours < 20
  }

  if (!isBrasiliaBusinessHours()) {
    console.log(
      '[BIA_PERSISTENCE] Fora da janela de atendimento de Brasília (08h-20h seg-sáb). Pausando execução.',
    )
    return
  }

  // 4. Resolver credenciais Meta do usuário do sistema
  function resolveMetaCredentials(appInstance) {
    var token = ''
    var phoneId = ''
    var userId = ''

    try {
      var usersWithMeta = appInstance.findRecordsByFilter(
        'users',
        "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
        '-created',
        1,
        0,
      )
      if (usersWithMeta.length > 0) {
        token = usersWithMeta[0].getString('meta_whatsapp_access_token')
        phoneId = usersWithMeta[0].getString('meta_whatsapp_phone_number_id')
        userId = usersWithMeta[0].id
      }
    } catch (_) {}

    if (!token)
      token = $os.getenv('WHATSAPP_TOKEN') || $os.getenv('META_WHATSAPP_ACCESS_TOKEN') || ''
    if (!phoneId)
      phoneId = $os.getenv('WHATSAPP_PHONE_ID') || $os.getenv('META_WHATSAPP_PHONE_NUMBER_ID') || ''

    return { token: token, phoneId: phoneId, userId: userId }
  }

  var metaCreds = resolveMetaCredentials(app)
  if (!metaCreds.token || !metaCreds.phoneId) {
    console.warn(
      '[BIA_PERSISTENCE] Credenciais Meta WhatsApp ausentes. Não é possível disparar follow-ups.',
    )
    return
  }

  // 5. Envio real via Meta Graph API v21.0 com gravação em system_logs (type='whatsapp_ai_send')
  function sendWhatsAppReal(appInstance, customer, rawMessage, creds, stepName) {
    var cleaned = cleanWhatsAppFormat(rawMessage)
    if (!cleaned || cleaned.length < 5) return false

    var customerId = customer.id
    var toPhone = customer.getString('phone') || customer.get('phone') || ''
    toPhone = String(toPhone).replace(/\D/g, '')
    if (toPhone.length < 10) return false
    if (!toPhone.startsWith('55') && toPhone.length <= 11) {
      toPhone = '55' + toPhone
    }

    var normalizedCurrent = normalizeTextForDedup(cleaned)

    // Deduplicação contra system_logs recentes de whatsapp_ai_send
    try {
      var recentLogs = appInstance.findRecordsByFilter(
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

    // Salvar conversa na tabela conversations
    try {
      var convCol = appInstance.findCollectionByNameOrId('conversations')
      var conv = new Record(convCol)
      conv.set('user_id', creds.userId || customer.getString('user_id') || '')
      conv.set('customer_id', customerId)
      conv.set('sender', 'ai')
      conv.set('content', cleaned)
      conv.set('channel', 'whatsapp')
      appInstance.save(conv)
    } catch (cErr) {
      console.warn('[BIA_PERSISTENCE] Aviso ao registrar conversa: ' + cErr.message)
    }

    // Disparo HTTP para a Meta Graph API v21.0
    var url = 'https://graph.facebook.com/v21.0/' + creds.phoneId + '/messages'
    var isOk = false
    var sendRes = null

    try {
      sendRes = $http.send({
        url: url,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + creds.token,
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

    // Registrar system_logs com type = 'whatsapp_ai_send'
    try {
      var logsCol = appInstance.findCollectionByNameOrId('system_logs')
      var logRec = new Record(logsCol)
      logRec.set('user_id', creds.userId || '')
      logRec.set('type', 'whatsapp_ai_send')
      logRec.set(
        'message',
        isOk
          ? 'Retomada de persistência (' + stepName + ') enviada com sucesso para ' + toPhone
          : 'Falha ao enviar retomada de persistência (' + stepName + ') para ' + toPhone,
      )
      logRec.set(
        'details',
        JSON.stringify({
          statusCode: sendRes ? sendRes.statusCode : 0,
          response: sendRes ? sendRes.json || sendRes.body : null,
          phone_id: creds.phoneId,
          to: toPhone,
          step: stepName,
          customer_id: customerId,
        }),
      )
      logRec.set(
        'payload',
        JSON.stringify({
          preview: cleaned.substring(0, 120),
          full_text: cleaned,
          customer_id: customerId,
          follow_up_step: stepName,
        }),
      )
      appInstance.saveNoValidate(logRec)
    } catch (logErr) {
      console.warn('[BIA_PERSISTENCE] Falha ao gravar log whatsapp_ai_send: ' + logErr.message)
    }

    return isOk
  }

  // 6. Aquisição e liberação da trava ai_processing (com TTL de 3 min = 180000ms)
  var lockTtlMs = 180000

  function acquireLock(appInstance, customerId) {
    var acquired = false
    try {
      appInstance.runInTransaction(function (txApp) {
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

  function releaseLock(appInstance, customerId) {
    try {
      var cust = appInstance.findRecordById('customers', customerId)
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
      appInstance.saveNoValidate(cust)
    } catch (_) {
      try {
        appInstance
          .db()
          .newQuery(
            "UPDATE customers SET tags = (SELECT json_group_array(value) FROM json_each(customers.tags) WHERE value NOT LIKE 'ai_processing%') WHERE id = {:id}",
          )
          .bind({ id: customerId })
          .execute()
      } catch (_) {}
    }
  }

  // 7. Textos das 4 etapas de persistência temporal (D+1, D+3, D+7, D+14) e Nurturing Mensal
  function buildPersistenceMessage(step, customer, lastPropertyTitle) {
    var rawName = (customer.getString('name') || customer.getString('first_name') || '').trim()
    var custName = ''
    if (rawName && !rawName.includes('+') && !/^\d+$/.test(rawName)) {
      custName = rawName.split(' ')[0]
    }
    var greeting = custName ? 'Olá, ' + custName + '!' : 'Olá! Tudo bem?'
    var propContext = lastPropertyTitle
      ? ' em relação ao *' + lastPropertyTitle + '*'
      : ' sobre o imóvel que conversamos'

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
      // D+1: Pergunta consultiva leve sobre o imóvel em pauta
      return (
        greeting +
        ' Passando para saber se você conseguiu dar uma olhada na opção' +
        propContext +
        ' ou se ficou alguma dúvida sobre a metragem, localização e fluxo inicial.'
      )
    }

    if (step === 'd3') {
      // D+3: Diferencial do imóvel em foco (lazer, localização, rentabilidade)
      return (
        greeting +
        ' Separei um detalhe importante' +
        propContext +
        ': a valorização projetada para a região e as áreas de lazer completas têm sido um dos maiores atrativos. Quer que eu te envie a planta detalhada ou o espelho de unidades disponíveis?'
      )
    }

    if (step === 'd7') {
      // D+7: Condição / forma de pagamento / verificação de timing para o mês
      return (
        greeting +
        ' Gostaria de verificar se o projeto do novo imóvel ainda está no seu radar para este mês. Conseguimos condições facilitadas de entrada e fluxo direto de parcelamento' +
        propContext +
        '. Como estão os seus planos por aí?'
      )
    }

    if (step === 'd14') {
      // D+14: Validação de fechamento de ciclo / despedida elegante
      return (
        greeting +
        ' Espero que esteja tudo ótimo! Como não tivemos retorno recente, vou deixar você totalmente à vontade para focar nas suas prioridades agora. Se em algum momento fizer sentido retomar sobre' +
        propContext +
        ' ou avaliar novas opções, estarei por aqui com o corretor Mauro. Um grande abraço!'
      )
    }

    if (step === 'nurturing_monthly') {
      // Nurturing mensal (1x/mês, nunca spam)
      return (
        greeting +
        ' Passando apenas para compartilhar uma atualização rápida do mercado imobiliário: tivemos novos lançamentos e oportunidades selecionadas na região. Quando estiver pronto para retomar sua busca com calma, é só me chamar por aqui!'
      )
    }

    return ''
  }

  // 8. Calcular próxima data de follow-up
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
    if (step === 'd14') {
      // De D14 vai para nurturing mensal: +30 dias
      return new Date(nowMs + 30 * 24 * 3600 * 1000).toISOString()
    }
    if (step === 'nurturing_monthly') {
      // Próximo toque mensal: +30 dias
      return new Date(nowMs + 30 * 24 * 3600 * 1000).toISOString()
    }
    return ''
  }

  // 9. Buscar conversas/clientes elegíveis
  var executedCount = 0
  var nowIso = new Date().toISOString()
  var oneDayMs = 24 * 60 * 60 * 1000

  // 9.1 Prioridade MÁXIMA: Promessas pendentes (Pilar B)
  try {
    var promiseCustomers = app.findRecordsByFilter(
      'customers',
      "promise_pending = true && (persistence_status = 'ativo' || persistence_status = 'aguardando_momento' || persistence_status = '')",
      '-promise_made_at',
      10,
      0,
    )

    for (var pIdx = 0; pIdx < promiseCustomers.length; pIdx++) {
      var pCust = promiseCustomers[pIdx]
      var pCustId = pCust.id

      if (!acquireLock(app, pCustId)) continue

      try {
        var msgText = buildPersistenceMessage('promised_followup', pCust, '')
        var sent = sendWhatsAppReal(app, pCust, msgText, metaCreds, 'promised_followup')
        if (sent) {
          pCust.set('promise_pending', false)
          pCust.set('last_follow_up_at', nowIso)
          pCust.set('next_follow_up_at', new Date(Date.now() + 2 * oneDayMs).toISOString())
          pCust.set('follow_up_step', 'd3')
          pCust.set('follow_up_count', (pCust.getInt('follow_up_count') || 0) + 1)
          pCust.set('persistence_status', 'ativo')
          app.saveNoValidate(pCust)
          executedCount++
          console.log(
            '[BIA_PERSISTENCE] [PILAR B] Promessa cumprida para cliente ' +
              pCustId +
              ' (' +
              (pCust.getString('name') || '') +
              ')',
          )
        }
      } finally {
        releaseLock(app, pCustId)
      }
    }
  } catch (pErr) {
    console.warn('[BIA_PERSISTENCE] Erro no bloco de promessas pendentes: ' + pErr.message)
  }

  // 9.2 Cadência Temporal: Clientes com next_follow_up_at vencido
  try {
    var scheduledCustomers = app.findRecordsByFilter(
      'customers',
      "next_follow_up_at != '' && next_follow_up_at <= '" +
        nowIso +
        "' && (persistence_status = 'ativo' || persistence_status = 'aguardando_momento') && is_blocked = false",
      'next_follow_up_at',
      20,
      0,
    )

    for (var sIdx = 0; sIdx < scheduledCustomers.length; sIdx++) {
      var sCust = scheduledCustomers[sIdx]
      var sCustId = sCust.id

      if (!acquireLock(app, sCustId)) continue

      try {
        var currentStep = sCust.getString('follow_up_step') || 'd1'
        var nextStep = currentStep
        if (currentStep === 'd1') nextStep = 'd3'
        else if (currentStep === 'd3') nextStep = 'd7'
        else if (currentStep === 'd7') nextStep = 'd14'
        else if (currentStep === 'd14') nextStep = 'nurturing_monthly'
        else if (currentStep === 'nurturing_monthly') nextStep = 'nurturing_monthly'

        var msgTextScheduled = buildPersistenceMessage(nextStep, sCust, '')
        var ok = sendWhatsAppReal(app, sCust, msgTextScheduled, metaCreds, nextStep)

        if (ok) {
          sCust.set('follow_up_step', nextStep)
          sCust.set('follow_up_count', (sCust.getInt('follow_up_count') || 0) + 1)
          sCust.set('last_follow_up_at', nowIso)
          sCust.set('next_follow_up_at', calculateNextFollowUp(nextStep))
          if (nextStep === 'd14') {
            sCust.set('persistence_status', 'aguardando_momento')
          }
          app.saveNoValidate(sCust)
          executedCount++
          console.log(
            '[BIA_PERSISTENCE] Retomada agendada (' +
              nextStep +
              ') enviada para ' +
              sCustId +
              ' (' +
              (sCust.getString('name') || '') +
              ')',
          )
        }
      } finally {
        releaseLock(app, sCustId)
      }
    }
  } catch (schErr) {
    console.warn(
      '[BIA_PERSISTENCE] Erro no bloco de next_follow_up_at agendados: ' + schErr.message,
    )
  }

  // 9.3 Retomadas em caso de silêncio recente sem next_follow_up_at preenchido (D+1 pós-proposta/silêncio)
  try {
    var idleCustomers = app.findRecordsByFilter(
      'customers',
      "(persistence_status = 'ativo' || persistence_status = '') && is_blocked = false && (next_follow_up_at = '' || next_follow_up_at = null)",
      '-updated',
      25,
      0,
    )

    var nowMs2 = Date.now()
    for (var idIdx = 0; idIdx < idleCustomers.length; idIdx++) {
      var iCust = idleCustomers[idIdx]
      var iCustId = iCust.id

      // Checar última mensagem do cliente
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
      var elapsedMs = nowMs2 - latestCreated

      // Só ativa follow-up se já se passaram pelo menos 22 horas de silêncio e menos de 48 horas (janela D+1)
      if (elapsedMs < 22 * 3600 * 1000 || elapsedMs > 48 * 3600 * 1000) {
        continue
      }

      // Se a última mensagem partiu do cliente há menos de 24h, a Bia deve responder no ai_auto_reply, não no cron
      if (latestMsg.getString('sender') === 'customer' && elapsedMs < 24 * 3600 * 1000) {
        continue
      }

      if (!acquireLock(app, iCustId)) continue

      try {
        var d1Text = buildPersistenceMessage('d1', iCust, '')
        var d1Sent = sendWhatsAppReal(app, iCust, d1Text, metaCreds, 'd1')
        if (d1Sent) {
          iCust.set('follow_up_step', 'd1')
          iCust.set('follow_up_count', (iCust.getInt('follow_up_count') || 0) + 1)
          iCust.set('last_follow_up_at', nowIso)
          iCust.set('next_follow_up_at', calculateNextFollowUp('d1'))
          iCust.set('persistence_status', 'ativo')
          app.saveNoValidate(iCust)
          executedCount++
          console.log(
            '[BIA_PERSISTENCE] Follow-up D+1 iniciado para cliente em silêncio: ' +
              iCustId +
              ' (' +
              (iCust.getString('name') || '') +
              ')',
          )
        }
      } finally {
        releaseLock(app, iCustId)
      }
    }
  } catch (idleErr) {
    console.warn('[BIA_PERSISTENCE] Erro no bloco de clientes em silêncio: ' + idleErr.message)
  }

  console.log(
    '[BIA_PERSISTENCE] Execução concluída. Total de retomadas disparadas: ' + executedCount,
  )
})
