// Hook para POST /backend/v1/messenger/webhook e POST /backend/v1/messenger/webhook/{userId}
// Processa eventos de mensagens do Facebook Messenger (objeto Page da Meta, campo 'messages')
//
// Na Meta, o webhook de Page envia:
// { "object": "page", "entry": [{ "id": "<PAGE_ID>", "time": ..., "messaging": [...] }] }
// A Meta NUNCA envia user_id na query do webhook.
// O webhook resolve o usuário dono do CRM através de:
// 1. Path/Query userId se fornecido
// 2. Fallback por usuário com tokens da Meta cadastrados (meta_page_access_token, meta_whatsapp_verify_token, etc.)
// 3. Fallback pelo primeiro usuário do CRM (single-tenant)

function handleMessengerWebhookPost(e) {
  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var pathUserId = ''
  try {
    pathUserId = e.request.pathValue('userId') || ''
  } catch (_) {}

  var queryUserId = query['user_id'] || query['uid'] || ''
  var effectiveUserId = pathUserId || queryUserId || ''

  var entriesCount = (body && body.entry && body.entry.length) || 0
  var rawObject = body ? body.object : ''

  // Log de diagnóstico detalhado para detectar QUALQUER entrega da Meta
  $app
    .logger()
    .info(
      'Messenger Webhook POST recebido',
      'object',
      rawObject,
      'entries_count',
      entriesCount,
      'effective_user_id',
      effectiveUserId,
    )

  // Validação do objeto da Meta: Messenger envia object="page" (ou às vezes "messenger")
  if (!body || (body.object !== 'page' && body.object !== 'messenger')) {
    $app.logger().info('Messenger Webhook ignorando objeto não-page', 'object', rawObject)
    // Retorna 200 para eventos não monitorados para não invalidar o webhook na Meta
    return e.string(200, 'EVENT_RECEIVED')
  }

  // 1. Resolução do usuário do CRM
  var user = null
  if (effectiveUserId) {
    try {
      user = $app.findRecordById('users', effectiveUserId)
    } catch (_) {}
  }

  if (!user) {
    try {
      var usersWithMeta = $app.findRecordsByFilter(
        'users',
        "meta_page_access_token != '' || meta_whatsapp_verify_token != '' || meta_instagram_page_token != ''",
        'created',
        1,
        0,
      )
      if (usersWithMeta && usersWithMeta.length > 0) {
        user = usersWithMeta[0]
      }
    } catch (_) {}
  }

  if (!user) {
    try {
      var allUsers = $app.findRecordsByFilter('users', "email != ''", 'created', 1, 0)
      if (allUsers && allUsers.length > 0) {
        user = allUsers[0]
      }
    } catch (_) {}
  }

  var finalUserId = user ? user.id : ''

  try {
    var entries = body.entry || []
    for (var ei = 0; ei < entries.length; ei++) {
      var entry = entries[ei] || {}
      var pageId = entry.id ? String(entry.id) : ''
      var entryTime = entry.time || Date.now()
      var messagingList = entry.messaging || []

      // Se não tem messaging, pode ser alteração de campo (changes) como leadgen ou standby
      if ((!messagingList || messagingList.length === 0) && entry.changes) {
        $app
          .logger()
          .info(
            'Messenger Webhook entry com changes recebida',
            'page_id',
            pageId,
            'changes_len',
            entry.changes.length,
          )
      }

      for (var mi = 0; mi < messagingList.length; mi++) {
        var messaging = messagingList[mi] || {}

        // Desconsidera echos da própria página
        if (messaging.message && messaging.message.is_echo) {
          $app
            .logger()
            .info('Messenger Webhook ignorando echo da própria página', 'page_id', pageId)
          continue
        }
        if (messaging.delivery || messaging.read) {
          continue
        }

        var senderId =
          messaging.sender && messaging.sender.id ? String(messaging.sender.id).trim() : ''
        var recipientId =
          messaging.recipient && messaging.recipient.id
            ? String(messaging.recipient.id).trim()
            : pageId

        if (!senderId) continue

        var text = ''
        var hasAttachment = false
        var attachmentType = ''

        if (messaging.message) {
          if (messaging.message.text) {
            text = messaging.message.text
          } else if (messaging.message.attachments && messaging.message.attachments.length > 0) {
            hasAttachment = true
            attachmentType = messaging.message.attachments[0].type || 'mídia'
            text = '[' + attachmentType + ' recebido no Messenger]'
          } else if (messaging.message.quick_reply && messaging.message.quick_reply.payload) {
            text = messaging.message.quick_reply.payload
          }
        } else if (messaging.postback && messaging.postback.title) {
          text = messaging.postback.title
        }

        if (!text) {
          text = '[Mensagem recebida no Messenger]'
        }

        // LOG DETALHADO DO PAYLOAD BRUTO RECEBIDO NO POST DO MESSENGER
        var previewText = text.length > 100 ? text.substring(0, 100) + '...' : text
        $app
          .logger()
          .info(
            'MESSENGER_EVENT_RECEIVED',
            'page_id',
            pageId,
            'recipient_id',
            recipientId,
            'sender_id',
            senderId,
            'timestamp',
            entryTime,
            'text',
            previewText,
          )

        // Registrar também em system_logs para visibilidade total no CRM e fácil consulta
        try {
          var sysLogsCol = $app.findCollectionByNameOrId('system_logs')
          var auditLog = new Record(sysLogsCol, {
            user_id: finalUserId,
            type: 'messenger_webhook_received',
            message: 'Mensagem recebida no Messenger de ' + senderId + ': ' + previewText,
            details:
              'Page ID: ' +
              pageId +
              ' | Sender PSID: ' +
              senderId +
              ' | Time: ' +
              new Date(entryTime).toISOString(),
            payload: {
              page_id: pageId,
              sender_id: senderId,
              recipient_id: recipientId,
              text: text,
              time: entryTime,
              has_attachment: hasAttachment,
              attachment_type: attachmentType,
            },
          })
          $app.save(auditLog)
        } catch (_) {}

        // Tenta obter o nome do remetente via Graph API se houver token de página
        var pageToken = user
          ? user.getString('meta_page_access_token') ||
            user.getString('meta_instagram_page_token') ||
            user.getString('meta_capi_token') ||
            ''
          : ''

        var senderProfileName = ''
        if (pageToken && senderId && !senderId.startsWith('test_')) {
          try {
            var profileRes = $http.send({
              url:
                'https://graph.facebook.com/v22.0/' +
                senderId +
                '?fields=first_name,last_name,name,profile_pic',
              method: 'GET',
              headers: { Authorization: 'Bearer ' + pageToken },
              timeout: 10,
            })
            if (profileRes && profileRes.statusCode === 200 && profileRes.json) {
              senderProfileName =
                profileRes.json.name ||
                (profileRes.json.first_name
                  ? profileRes.json.first_name +
                    (profileRes.json.last_name ? ' ' + profileRes.json.last_name : '')
                  : '')
            }
          } catch (_) {}
        }

        var contactName =
          senderProfileName ||
          'Lead Messenger (' + senderId.substring(0, Math.min(8, senderId.length)) + ')'

        var nowIso = new Date().toISOString()
        var nowBrStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

        // 2. Busca ou cria cliente no CRM
        var customer = null
        try {
          var matchedCusts = $app.findRecordsByFilter(
            'customers',
            'notes ~ {:sid} || last_origin ~ {:sid}',
            'created',
            1,
            0,
            { sid: senderId },
          )
          if (matchedCusts && matchedCusts.length > 0) {
            customer = matchedCusts[0]
          }
        } catch (_) {}

        var originLabel = 'Facebook Messenger'

        if (!customer) {
          try {
            var customersCol = $app.findCollectionByNameOrId('customers')
            customer = new Record(customersCol)
            if (finalUserId) customer.set('user_id', finalUserId)
            customer.set('name', contactName)
            if (senderProfileName) {
              customer.set('first_name', senderProfileName.split(' ')[0])
            }
            customer.set('status', '1. Acolhimento')
            customer.set('source', 'Facebook Messenger')
            customer.set('last_origin', originLabel)
            customer.set('last_origin_at', nowIso)

            var initialNotes =
              '[Origem: ' +
              originLabel +
              ', ' +
              nowBrStr +
              ']\n' +
              'Messenger PSID: ' +
              senderId +
              '\nPage ID: ' +
              pageId +
              '\nOrigin: Meta Messenger'

            customer.set('notes', initialNotes)
            customer.set('origin_history', [
              {
                source: originLabel,
                type: 'messenger',
                date: nowIso,
                sender_id: senderId,
                page_id: pageId,
              },
            ])
            $app.save(customer)
          } catch (cErr) {
            $app
              .logger()
              .error('Failed to create customer from Messenger webhook', 'error', String(cErr))
            continue
          }
        } else {
          // Atualiza dados do cliente existente
          try {
            var custUp = $app.findRecordById('customers', customer.id)
            if (!custUp.getString('user_id') && finalUserId) {
              custUp.set('user_id', finalUserId)
            }
            if (
              (custUp.getString('name') || '').startsWith('Lead Messenger') &&
              senderProfileName
            ) {
              custUp.set('name', senderProfileName)
              custUp.set('first_name', senderProfileName.split(' ')[0])
            }
            custUp.set('last_origin', originLabel)
            custUp.set('last_origin_at', nowIso)
            $app.save(custUp)
            customer = custUp
          } catch (_) {}
        }

        // 3. Busca ou cria lead no CRM para visibilidade no pipeline
        try {
          var leadsCol = $app.findCollectionByNameOrId('leads')
          var existingLeads = $app.findRecordsByFilter(
            'leads',
            "source = 'Facebook Messenger' && notes ~ {:sid}",
            'created',
            1,
            0,
            { sid: senderId },
          )

          if (existingLeads && existingLeads.length > 0) {
            var exLead = existingLeads[0]
            var leadUpdated = false
            if (
              (exLead.getString('name') || '').startsWith('Lead Messenger') &&
              senderProfileName
            ) {
              exLead.set('name', senderProfileName)
              leadUpdated = true
            }
            var msgNote = '\n[' + nowBrStr + '] Nova mensagem Messenger: ' + text
            exLead.set('notes', (exLead.getString('notes') || '') + msgNote)
            leadUpdated = true
            if (!exLead.getString('assigned_to') && finalUserId) {
              exLead.set('assigned_to', finalUserId)
              leadUpdated = true
            }
            if (leadUpdated) {
              $app.save(exLead)
            }
          } else {
            var newLead = new Record(leadsCol)
            if (finalUserId) newLead.set('assigned_to', finalUserId)
            newLead.set('name', contactName)
            newLead.set('source', 'Facebook Messenger')
            newLead.set('status', 'Novo')
            newLead.set(
              'notes',
              'Capturado via Meta Messenger API\n' +
                'Messenger PSID: ' +
                senderId +
                '\nPage ID: ' +
                pageId +
                '\nMensagem: ' +
                text,
            )
            $app.save(newLead)
          }
        } catch (_) {}

        // 4. Salva a conversa
        var isDuplicate = false
        try {
          var recentMsgs = $app.findRecordsByFilter(
            'conversations',
            "customer_id = {:cid} && sender = 'customer' && content = {:text}",
            '-created',
            1,
            0,
            { cid: customer.id, text: text },
          )
          if (recentMsgs && recentMsgs.length > 0) {
            var diffMins =
              (new Date().getTime() - new Date(recentMsgs[0].getString('created')).getTime()) /
              60000
            if (diffMins < 2) isDuplicate = true
          }
        } catch (_) {}

        if (!isDuplicate) {
          try {
            var convCol = $app.findCollectionByNameOrId('conversations')
            var newMsg = new Record(convCol)
            newMsg.set('customer_id', customer.id)
            if (finalUserId) newMsg.set('user_id', finalUserId)
            newMsg.set('sender', 'customer')
            newMsg.set('content', text)
            newMsg.set('channel', 'messenger')
            $app.save(newMsg)
          } catch (saveErr) {
            $app
              .logger()
              .error('Failed to save conversation from Messenger webhook', 'error', String(saveErr))
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Error processing Messenger Webhook', 'error', String(err))
  }

  return e.string(200, 'EVENT_RECEIVED')
}

// Rotas registradas sob /backend/v1/
routerAdd('POST', '/backend/v1/messenger/webhook', handleMessengerWebhookPost)
routerAdd('POST', '/backend/v1/messenger/webhook/{userId}', handleMessengerWebhookPost)
