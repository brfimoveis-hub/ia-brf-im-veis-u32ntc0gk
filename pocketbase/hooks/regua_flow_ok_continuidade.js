// pocketbase/hooks/regua_flow_ok_continuidade.js
// Orquestrador do fluxo pós-resposta: "OK -> Ebook -> Continuidade" (Mauro)
// 1. Envio imediato da frase humana curta de confirmação + PDF do Vistage.
// 2. Se falhar na Meta (sem wamid confirmado ou status >= 400), retenta após ~2 minutos.
//    Se falhar de novo, marca falha visível na Estatística mas assegura envio de link no texto.
// 3. CONTINUIDADE: se o envio do ebook for CONFIRMADO, agenda para ~10 minutos depois
//    a mensagem consultiva da Bia ("Me diz: você procura mais para investir ou para morar?").
// 4. CANCELAMENTO: se o cliente responder QUALQUER mensagem antes dos 10 minutos, a
//    continuidade agendada é cancelada para não duplicar.
// 5. REGRA 8h-18h (Mauro 23/10): envio apenas na janela comercial de Brasília; fora da
//    janela, agenda para as 08h do próximo dia útil.
// 6. Integração com estatísticas: logs tipo 'whatsapp_ai_send' para aparecer em /atendimentos.
// NOTA DE ESCOPO: Todas as funções auxiliares são declaradas internamente em cada callback
// para respeitar o isolamento da JSVM do PocketBase.

