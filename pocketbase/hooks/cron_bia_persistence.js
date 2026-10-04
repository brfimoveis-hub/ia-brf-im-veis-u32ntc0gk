// @ts-nocheck
/// <reference path="../pb_data/types.d.ts" />

/**
 * Motor de Persistência da Bia — Job Agendado de Retomadas (Pilares A e B)
 * Executa a cada 10 minutos verificando clientes que precisam de follow-up:
 * - Janela comercial de Brasília: 08h30 às 19h30, de segunda a sábado (não roda domingo).
 * - Respeita a trava ai_processing (ignora clientes com trava ativa recente).
 * - Debounce e deduplicação para nunca reenviar mensagem repetida.
 * - Pilar A: Cadência D+1, D+3, D+7, D+14 em caso de silêncio.
 * - Pilar B: Promessa Feita = Retomada Obrigatória (prioridade máxima).
 * - Saída 100% higienizada pela guarda formatWhatsAppOutput.
 * NOTA GOJA/JSVM: Todas as funções e lógicas são declaradas INLINE dentro do callback.
 */

cronAdd('bia_persistence_followups', '*/10 * * * *', function () {
  var app = $app

  // Função inline para formatação WhatsApp
  function cleanWhatsAppTextInline(text) {
    if (!text) return ''
    var out = String(text)
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

  // Função inline para janela de Brasília (08h30 às 19h30, seg-sáb)
  function isBrasiliaBusinessHoursInline() {
    var now = new Date()
    var utcTime = now.getTime() + now.getTimezoneOffset() * 60000
    var brTime = new Date(utcTime - 3 * 3600000)
    var dayOfWeek = brTime.getDay()
    if (dayOfWeek === 0) return false // Domingo pausado

    var hours = brTime.getHours()
    var minutes = brTime.getMinutes()
    var currentMinuteOfDay = hours * 60 + minutes

    return currentMinuteOfDay >= 510 && currentMinuteOfDay <= 1170
  }

  // Função inline para envio de WhatsApp
  function sendFollowUpWhatsAppInline(appInstance, customer, rawMessage) {
    var cleaned = cleanWhatsAppTextInline(rawMessage)
    if (!cleaned || cleaned.length < 5) return false

    try {
      var convCol = appInstance.findCollectionByNameOrId('conversations')
      var conv = new Record(convCol)
      conv.set('customer_id', customer.id)
      conv.set('sender_type', 'ai')
      conv.set('sender_name', 'Bia')
      conv.set('content', cleaned)
      conv.set('channel', 'whatsapp')
      conv.set('status', 'sent')
      appInstance.save(conv)
    } catch (cErr) {
      console.warn('[BIA_PERSISTENCE] Erro ao salvar conversa: ' + cErr.message)
    }

    try {
      var metaSettings = null
      try {
        metaSettings = appInstance.findFirstRecordByFilter(
          'settings_meta',
          "provider = 'whatsapp' && is_active = true",
        )
      } catch (_) {}

      if (metaSettings) {
        var token = metaSettings.get('access_token') || $os.getenv('WHATSAPP_TOKEN')
        var phoneId = metaSettings.get('phone_number_id') || $os.getenv('WHATSAPP_PHONE_ID')
        var toPhone = customer.get('phone') || customer.get('whatsapp') || ''
        toPhone = toPhone.replace(/\D/g, '')

        if (token && phoneId && toPhone.length >= 10) {
          if (!toPhone.startsWith('55') && toPhone.length <= 11) {
            toPhone = '55' + toPhone
          }
          var url = 'https://graph.facebook.com/v21.0/' + phoneId + '/messages'
          $http.send({
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
            timeout: 15,
          })
        }
      }
    } catch (wErr) {
      console.warn('[BIA_PERSISTENCE] Envio Cloud API: ' + wErr.message)
    }

    return true
  }

  // 1. Janela comercial de Brasília
  if (!isBrasiliaBusinessHoursInline()) {
    return
  }

  var nowIso = new Date().toISOString()

  // 2. Processar follow_ups_scheduled (Promessas do Pilar B + Agendamentos)
  try {
    var pendingRecords = []
    try {
      pendingRecords = app.findRecordsByFilter(
        'follow_ups_scheduled',
        "status = 'pending' && scheduled_date <= '" + nowIso + "'",
        'created',
        20,
      )
    } catch (_) {}

    for (var i = 0; i < pendingRecords.length; i++) {
      var item = pendingRecords[i]
      var customerId = item.get('customer_id')
      if (!customerId) {
        item.set('status', 'skipped')
        item.set('last_error', 'Sem customer_id')
        app.save(item)
        continue
      }

      var customer = null
      try {
        customer = app.findRecordById('customers', customerId)
      } catch (_) {}

      if (!customer) {
        item.set('status', 'skipped')
        item.set('last_error', 'Cliente não encontrado')
        app.save(item)
        continue
      }

      // Trava ai_processing
      if (customer.get('ai_processing')) {
        continue
      }

      var msg = item.get('message_template') || ''
      if (!msg && item.get('type') === 'promised_followup') {
        var ctx = item.get('promise_context') || 'os detalhes que combinamos'
        msg =
          'Olá, ' +
          (customer.get('name') || '') +
          '! Conforme combinamos, estou passando para dar um retorno sobre ' +
          ctx +
          '. O Mauro e eu estamos à disposição para tirar qualquer dúvida!'
      }

      if (msg) {
        var sent = sendFollowUpWhatsAppInline(app, customer, msg)
        if (sent) {
          item.set('status', 'sent')
          item.set('sent_at', new Date().toISOString())
          app.save(item)
        }
      }
    }
  } catch (pErr) {
    console.warn('[BIA_PERSISTENCE] Erro no processamento de follow_ups_scheduled: ' + pErr.message)
  }

  // 3. Pilar A: Cadência Temporal D+1, D+3, D+7, D+14
  try {
    var nowMs = Date.now()
    var oneDayMs = 24 * 60 * 60 * 1000

    var activeCustomers = []
    try {
      activeCustomers = app.findRecordsByFilter(
        'customers',
        "status != 'lost' && status != 'won' && status != 'archived' && ai_processing != true",
        '-updated',
        30,
      )
    } catch (_) {}

    for (var j = 0; j < activeCustomers.length; j++) {
      var cust = activeCustomers[j]
      var custId = cust.id

      var lastMessages = []
      try {
        lastMessages = app.findRecordsByFilter(
          'conversations',
          "customer_id = '" + custId + "'",
          '-created',
          2,
        )
      } catch (_) {}

      if (lastMessages.length === 0) continue

      var lastMsg = lastMessages[0]
      var lastCreated = new Date(lastMsg.get('created')).getTime()
      var elapsed = nowMs - lastCreated

      if (elapsed < 20 * 60 * 60 * 1000) continue

      if (lastMsg.get('sender_type') === 'ai') {
        if (elapsed < 23 * 60 * 60 * 1000) {
          continue
        }
      }

      var step = ''
      var followUpText = ''
      var custName = (cust.get('name') || '').split(' ')[0] || 'Tudo bem'

      if (elapsed >= 13 * oneDayMs && elapsed < 16 * oneDayMs) {
        step = 'd14'
        followUpText =
          'Olá, ' +
          custName +
          '! Espero que esteja tudo ótimo por aí. Como não tivemos mais retorno, vou deixar você à vontade para focar nas suas prioridades agora. Se em algum momento fizer sentido retomar sobre o imóvel ou novas opções, estarei por aqui com o corretor Mauro. Um grande abraço!'
      } else if (elapsed >= 6 * oneDayMs && elapsed < 8 * oneDayMs) {
        step = 'd7'
        followUpText =
          'Oi, ' +
          custName +
          '! Passando para saber se o projeto do novo imóvel ainda está no seu radar para este mês. Temos outras alternativas com plantas e valores similares se preferir avaliar novas opções. Como estão os seus planos por aí?'
      } else if (elapsed >= 2.8 * oneDayMs && elapsed < 4 * oneDayMs) {
        step = 'd3'
        followUpText =
          'Olá, ' +
          custName +
          '! Separei mais alguns diferenciais práticos sobre a localização e as áreas de lazer do empreendimento que conversamos. Quer dar uma olhada rápida na planta ou nas condições de entrada?'
      } else if (elapsed >= 22 * 60 * 60 * 1000 && elapsed < 36 * 60 * 60 * 1000) {
        step = 'd1'
        followUpText =
          'Oi, ' +
          custName +
          '! Tudo bem? Passando para saber se você conseguiu analisar a opção que conversamos ontem ou se ficou alguma dúvida sobre as metragens e fluxo de pagamento.'
      }

      if (step && followUpText) {
        var alreadySent = false
        try {
          var existingF = app.findFirstRecordByFilter(
            'follow_ups_scheduled',
            "customer_id = '" + custId + "' && type = '" + step + "' && status = 'sent'",
          )
          if (existingF) alreadySent = true
        } catch (_) {}

        if (!alreadySent) {
          var success = sendFollowUpWhatsAppInline(app, cust, followUpText)
          if (success) {
            try {
              var fCol = app.findCollectionByNameOrId('follow_ups_scheduled')
              var fRec = new Record(fCol)
              fRec.set('customer_id', custId)
              fRec.set('type', step)
              fRec.set('scheduled_date', nowIso)
              fRec.set('status', 'sent')
              fRec.set('sent_at', nowIso)
              fRec.set('message_template', followUpText)
              app.save(fRec)
            } catch (_) {}
          }
        }
      }
    }
  } catch (cadErr) {
    console.warn('[BIA_PERSISTENCE] Erro na cadência D1-D14: ' + cadErr.message)
  }
})