// ============================================================================
// CRON WORKER DA FILA REGUA_OK_TASKS (Executa a cada 1 minuto)
// Processa:
// 1. Retry do ebook após 2 min (se a 1ª tentativa falhou).
// 2. Continuidade após 10 min (se o cliente não tiver respondido).
// ============================================================================
cronAdd('regua_ok_tasks_worker', '* * * * *', function () {
  function isWithinBusinessHoursBrasilia() {
    var now = new Date()
    var brDate = new Date(now.getTime() - 3 * 3600 * 1000)
    var hour = brDate.getUTCHours()
    return hour >= 8 && hour < 18
  }

  function getNextBusinessWindowDateIso(minutesOffset) {
    var offsetMs = (minutesOffset || 0) * 60 * 1000
    var target = new Date(Date.now() + offsetMs)
    var brTarget = new Date(target.getTime() - 3 * 3600 * 1000)
    var brHour = brTarget.getUTCHours()

    if (brHour < 8) {
      target.setUTCHours(11, 0, 0, 0)
    } else if (brHour >= 18) {
      target = new Date(target.getTime() + 24 * 3600 * 1000)
      target.setUTCHours(11, 0, 0, 0)
    }
    return target.toISOString().replace('T', ' ').substring(0, 19)
  }

  function getMetaWhatsAppCredentials(userId) {
    var token = $os.getenv('META_WHATSAPP_TOKEN') || ''
    var phoneId = $os.getenv('META_PHONE_NUMBER_ID') || ''

    if (!token || !phoneId) {
      try {
        var user = null
        if (userId) {
          try {
            user = $app.findRecordById('users', userId)
          } catch (_) {}
        }
        if (!user) {
          var users = $app.findRecordsByFilter(
            'users',
            "meta_whatsapp_token != '' && meta_phone_number_id != ''",
            '-updated',
            1,
            0,
          )
          if (users && users.length > 0) user = users[0]
        }
        if (user) {
          token = token || user.getString('meta_whatsapp_token') || ''
          phoneId = phoneId || user.getString('meta_phone_number_id') || ''
        }
      } catch (_) {}
    }

    return { token: token, phoneId: phoneId }
  }

  function getVistageEbookInfo() {
    var pbPublicBase =
      $os.getenv('PUBLIC_URL') ||
      $os.getenv('PB_PUBLIC_URL') ||
      $os.getenv('POCKETBASE_URL') ||
      $os.getenv('VITE_POCKETBASE_URL') ||
      $os.getenv('PB_INSTANCE_URL') ||
      'https://crm.brfimoveis.com.br'

    var ebookKnowledgeRec = null
    try {
      ebookKnowledgeRec = $app.findRecordById('ai_knowledge_files', 'fcvyoatlxt56do2')
    } catch (_) {
      try {
        var matchedFiles = $app.findRecordsByFilter(
          'ai_knowledge_files',
          "is_active = true && (name ~ 'BOOK VISTAGE' || name ~ 'VISTAGE RESIDENCE') && file ~ '.pdf'",
          '-created',
          1,
          0,
        )
        if (matchedFiles && matchedFiles.length > 0) {
          ebookKnowledgeRec = matchedFiles[0]
        }
      } catch (_) {}
    }

    var fileUrl = ''
    var fileName = 'BOOK VISTAGE RESIDENCE.pdf'
    if (ebookKnowledgeRec) {
      var rawFileName =
        ebookKnowledgeRec.getString('file') || 'book_vistage_residence_alxnfnhjlr.pdf'
      var colIdentifier =
        ebookKnowledgeRec.collectionId ||
        (typeof ebookKnowledgeRec.collectionName === 'function'
          ? ebookKnowledgeRec.collectionName()
          : ebookKnowledgeRec.collectionName) ||
        'ai_knowledge_files'
      fileUrl =
        pbPublicBase.replace(/\/$/, '') +
        '/api/files/' +
        colIdentifier +
        '/' +
        ebookKnowledgeRec.id +
        '/' +
        rawFileName
      fileName = ebookKnowledgeRec.getString('name') || 'BOOK VISTAGE RESIDENCE.pdf'
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf'
      }
    } else {
      fileUrl =
        pbPublicBase.replace(/\/$/, '') +
        '/api/files/ai_knowledge_files/fcvyoatlxt56do2/book_vistage_residence_alxnfnhjlr.pdf'
    }

    return { url: fileUrl, name: fileName }
  }

  function logWhatsAppSendStats(data) {
    try {
      var logsCol = $app.findCollectionByNameOrId('system_logs')
      var log = new Record(logsCol)
      log.set('user_id', data.userId || '')
      log.set('type', 'whatsapp_ai_send')
      log.set('message', data.message || 'Envio WhatsApp fluxo régua')
      log.set(
        'details',
        JSON.stringify({
          customer_id: data.customerId || '',
          customer_name: data.customerName || '',
          phone: data.phone || '',
          wamid: data.wamid || '',
          status: data.status || 'sent',
          flow_type: data.flowType || 'ok_ebook_continuidade',
          task_type: data.taskType || '',
          error: data.error || null,
          timestamp: new Date().toISOString(),
        }),
      )
      $app.saveNoValidate(log)
    } catch (err) {
      console.warn('[REGUA_OK_FLOW] Erro ao registrar whatsapp_ai_send: ' + String(err))
    }
  }

  function sendWhatsAppText(creds, phoneClean, text) {
    if (!creds.token || !creds.phoneId || !phoneClean || !text) {
      return { ok: false, error: 'Credenciais ou parâmetros ausentes' }
    }
    try {
      var res = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + creds.phoneId + '/messages',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + creds.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneClean,
          type: 'text',
          text: { body: text },
        }),
        timeout: 25,
      })

      if (res && res.statusCode >= 200 && res.statusCode < 300) {
        var body = {}
        try {
          body = JSON.parse(res.raw || '{}')
        } catch (_) {}
        var wamid =
          body.messages && body.messages[0] && body.messages[0].id ? body.messages[0].id : ''
        return { ok: true, wamid: wamid }
      } else {
        var errDetail = res ? res.raw || String(res.statusCode) : 'Sem resposta'
        return { ok: false, error: 'Status ' + (res ? res.statusCode : 'nulo') + ': ' + errDetail }
      }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }

  function sendWhatsAppDocument(creds, phoneClean, docUrl, docFileName, caption) {
    if (!creds.token || !creds.phoneId || !phoneClean || !docUrl) {
      return { ok: false, error: 'Credenciais ou parâmetros ausentes' }
    }
    try {
      var res = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + creds.phoneId + '/messages',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + creds.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneClean,
          type: 'document',
          document: {
            link: docUrl,
            filename: docFileName,
            caption: caption || 'BOOK VISTAGE RESIDENCE — BRF Imóveis',
          },
        }),
        timeout: 35,
      })

      if (res && res.statusCode >= 200 && res.statusCode < 300) {
        var body = {}
        try {
          body = JSON.parse(res.raw || '{}')
        } catch (_) {}
        var wamid =
          body.messages && body.messages[0] && body.messages[0].id ? body.messages[0].id : ''
        return { ok: true, wamid: wamid }
      } else {
        var errDetail = res ? res.raw || String(res.statusCode) : 'Sem resposta'
        return { ok: false, error: 'Status ' + (res ? res.statusCode : 'nulo') + ': ' + errDetail }
      }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }

  var nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19)

  try {
    var pendingTasks = $app.findRecordsByFilter(
      'regua_ok_tasks',
      "status = 'pending' && scheduled_at <= '" + nowIso + "'",
      'scheduled_at',
      20,
      0,
    )

    if (!pendingTasks || pendingTasks.length === 0) return

    for (var i = 0; i < pendingTasks.length; i++) {
      var task = pendingTasks[i]
      var customerId = task.getString('customer_id')
      var taskType = task.getString('task_type')
      var userId = task.getString('user_id')

      var customer = null
      try {
        customer = $app.findRecordById('customers', customerId)
      } catch (_) {}
      if (!customer) {
        task.set('status', 'failed')
        task.set('last_error', 'Cliente não encontrado')
        $app.saveNoValidate(task)
        continue
      }

      var phoneClean = (customer.getString('phone') || '').replace(/\D/g, '')
      var creds = getMetaWhatsAppCredentials(userId)
      var ebookInfo = getVistageEbookInfo()

      // TAREFA 1: EBOOK RETRY (2 minutos após falha inicial)
      if (taskType === 'ebook_retry') {
        var retryRes = sendWhatsAppDocument(
          creds,
          phoneClean,
          ebookInfo.url,
          ebookInfo.name,
          'BOOK VISTAGE RESIDENCE — BRF Imóveis',
        )

        if (retryRes.ok) {
          task.set('status', 'sent')
          task.set('wamid', retryRes.wamid)
          task.set('sent_at', nowIso)
          $app.saveNoValidate(task)

          logWhatsAppSendStats({
            userId: userId,
            customerId: customerId,
            customerName: customer.getString('name') || '',
            phone: phoneClean,
            wamid: retryRes.wamid,
            status: 'sent',
            taskType: 'ebook_retry',
            message: 'Ebook Vistage entregue com sucesso no retry (2min)',
          })

          // Agenda a continuidade após 10 minutos da confirmação do retry
          try {
            var tasksCol = $app.findCollectionByNameOrId('regua_ok_tasks')
            var contTask = new Record(tasksCol)
            contTask.set('customer_id', customerId)
            contTask.set('user_id', userId)
            contTask.set('task_type', 'continuidade')
            contTask.set('status', 'pending')
            var schedTime = isWithinBusinessHoursBrasilia()
              ? new Date(Date.now() + 10 * 60 * 1000)
                  .toISOString()
                  .replace('T', ' ')
                  .substring(0, 19)
              : getNextBusinessWindowDateIso(10)
            contTask.set('scheduled_at', schedTime)
            contTask.set('attempts', 0)
            $app.saveNoValidate(contTask)
          } catch (_) {}
        } else {
          // Se falhar de novo na segunda tentativa: marca failed mas envia link no texto
          task.set('status', 'failed')
          task.set('last_error', retryRes.error)
          task.set('sent_at', nowIso)
          $app.saveNoValidate(task)

          logWhatsAppSendStats({
            userId: userId,
            customerId: customerId,
            customerName: customer.getString('name') || '',
            phone: phoneClean,
            wamid: '',
            status: 'failed',
            taskType: 'ebook_retry',
            error: retryRes.error,
            message: 'Falha no 2º envio do anexo do ebook; acionado texto alternativo com link',
          })

          var fallbackText =
            'Aqui está o link do seu ebook do Vistage Residence para visualização imediata: ' +
            ebookInfo.url +
            '\n\nEm minutos te faço uma pergunta rápida para eu te indicar a melhor planta 😉'
          sendWhatsAppText(creds, phoneClean, fallbackText)
        }
      }

      // TAREFA 2: CONTINUIDADE (10 minutos após o ebook)
      if (taskType === 'continuidade') {
        if (!isWithinBusinessHoursBrasilia()) {
          var rescheduledAt = getNextBusinessWindowDateIso(0)
          task.set('scheduled_at', rescheduledAt)
          $app.saveNoValidate(task)
          console.log('[REGUA_OK_FLOW] Continuidade adiada para janela comercial: ' + rescheduledAt)
          continue
        }

        // Checar se o cliente respondeu no intervalo
        var recentCustMsgs = []
        try {
          recentCustMsgs = $app.findRecordsByFilter(
            'conversations',
            "customer_id = '" +
              customerId +
              "' && sender = 'customer' && created >= '" +
              task.getString('created') +
              "'",
            '-created',
            1,
            0,
          )
        } catch (_) {}

        if (recentCustMsgs && recentCustMsgs.length > 0) {
          task.set('status', 'canceled')
          task.set(
            'last_error',
            'Cancelado: cliente respondeu antes dos 10 minutos ("' +
              recentCustMsgs[0].getString('content').substring(0, 50) +
              '...")',
          )
          task.set('sent_at', nowIso)
          $app.saveNoValidate(task)
          console.log(
            '[REGUA_OK_FLOW] Continuidade cancelada para customer=' +
              customerId +
              ' pois o cliente já interagiu.',
          )
          continue
        }

        var custNameRaw = (customer.getString('name') || '').trim()
        var cFirstName = ''
        if (
          custNameRaw &&
          !custNameRaw.toLowerCase().startsWith('contato') &&
          !/^\+?\d+$/.test(custNameRaw)
        ) {
          cFirstName = custNameRaw.split(' ')[0]
        }

        var contMessage = cFirstName
          ? cFirstName +
            ', o ebook já está com você! Me diz: você procura mais para investir ou para morar? Assim eu te aponto as plantas que mais combinam.'
          : 'O ebook já está com você! Me diz: você procura mais para investir ou para morar? Assim eu te aponto as plantas que mais combinam.'

        var contSendRes = sendWhatsAppText(creds, phoneClean, contMessage)
        if (contSendRes.ok) {
          task.set('status', 'sent')
          task.set('wamid', contSendRes.wamid)
          task.set('sent_at', nowIso)
          $app.saveNoValidate(task)

          try {
            var convCol2 = $app.findCollectionByNameOrId('conversations')
            var convRec2 = new Record(convCol2)
            convRec2.set('customer_id', customerId)
            convRec2.set('user_id', userId)
            convRec2.set('channel', 'whatsapp')
            convRec2.set('sender', 'ai')
            convRec2.set('content', contMessage)
            $app.saveNoValidate(convRec2)
          } catch (_) {}

          logWhatsAppSendStats({
            userId: userId,
            customerId: customerId,
            customerName: customer.getString('name') || '',
            phone: phoneClean,
            wamid: contSendRes.wamid,
            status: 'sent',
            taskType: 'continuidade',
            message: 'Mensagem de continuidade dos 10min enviada com sucesso',
          })
          console.log(
            '[REGUA_OK_FLOW] Continuidade dos 10min enviada com sucesso para customer=' +
              customerId,
          )
        } else {
          task.set('status', 'failed')
          task.set('last_error', contSendRes.error)
          $app.saveNoValidate(task)

          logWhatsAppSendStats({
            userId: userId,
            customerId: customerId,
            customerName: customer.getString('name') || '',
            phone: phoneClean,
            wamid: '',
            status: 'failed',
            taskType: 'continuidade',
            error: contSendRes.error,
            message: 'Falha ao enviar mensagem de continuidade dos 10min',
          })
        }
      }
    }
  } catch (cronErr) {
    console.warn('[REGUA_OK_FLOW] Exceção no worker regua_ok_tasks: ' + String(cronErr))
  }
})
