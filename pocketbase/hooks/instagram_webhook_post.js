// Hook para POST /backend/v1/instagram/webhook e POST /backend/v1/instagram/webhook/{userId}
// Trata mensagens recebidas pelo Instagram Direct via Webhooks da Meta
// Normaliza para o mesmo formato interno (customers, leads, conversations channel='instagram')
// Dispara o motor da Bia (via trigger em conversations) e permite resposta automática
//
// REGRA CRÍTICA DE ESCOPO NO GOJA (PocketBase):
// Toda lógica de processamento e TODAS as funções auxiliares são declaradas DENTRO
// do próprio corpo de cada callback de rota para ser 100% autossuficiente e imune
// a ReferenceError de funções top-level ou perdas de escopo de módulo no Goja.

// Endpoint padrão: POST /backend/v1/instagram/webhook
function handleInstagramWebhookPost(e) {
  // Função de processamento 100% autossuficiente declarada no escopo interno do callback
  const processPayload = function (body, queryUserId, pathUserId) {
    var userId = pathUserId || queryUserId || ''

    // 1. Resolução dinâmica de usuário e IG Account IDs vinculados
    var user = null
    if (userId) {
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {}
    }

    // Coleta todos os IDs de conta do evento Meta (entry.id, entry.messaging.recipient.id, etc.)
    var entries = (body && body.entry) || []
    var eventEntryIds = []
    for (var ei = 0; ei < entries.length; ei++) {
      var eItem = entries[ei] || {}
      if (eItem.id) eventEntryIds.push(String(eItem.id).trim())
      var mList = eItem.messaging || []
      for (var mi = 0; mi < mList.length; mi++) {
        var rObj = mList[mi] && mList[mi].recipient
        if (rObj && rObj.id) eventEntryIds.push(String(rObj.id).trim())
      }
    }

    // Tenta encontrar usuário por meta_instagram_business_id casando com qualquer ID do evento
    if (!user && eventEntryIds.length > 0) {
      for (var eidIdx = 0; eidIdx < eventEntryIds.length; eidIdx++) {
        var candidateEid = eventEntryIds[eidIdx]
        if (!candidateEid) continue
        try {
          var usersByIg = $app.findRecordsByFilter(
            'users',
            'meta_instagram_business_id = {:bid}',
            'created',
            1,
            0,
            { bid: candidateEid },
          )
          if (usersByIg && usersByIg.length > 0) {
            user = usersByIg[0]
            userId = user.id
            $app
              .logger()
              .info(
                '[IG_POST_MATCH] Usuário encontrado por meta_instagram_business_id',
                'entry_id',
                candidateEid,
                'user_id',
                userId,
              )
            break
          }
        } catch (_) {}
      }
    }

    // Fallback: se há usuários com Instagram configurado (meta_instagram_business_id ou token ou username)
    if (!user) {
      try {
        var igUsers = $app.findRecordsByFilter(
          'users',
          "meta_instagram_business_id != '' || instagram_username != '' || meta_instagram_page_token != '' || meta_page_access_token != ''",
          'created',
          1,
          0,
        )
        if (igUsers && igUsers.length > 0) {
          user = igUsers[0]
          userId = user.id
          $app
            .logger()
            .info(
              '[IG_POST_MATCH] Usuário com Instagram ativo resolvido por fallback dinâmico',
              'user_id',
              userId,
            )
        }
      } catch (_) {}
    }

    // Fallback final: se há apenas 1 usuário no sistema, assume ele
    if (!user) {
      try {
        var allUsers = $app.findRecordsByFilter('users', "email != ''", 'created', 1, 0)
        if (allUsers && allUsers.length > 0) {
          user = allUsers[0]
          userId = user.id
          $app
            .logger()
            .info(
              '[IG_POST_MATCH] Usuário único do CRM resolvido por fallback geral',
              'user_id',
              userId,
            )
        }
      } catch (_) {}
    }

    if (!user) {
      var noUserErr =
        '[IG_POST_NO_USER] Nenhum usuário encontrado para associar o evento de Instagram'
      $app.logger().error(noUserErr)
      console.error(noUserErr)
      return
    }

    // Resolução de IDs de Instagram conhecidos para matching de destinatário dinâmico
    var savedIgBizId = (user.getString('meta_instagram_business_id') || '').trim()
    var officialIgId = '17841418593400936' // Conta oficial @brf_imoveis_
    var knownBusinessIds = {}
    if (savedIgBizId) knownBusinessIds[savedIgBizId] = 'user.meta_instagram_business_id'
    knownBusinessIds[officialIgId] = 'brf_imoveis_official_ig_id'
    knownBusinessIds['1343797128806374'] = 'brf_imoveis_page_id'
    knownBusinessIds['1219427617930954'] = 'brf_imoveis_classic_page_id'
    knownBusinessIds['17841414618266409'] = 'bernadete_ig_alias'
    knownBusinessIds['17841418953400936'] = 'legacy_ig_alias'

    var nowIso = new Date().toISOString()
    var nowBrStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    // Obter token do Instagram / Facebook Page para buscar perfil do remetente na Graph API
    var pageToken =
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      user.getString('meta_capi_token') ||
      ''

    for (var eIndex = 0; eIndex < entries.length; eIndex++) {
      var entry = entries[eIndex] || {}
      var entryId = entry.id ? String(entry.id).trim() : ''

      // Se o evento trouxe entry.changes (comentários, menções, leadgen, feed changes)
      var changesList = entry.changes || []
      if (changesList.length > 0) {
        for (var ci = 0; ci < changesList.length; ci++) {
          var ch = changesList[ci] || {}
          var chField = ch.field || 'unknown'
          var chLog =
            '[IG_POST_CHANGE] entry_id=' +
            entryId +
            ' field=' +
            chField +
            ' val_keys=' +
            (ch.value ? Object.keys(ch.value).join(',') : 'none')
          $app.logger().info(chLog)
          console.log(chLog)
        }
      }

      // Eventos do tipo messaging (DMs do Instagram)
      var messagingList = entry.messaging || []
      if (messagingList.length === 0 && changesList.length === 0) {
        $app
          .logger()
          .info('[IG_POST_ENTRY_EMPTY] Entry sem messaging nem changes', 'entry_id', entryId)
        continue
      }

      for (var mIndex = 0; mIndex < messagingList.length; mIndex++) {
        var messaging = messagingList[mIndex] || {}

        // Ignora echo da própria página/Bia ou entregas de mensagens (delivery / read)
        if (messaging.message && messaging.message.is_echo) {
          $app
            .logger()
            .info(
              '[IG_POST_SKIP_ECHO] Desconsiderando echo da própria conta',
              'mid',
              messaging.message.mid || '',
            )
          continue
        }
        if (messaging.delivery || messaging.read) {
          // Notificação de entrega/leitura silenciosa
          continue
        }

        var senderId =
          messaging.sender && messaging.sender.id ? String(messaging.sender.id).trim() : ''
        var recipientId =
          messaging.recipient && messaging.recipient.id
            ? String(messaging.recipient.id).trim()
            : entryId

        if (!senderId) {
          $app.logger().warn('[IG_POST_NO_SENDER] Messaging sem sender.id descartado')
          continue
        }

        // Verificação de matching do destinatário
        var matchedPath = ''
        if (recipientId && knownBusinessIds[recipientId]) {
          matchedPath = 'recipient_id:' + recipientId + ' via ' + knownBusinessIds[recipientId]
        } else if (entryId && knownBusinessIds[entryId]) {
          matchedPath = 'entry_id:' + entryId + ' via ' + knownBusinessIds[entryId]
        } else if (senderId && knownBusinessIds[senderId]) {
          // Mensagem enviada pela própria conta comercial (echo que não veio com is_echo)
          $app
            .logger()
            .info(
              '[IG_POST_SKIP_SELF] Mensagem tem sender igual a conta comercial conhecida',
              'sender_id',
              senderId,
            )
          continue
        } else {
          // Destinatário não conhecido explicitamente mas só temos esta conta comercial no CRM
          matchedPath = 'fallback_single_tenant: recipient=' + recipientId + ' entry=' + entryId
        }

        $app
          .logger()
          .info(
            '[IG_POST_MATCH_PATH] Casamento de conta do Instagram aprovado: ' + matchedPath,
            'sender_id',
            senderId,
            'recipient_id',
            recipientId,
          )
        console.log(
          '[IG_POST_MATCH_PATH] ' +
            matchedPath +
            ' sender=' +
            senderId +
            ' recipient=' +
            recipientId,
        )

        // DEDUPLICAÇÃO POR ID DE MENSAGEM (MID)
        var messageMid = (messaging.message && messaging.message.mid) || messaging.mid || ''
        if (messageMid) {
          // 1. In-memory dedup
          if (typeof globalThis !== 'undefined') {
            if (!globalThis.__processedIgMids) globalThis.__processedIgMids = {}
            if (globalThis.__processedIgMids[messageMid]) {
              $app
                .logger()
                .info('[IG_POST_DEDUP] Mensagem MID já processada em cache: ' + messageMid)
              console.log('[IG_POST_DEDUP] Ignorando repetido (cache): ' + messageMid)
              continue
            }
            globalThis.__processedIgMids[messageMid] = Date.now()
          }

          // 2. Persistent DB dedup
          var isMidDup = false
          try {
            var existingMidLogs = $app.findRecordsByFilter(
              'system_logs',
              "type = 'instagram_processed_mid' && message = {:mid}",
              '',
              1,
              0,
              { mid: messageMid },
            )
            if (existingMidLogs && existingMidLogs.length > 0) {
              isMidDup = true
            }
          } catch (_) {}

          if (isMidDup) {
            $app.logger().info('[IG_POST_DEDUP] Mensagem MID já persistida no banco: ' + messageMid)
            console.log('[IG_POST_DEDUP] Ignorando repetido (banco): ' + messageMid)
            continue
          }
        }

        // Extrai texto da mensagem
        var text = ''
        var isAudio = false
        var mediaUrl = ''

        if (messaging.message) {
          if (messaging.message.text) {
            text = messaging.message.text
          } else if (messaging.message.attachments && messaging.message.attachments.length > 0) {
            var att = messaging.message.attachments[0] || {}
            var aType = att.type || 'mídia'
            if (aType === 'audio' || aType === 'voice') {
              text = '[Áudio Recebido do Instagram]'
              isAudio = true
              mediaUrl = (att.payload && att.payload.url) || ''
            } else if (aType === 'image') {
              text = '[Imagem Recebida do Instagram]'
            } else if (aType === 'video') {
              text = '[Vídeo Recebido do Instagram]'
            } else if (aType === 'story_mention') {
              text = '[Menção nos Stories do Instagram]'
            } else if (aType === 'share') {
              text = '[Compartilhamento do Instagram]'
            } else {
              text = '[' + aType + ' Recebido]'
            }
          } else if (messaging.message.quick_reply && messaging.message.quick_reply.payload) {
            text = messaging.message.quick_reply.payload
          }
        } else if (messaging.postback && messaging.postback.title) {
          text = messaging.postback.title
        }

        if (!text) {
          text = '[Mensagem Recebida do Instagram]'
        }

        // Tenta obter nome e username do usuário do Instagram via Graph API v22.0
        var igProfileName = ''
        var igUsername = ''
        if (pageToken && senderId && !senderId.startsWith('test_')) {
          try {
            var profileRes = $http.send({
              url:
                'https://graph.facebook.com/v22.0/' +
                senderId +
                '?fields=name,username,profile_pic',
              method: 'GET',
              headers: { Authorization: 'Bearer ' + pageToken },
              timeout: 10,
            })
            if (profileRes && profileRes.statusCode === 200 && profileRes.json) {
              igProfileName = profileRes.json.name || ''
              igUsername = profileRes.json.username || ''
            }
          } catch (_) {}
        }

        var contactName =
          igProfileName ||
          (igUsername ? '@' + igUsername : '') ||
          'Lead Instagram (' + senderId.substring(0, Math.min(8, senderId.length)) + ')'

        // Transcrição de áudio via Whisper se houver mediaUrl e OpenAI key
        if (isAudio && mediaUrl) {
          var openAiKey = $os.getenv('OPENAI_API_KEY') || ''
          if (
            !openAiKey &&
            typeof $secrets !== 'undefined' &&
            $secrets.has &&
            $secrets.has('OPENAI_API_KEY')
          ) {
            openAiKey = $secrets.get('OPENAI_API_KEY') || ''
          }

          if (openAiKey) {
            try {
              var audioBinRes = $http.send({
                url: mediaUrl,
                method: 'GET',
                timeout: 25,
              })
              if (audioBinRes && audioBinRes.statusCode === 200 && audioBinRes.body) {
                var whisperBoundary = '----BoundaryWhisper' + $security.randomString(16)
                var partModel =
                  '--' +
                  whisperBoundary +
                  '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n'
                var partLang =
                  '--' +
                  whisperBoundary +
                  '\r\nContent-Disposition: form-data; name="language"\r\n\r\npt\r\n'
                var partFormat =
                  '--' +
                  whisperBoundary +
                  '\r\nContent-Disposition: form-data; name="response_format"\r\n\r\ntext\r\n'
                var fileHeader =
                  '--' +
                  whisperBoundary +
                  '\r\nContent-Disposition: form-data; name="file"; filename="audio.ogg"\r\nContent-Type: audio/ogg\r\n\r\n'
                var whisperFooter = '\r\n--' + whisperBoundary + '--\r\n'

                var partModelBytes = new Uint8Array(partModel.length)
                for (var mi = 0; mi < partModel.length; mi++)
                  partModelBytes[mi] = partModel.charCodeAt(mi)
                var partLangBytes = new Uint8Array(partLang.length)
                for (var li = 0; li < partLang.length; li++)
                  partLangBytes[li] = partLang.charCodeAt(li)
                var partFormatBytes = new Uint8Array(partFormat.length)
                for (var fi = 0; fi < partFormat.length; fi++)
                  partFormatBytes[fi] = partFormat.charCodeAt(fi)
                var fileHeaderBytes = new Uint8Array(fileHeader.length)
                for (var hi = 0; hi < fileHeader.length; hi++)
                  fileHeaderBytes[hi] = fileHeader.charCodeAt(hi)
                var footerBytes = new Uint8Array(whisperFooter.length)
                for (var foi = 0; foi < whisperFooter.length; foi++)
                  footerBytes[foi] = whisperFooter.charCodeAt(foi)

                var totalLen =
                  partModelBytes.length +
                  partLangBytes.length +
                  partFormatBytes.length +
                  fileHeaderBytes.length +
                  audioBinRes.body.length +
                  footerBytes.length

                var whisperPayloadBytes = new Uint8Array(totalLen)
                var curOffset = 0
                whisperPayloadBytes.set(partModelBytes, curOffset)
                curOffset += partModelBytes.length
                whisperPayloadBytes.set(partLangBytes, curOffset)
                curOffset += partLangBytes.length
                whisperPayloadBytes.set(partFormatBytes, curOffset)
                curOffset += partFormatBytes.length
                whisperPayloadBytes.set(fileHeaderBytes, curOffset)
                curOffset += fileHeaderBytes.length
                whisperPayloadBytes.set(audioBinRes.body, curOffset)
                curOffset += audioBinRes.body.length
                whisperPayloadBytes.set(footerBytes, curOffset)

                var whisperRes = $http.send({
                  url: 'https://api.openai.com/v1/audio/transcriptions',
                  method: 'POST',
                  headers: {
                    Authorization: 'Bearer ' + openAiKey,
                    'Content-Type': 'multipart/form-data; boundary=' + whisperBoundary,
                  },
                  body: whisperPayloadBytes.buffer,
                  timeout: 30,
                })

                if (
                  whisperRes &&
                  whisperRes.statusCode === 200 &&
                  whisperRes.json &&
                  whisperRes.json.text
                ) {
                  var transcript = String(whisperRes.json.text).trim()
                  if (transcript) {
                    text = '[Áudio do cliente]: "' + transcript + '"'
                  }
                }
              }
            } catch (_) {}
          }
        }

        // Localiza cliente existente por IG Sender ID (salvo nas notes ou last_origin)
        var customer = null
        try {
          var existingCusts = $app.findRecordsByFilter(
            'customers',
            'notes ~ {:sid} || last_origin ~ {:sid}',
            'created',
            1,
            0,
            { sid: senderId },
          )
          if (existingCusts && existingCusts.length > 0) {
            customer = existingCusts[0]
          }
        } catch (_) {}

        var isNewCustomer = false
        var originLabel = 'Instagram Direct' + (igUsername ? ' (@' + igUsername : '')

        if (!customer) {
          try {
            var customersCol = $app.findCollectionByNameOrId('customers')
            customer = new Record(customersCol)
            customer.set('user_id', userId)
            customer.set('name', contactName)
            if (igProfileName) {
              customer.set('first_name', igProfileName.split(' ')[0])
            }
            customer.set('status', '1. Acolhimento')
            customer.set('source', 'Instagram Direct')
            customer.set('last_origin', originLabel)
            customer.set('last_origin_at', nowIso)

            var initialNotes =
              '[Origem: ' +
              originLabel +
              ', ' +
              nowBrStr +
              ']\n' +
              'IG Sender ID: ' +
              senderId +
              '\n' +
              'IG Recipient ID: ' +
              (recipientId || '') +
              (igUsername ? '\nUsername: @' + igUsername : '')

            customer.set('notes', initialNotes)
            customer.set('origin_history', [
              {
                source: originLabel,
                type: 'instagram_direct',
                date: nowIso,
                sender_id: senderId,
              },
            ])

            $app.save(customer)
            isNewCustomer = true
            $app
              .logger()
              .info(
                '[IG_POST_CUSTOMER_CREATED] Novo cliente criado no CRM',
                'customer_id',
                customer.id,
                'name',
                contactName,
              )
            console.log('[IG_POST_CUSTOMER_CREATED] id=' + customer.id + ' name=' + contactName)
          } catch (err) {
            $app
              .logger()
              .error('Failed to create customer from Instagram webhook', 'error', String(err))
            console.error('[IG_POST_CUSTOMER_ERR] ' + String(err))
            continue
          }
        } else {
          // Atualiza notes/last_origin se necessário
          try {
            var custUp = $app.findRecordById('customers', customer.id)
            if (!custUp.getString('user_id')) {
              custUp.set('user_id', userId)
            }
            if ((custUp.getString('name') || '').startsWith('Lead Instagram') && igProfileName) {
              custUp.set('name', igProfileName)
              custUp.set('first_name', igProfileName.split(' ')[0])
            }
            custUp.set('last_origin', originLabel)
            custUp.set('last_origin_at', nowIso)
            $app.save(custUp)
            customer = custUp
          } catch (_) {}
        }

        // UNIFICAÇÃO DE LEADS DO INSTAGRAM DIRECT POR SENDER ID:
        // Mesma pessoa (mesmo senderId) = 1 único lead na coleção 'leads'.
        // Se existir um lead com a mesma origem ("Instagram Direct") e mesmo senderId, atualiza-o;
        // caso contrário, cria um novo lead.
        try {
          var leadsCol = $app.findCollectionByNameOrId('leads')
          var existingLeads = $app.findRecordsByFilter(
            'leads',
            "source = 'Instagram Direct' && notes ~ {:sid}",
            'created',
            1,
            0,
            { sid: senderId },
          )

          if (existingLeads && existingLeads.length > 0) {
            var existingLead = existingLeads[0]
            var currentLeadNotes = existingLead.getString('notes') || ''
            var leadUpdated = false

            // Atualiza nome se ainda for genérico e tivermos nome da Graph API
            if (
              (existingLead.getString('name') || '').startsWith('Lead Instagram') &&
              igProfileName
            ) {
              existingLead.set('name', igProfileName)
              leadUpdated = true
            }

            // Anexa a nova mensagem às notes do lead preservando o histórico
            var messageHeader = '\n[' + nowBrStr + '] Nova mensagem: ' + text
            existingLead.set('notes', currentLeadNotes + messageHeader)
            leadUpdated = true

            if (!existingLead.getString('assigned_to') && userId) {
              existingLead.set('assigned_to', userId)
              leadUpdated = true
            }

            if (leadUpdated) {
              $app.save(existingLead)
              $app
                .logger()
                .info(
                  '[IG_POST_LEAD_UPDATED] Lead existente de Instagram Direct atualizado por sender_id',
                  'lead_id',
                  existingLead.id,
                  'sender_id',
                  senderId,
                )
              console.log('[IG_POST_LEAD_UPDATED] lead=' + existingLead.id + ' sender=' + senderId)
            }
          } else {
            // Cria novo lead apenas quando não existir
            var newLead = new Record(leadsCol)
            newLead.set('assigned_to', userId)
            newLead.set('name', contactName)
            newLead.set('source', 'Instagram Direct')
            newLead.set('status', 'Novo')
            newLead.set(
              'notes',
              'Capturado via Meta Instagram Direct API\n' +
                'Sender ID: ' +
                senderId +
                (igUsername ? '\n@' + igUsername : '') +
                '\nMensagem: ' +
                text,
            )
            $app.save(newLead)
            $app
              .logger()
              .info(
                '[IG_POST_LEAD_CREATED] Novo lead criado no CRM para Instagram Direct',
                'lead_id',
                newLead.id,
                'sender_id',
                senderId,
              )
            console.log('[IG_POST_LEAD_CREATED] lead=' + newLead.id + ' sender=' + senderId)
          }
        } catch (leadErr) {
          $app
            .logger()
            .error('Failed to process lead from Instagram webhook', 'error', String(leadErr))
        }
        // Deduplicação de mensagens idênticas em menos de 2 minutos
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
            var lastMsg = recentMsgs[0]
            var diffMins =
              (new Date().getTime() - new Date(lastMsg.getString('created')).getTime()) / 60000
            if (diffMins < 2) isDuplicate = true
          }
        } catch (_) {}

        if (!isDuplicate) {
          try {
            var convCol = $app.findCollectionByNameOrId('conversations')
            var newMsg = new Record(convCol)
            newMsg.set('customer_id', customer.id)
            newMsg.set('user_id', userId)

            // Detecção de mensagem de sistema/código
            var isSystemMsg =
              /\b(?:\d{4,8})\s+[ée]\s+o\s+teu\s+c[oó]digo/i.test(text) ||
              /(?:n[aã]o\s+o\s+partilhe|n[aã]o\s+compartilhe|don'?t\s+share)/i.test(text) ||
              /c[oó]digo\s+(?:do\s+instagram|do\s+whatsapp|do\s+facebook|da\s+meta)/i.test(text)

            newMsg.set('sender', isSystemMsg ? 'system' : 'customer')
            newMsg.set('content', text)
            newMsg.set('channel', 'instagram')
            $app.save(newMsg)

            // Registra MID processado no banco para dedup persistente
            if (messageMid) {
              try {
                var sLogsCol = $app.findCollectionByNameOrId('system_logs')
                var midLog = new Record(sLogsCol)
                midLog.set('type', 'instagram_processed_mid')
                midLog.set('message', messageMid)
                midLog.set('user_id', userId)
                midLog.set(
                  'details',
                  JSON.stringify({
                    sender_id: senderId,
                    recipient_id: recipientId,
                    customer_id: customer.id,
                    conv_id: newMsg.id,
                  }),
                )
                $app.saveNoValidate(midLog)
              } catch (_) {}
            }

            $app
              .logger()
              .info(
                'Instagram message saved successfully',
                'customer_id',
                customer.id,
                'sender_id',
                senderId,
              )
            console.log(
              '[IG_POST_MSG_SAVED] customer=' +
                customer.id +
                ' conv=' +
                newMsg.id +
                ' text=' +
                text.substring(0, 40),
            )
          } catch (err) {
            $app
              .logger()
              .error('Failed to save conversation from Instagram webhook', 'error', String(err))
            console.error('[IG_POST_CONV_ERR] ' + String(err))
          }
        } else {
          $app
            .logger()
            .info(
              '[IG_POST_DUPLICATE] Mensagem idêntica recente ignorada',
              'customer_id',
              customer.id,
            )
        }
      }
    }
  }

  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var queryUserId = query['user_id'] || query['uid'] || ''

  var entries = (body && body.entry) || []
  var entrySummaries = []
  for (var i = 0; i < entries.length; i++) {
    var en = entries[i] || {}
    var msgs = en.messaging || []
    var chs = en.changes || []
    var msgPairs = []
    for (var m = 0; m < msgs.length; m++) {
      var item = msgs[m] || {}
      var sId = item.sender ? item.sender.id : ''
      var rId = item.recipient ? item.recipient.id : ''
      var hasTxt = item.message && item.message.text ? 'txt' : ''
      var isEcho = item.message && item.message.is_echo ? 'echo' : ''
      msgPairs.push(
        sId + '->' + rId + (hasTxt ? '(' + hasTxt + ')' : '') + (isEcho ? '(echo)' : ''),
      )
    }
    var chFields = []
    for (var c = 0; c < chs.length; c++) {
      chFields.push(chs[c].field || 'unknown')
    }
    entrySummaries.push(
      '#' +
        i +
        '[id=' +
        (en.id || '') +
        ' msgs=' +
        msgs.length +
        (msgPairs.length ? ' pairs=' + msgPairs.join(',') : '') +
        (chs.length ? ' chs=' + chFields.join(',') : '') +
        ']',
    )
  }

  var debugSummary =
    '[IG_POST_HOOK] object=' +
    (body ? body.object : 'null') +
    ' entries=' +
    entries.length +
    ' query_uid=' +
    (queryUserId || 'none') +
    ' ' +
    entrySummaries.join(' ')

  $app.logger().info(debugSummary)
  console.log(debugSummary)

  try {
    var sLogsCol = $app.findCollectionByNameOrId('system_logs')
    var sLogRec = new Record(sLogsCol)
    sLogRec.set('type', 'instagram_webhook_post')
    sLogRec.set('message', debugSummary)
    sLogRec.set('user_id', queryUserId || '')
    sLogRec.set(
      'details',
      JSON.stringify({
        object: body ? body.object : null,
        entries_count: entries.length,
        summaries: entrySummaries,
      }),
    )
    $app.saveNoValidate(sLogRec)
  } catch (_) {}

  // A Meta envia object "instagram" ou "page"
  if (!body || (body.object !== 'instagram' && body.object !== 'page')) {
    var rejectMsg =
      '[IG_POST_HOOK_DISCARD] Objeto não reconhecido: ' + (body ? body.object : 'null')
    $app.logger().warn(rejectMsg)
    console.warn(rejectMsg)
    return e.string(200, 'EVENT_RECEIVED')
  }

  try {
    processPayload(body, queryUserId, '')
  } catch (err) {
    $app.logger().error('Error processing Instagram Webhook', 'error', String(err))
    console.error('[IG_POST_HOOK_ERROR] ' + String(err))
  }

  return e.string(200, 'EVENT_RECEIVED')
}

// Endpoint complementar com userId no path
function handleInstagramWebhookPostWithPathUser(e) {
  // Função de processamento 100% autossuficiente declarada no escopo interno do callback
  const processPayload = function (body, queryUserId, pathUserId) {
    var userId = pathUserId || queryUserId || ''

    // 1. Resolução dinâmica de usuário e IG Account IDs vinculados
    var user = null
    if (userId) {
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {}
    }

    var entries = (body && body.entry) || []
    var eventEntryIds = []
    for (var ei = 0; ei < entries.length; ei++) {
      var eItem = entries[ei] || {}
      if (eItem.id) eventEntryIds.push(String(eItem.id).trim())
      var mList = eItem.messaging || []
      for (var mi = 0; mi < mList.length; mi++) {
        var rObj = mList[mi] && mList[mi].recipient
        if (rObj && rObj.id) eventEntryIds.push(String(rObj.id).trim())
      }
    }

    if (!user && eventEntryIds.length > 0) {
      for (var eidIdx = 0; eidIdx < eventEntryIds.length; eidIdx++) {
        var candidateEid = eventEntryIds[eidIdx]
        if (!candidateEid) continue
        try {
          var usersByIg = $app.findRecordsByFilter(
            'users',
            'meta_instagram_business_id = {:bid}',
            'created',
            1,
            0,
            { bid: candidateEid },
          )
          if (usersByIg && usersByIg.length > 0) {
            user = usersByIg[0]
            userId = user.id
            $app
              .logger()
              .info(
                '[IG_POST_MATCH] Usuário encontrado por meta_instagram_business_id',
                'entry_id',
                candidateEid,
                'user_id',
                userId,
              )
            break
          }
        } catch (_) {}
      }
    }

    if (!user) {
      try {
        var igUsers = $app.findRecordsByFilter(
          'users',
          "meta_instagram_business_id != '' || instagram_username != '' || meta_instagram_page_token != '' || meta_page_access_token != ''",
          'created',
          1,
          0,
        )
        if (igUsers && igUsers.length > 0) {
          user = igUsers[0]
          userId = user.id
          $app
            .logger()
            .info(
              '[IG_POST_MATCH] Usuário com Instagram ativo resolvido por fallback dinâmico',
              'user_id',
              userId,
            )
        }
      } catch (_) {}
    }

    if (!user) {
      try {
        var allUsers = $app.findRecordsByFilter('users', "email != ''", 'created', 1, 0)
        if (allUsers && allUsers.length > 0) {
          user = allUsers[0]
          userId = user.id
          $app
            .logger()
            .info(
              '[IG_POST_MATCH] Usuário único do CRM resolvido por fallback geral',
              'user_id',
              userId,
            )
        }
      } catch (_) {}
    }

    if (!user) {
      var noUserErr =
        '[IG_POST_NO_USER] Nenhum usuário encontrado para associar o evento de Instagram'
      $app.logger().error(noUserErr)
      console.error(noUserErr)
      return
    }

    var savedIgBizId = (user.getString('meta_instagram_business_id') || '').trim()
    var officialIgId = '17841418593400936'
    var knownBusinessIds = {}
    if (savedIgBizId) knownBusinessIds[savedIgBizId] = 'user.meta_instagram_business_id'
    knownBusinessIds[officialIgId] = 'brf_imoveis_official_ig_id'
    knownBusinessIds['1343797128806374'] = 'brf_imoveis_page_id'
    knownBusinessIds['1219427617930954'] = 'brf_imoveis_classic_page_id'
    knownBusinessIds['17841414618266409'] = 'bernadete_ig_alias'
    knownBusinessIds['17841418953400936'] = 'legacy_ig_alias'

    var nowIso = new Date().toISOString()
    var nowBrStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    var pageToken =
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      user.getString('meta_capi_token') ||
      ''

    for (var eIndex = 0; eIndex < entries.length; eIndex++) {
      var entry = entries[eIndex] || {}
      var entryId = entry.id ? String(entry.id).trim() : ''

      var changesList = entry.changes || []
      if (changesList.length > 0) {
        for (var ci = 0; ci < changesList.length; ci++) {
          var ch = changesList[ci] || {}
          var chField = ch.field || 'unknown'
          var chLog =
            '[IG_POST_CHANGE] entry_id=' +
            entryId +
            ' field=' +
            chField +
            ' val_keys=' +
            (ch.value ? Object.keys(ch.value).join(',') : 'none')
          $app.logger().info(chLog)
          console.log(chLog)
        }
      }

      var messagingList = entry.messaging || []
      if (messagingList.length === 0 && changesList.length === 0) {
        $app
          .logger()
          .info('[IG_POST_ENTRY_EMPTY] Entry sem messaging nem changes', 'entry_id', entryId)
        continue
      }

      for (var mIndex = 0; mIndex < messagingList.length; mIndex++) {
        var messaging = messagingList[mIndex] || {}

        if (messaging.message && messaging.message.is_echo) {
          $app
            .logger()
            .info(
              '[IG_POST_SKIP_ECHO] Desconsiderando echo da própria conta',
              'mid',
              messaging.message.mid || '',
            )
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
            : entryId

        if (!senderId) {
          $app.logger().warn('[IG_POST_NO_SENDER] Messaging sem sender.id descartado')
          continue
        }

        var matchedPath = ''
        if (recipientId && knownBusinessIds[recipientId]) {
          matchedPath = 'recipient_id:' + recipientId + ' via ' + knownBusinessIds[recipientId]
        } else if (entryId && knownBusinessIds[entryId]) {
          matchedPath = 'entry_id:' + entryId + ' via ' + knownBusinessIds[entryId]
        } else if (senderId && knownBusinessIds[senderId]) {
          $app
            .logger()
            .info(
              '[IG_POST_SKIP_SELF] Mensagem tem sender igual a conta comercial conhecida',
              'sender_id',
              senderId,
            )
          continue
        } else {
          matchedPath = 'fallback_single_tenant: recipient=' + recipientId + ' entry=' + entryId
        }

        $app
          .logger()
          .info(
            '[IG_POST_MATCH_PATH] Casamento de conta do Instagram aprovado: ' + matchedPath,
            'sender_id',
            senderId,
            'recipient_id',
            recipientId,
          )
        console.log(
          '[IG_POST_MATCH_PATH] ' +
            matchedPath +
            ' sender=' +
            senderId +
            ' recipient=' +
            recipientId,
        )

        var messageMid = (messaging.message && messaging.message.mid) || messaging.mid || ''
        if (messageMid) {
          if (typeof globalThis !== 'undefined') {
            if (!globalThis.__processedIgMids) globalThis.__processedIgMids = {}
            if (globalThis.__processedIgMids[messageMid]) {
              $app
                .logger()
                .info('[IG_POST_DEDUP] Mensagem MID já processada em cache: ' + messageMid)
              console.log('[IG_POST_DEDUP] Ignorando repetido (cache): ' + messageMid)
              continue
            }
            globalThis.__processedIgMids[messageMid] = Date.now()
          }

          var isMidDup = false
          try {
            var existingMidLogs = $app.findRecordsByFilter(
              'system_logs',
              "type = 'instagram_processed_mid' && message = {:mid}",
              '',
              1,
              0,
              { mid: messageMid },
            )
            if (existingMidLogs && existingMidLogs.length > 0) {
              isMidDup = true
            }
          } catch (_) {}

          if (isMidDup) {
            $app.logger().info('[IG_POST_DEDUP] Mensagem MID já persistida no banco: ' + messageMid)
            console.log('[IG_POST_DEDUP] Ignorando repetido (banco): ' + messageMid)
            continue
          }
        }

        var text = ''
        var isAudio = false
        var mediaUrl = ''

        if (messaging.message) {
          if (messaging.message.text) {
            text = messaging.message.text
          } else if (messaging.message.attachments && messaging.message.attachments.length > 0) {
            var att = messaging.message.attachments[0] || {}
            var aType = att.type || 'mídia'
            if (aType === 'audio' || aType === 'voice') {
              text = '[Áudio Recebido do Instagram]'
              isAudio = true
              mediaUrl = (att.payload && att.payload.url) || ''
            } else if (aType === 'image') {
              text = '[Imagem Recebida do Instagram]'
            } else if (aType === 'video') {
              text = '[Vídeo Recebido do Instagram]'
            } else if (aType === 'story_mention') {
              text = '[Menção nos Stories do Instagram]'
            } else if (aType === 'share') {
              text = '[Compartilhamento do Instagram]'
            } else {
              text = '[' + aType + ' Recebido]'
            }
          } else if (messaging.message.quick_reply && messaging.message.quick_reply.payload) {
            text = messaging.message.quick_reply.payload
          }
        } else if (messaging.postback && messaging.postback.title) {
          text = messaging.postback.title
        }

        if (!text) {
          text = '[Mensagem Recebida do Instagram]'
        }

        var igProfileName = ''
        var igUsername = ''
        if (pageToken && senderId && !senderId.startsWith('test_')) {
          try {
            var profileRes = $http.send({
              url:
                'https://graph.facebook.com/v22.0/' +
                senderId +
                '?fields=name,username,profile_pic',
              method: 'GET',
              headers: { Authorization: 'Bearer ' + pageToken },
              timeout: 10,
            })
            if (profileRes && profileRes.statusCode === 200 && profileRes.json) {
              igProfileName = profileRes.json.name || ''
              igUsername = profileRes.json.username || ''
            }
          } catch (_) {}
        }

        var contactName =
          igProfileName ||
          (igUsername ? '@' + igUsername : '') ||
          'Lead Instagram (' + senderId.substring(0, Math.min(8, senderId.length)) + ')'

        if (isAudio && mediaUrl) {
          var openAiKey = $os.getenv('OPENAI_API_KEY') || ''
          if (
            !openAiKey &&
            typeof $secrets !== 'undefined' &&
            $secrets.has &&
            $secrets.has('OPENAI_API_KEY')
          ) {
            openAiKey = $secrets.get('OPENAI_API_KEY') || ''
          }

          if (openAiKey) {
            try {
              var audioBinRes = $http.send({
                url: mediaUrl,
                method: 'GET',
                timeout: 25,
              })
              if (audioBinRes && audioBinRes.statusCode === 200 && audioBinRes.body) {
                var whisperBoundary = '----BoundaryWhisper' + $security.randomString(16)
                var partModel =
                  '--' +
                  whisperBoundary +
                  '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n'
                var partLang =
                  '--' +
                  whisperBoundary +
                  '\r\nContent-Disposition: form-data; name="language"\r\n\r\npt\r\n'
                var partFormat =
                  '--' +
                  whisperBoundary +
                  '\r\nContent-Disposition: form-data; name="response_format"\r\n\r\ntext\r\n'
                var fileHeader =
                  '--' +
                  whisperBoundary +
                  '\r\nContent-Disposition: form-data; name="file"; filename="audio.ogg"\r\nContent-Type: audio/ogg\r\n\r\n'
                var whisperFooter = '\r\n--' + whisperBoundary + '--\r\n'

                var partModelBytes = new Uint8Array(partModel.length)
                for (var mi = 0; mi < partModel.length; mi++)
                  partModelBytes[mi] = partModel.charCodeAt(mi)
                var partLangBytes = new Uint8Array(partLang.length)
                for (var li = 0; li < partLang.length; li++)
                  partLangBytes[li] = partLang.charCodeAt(li)
                var partFormatBytes = new Uint8Array(partFormat.length)
                for (var fi = 0; fi < partFormat.length; fi++)
                  partFormatBytes[fi] = partFormat.charCodeAt(fi)
                var fileHeaderBytes = new Uint8Array(fileHeader.length)
                for (var hi = 0; hi < fileHeader.length; hi++)
                  fileHeaderBytes[hi] = fileHeader.charCodeAt(hi)
                var footerBytes = new Uint8Array(whisperFooter.length)
                for (var foi = 0; foi < whisperFooter.length; foi++)
                  footerBytes[foi] = whisperFooter.charCodeAt(foi)

                var totalLen =
                  partModelBytes.length +
                  partLangBytes.length +
                  partFormatBytes.length +
                  fileHeaderBytes.length +
                  audioBinRes.body.length +
                  footerBytes.length

                var whisperPayloadBytes = new Uint8Array(totalLen)
                var curOffset = 0
                whisperPayloadBytes.set(partModelBytes, curOffset)
                curOffset += partModelBytes.length
                whisperPayloadBytes.set(partLangBytes, curOffset)
                curOffset += partLangBytes.length
                whisperPayloadBytes.set(partFormatBytes, curOffset)
                curOffset += partFormatBytes.length
                whisperPayloadBytes.set(fileHeaderBytes, curOffset)
                curOffset += fileHeaderBytes.length
                whisperPayloadBytes.set(audioBinRes.body, curOffset)
                curOffset += audioBinRes.body.length
                whisperPayloadBytes.set(footerBytes, curOffset)

                var whisperRes = $http.send({
                  url: 'https://api.openai.com/v1/audio/transcriptions',
                  method: 'POST',
                  headers: {
                    Authorization: 'Bearer ' + openAiKey,
                    'Content-Type': 'multipart/form-data; boundary=' + whisperBoundary,
                  },
                  body: whisperPayloadBytes.buffer,
                  timeout: 30,
                })

                if (
                  whisperRes &&
                  whisperRes.statusCode === 200 &&
                  whisperRes.json &&
                  whisperRes.json.text
                ) {
                  var transcript = String(whisperRes.json.text).trim()
                  if (transcript) {
                    text = '[Áudio do cliente]: "' + transcript + '"'
                  }
                }
              }
            } catch (_) {}
          }
        }

        var customer = null
        try {
          var existingCusts = $app.findRecordsByFilter(
            'customers',
            'notes ~ {:sid} || last_origin ~ {:sid}',
            'created',
            1,
            0,
            { sid: senderId },
          )
          if (existingCusts && existingCusts.length > 0) {
            customer = existingCusts[0]
          }
        } catch (_) {}

        var isNewCustomer = false
        var originLabel = 'Instagram Direct' + (igUsername ? ' (@' + igUsername : '')

        if (!customer) {
          try {
            var customersCol = $app.findCollectionByNameOrId('customers')
            customer = new Record(customersCol)
            customer.set('user_id', userId)
            customer.set('name', contactName)
            if (igProfileName) {
              customer.set('first_name', igProfileName.split(' ')[0])
            }
            customer.set('status', '1. Acolhimento')
            customer.set('source', 'Instagram Direct')
            customer.set('last_origin', originLabel)
            customer.set('last_origin_at', nowIso)

            var initialNotes =
              '[Origem: ' +
              originLabel +
              ', ' +
              nowBrStr +
              ']\n' +
              'IG Sender ID: ' +
              senderId +
              '\n' +
              'IG Recipient ID: ' +
              (recipientId || '') +
              (igUsername ? '\nUsername: @' + igUsername : '')

            customer.set('notes', initialNotes)
            customer.set('origin_history', [
              {
                source: originLabel,
                type: 'instagram_direct',
                date: nowIso,
                sender_id: senderId,
              },
            ])

            $app.save(customer)
            isNewCustomer = true
            $app
              .logger()
              .info(
                '[IG_POST_CUSTOMER_CREATED] Novo cliente criado no CRM',
                'customer_id',
                customer.id,
                'name',
                contactName,
              )
            console.log('[IG_POST_CUSTOMER_CREATED] id=' + customer.id + ' name=' + contactName)
          } catch (err) {
            $app
              .logger()
              .error('Failed to create customer from Instagram webhook', 'error', String(err))
            console.error('[IG_POST_CUSTOMER_ERR] ' + String(err))
            continue
          }
        } else {
          try {
            var custUp = $app.findRecordById('customers', customer.id)
            if (!custUp.getString('user_id')) {
              custUp.set('user_id', userId)
            }
            if ((custUp.getString('name') || '').startsWith('Lead Instagram') && igProfileName) {
              custUp.set('name', igProfileName)
              custUp.set('first_name', igProfileName.split(' ')[0])
            }
            custUp.set('last_origin', originLabel)
            custUp.set('last_origin_at', nowIso)
            $app.save(custUp)
            customer = custUp
          } catch (_) {}
        }

        // UNIFICAÇÃO DE LEADS DO INSTAGRAM DIRECT POR SENDER ID:
        // Mesma pessoa (mesmo senderId) = 1 único lead na coleção 'leads'.
        // Se existir um lead com a mesma origem ("Instagram Direct") e mesmo senderId, atualiza-o;
        // caso contrário, cria um novo lead.
        try {
          var leadsCol = $app.findCollectionByNameOrId('leads')
          var existingLeads = $app.findRecordsByFilter(
            'leads',
            "source = 'Instagram Direct' && notes ~ {:sid}",
            'created',
            1,
            0,
            { sid: senderId },
          )

          if (existingLeads && existingLeads.length > 0) {
            var existingLead = existingLeads[0]
            var currentLeadNotes = existingLead.getString('notes') || ''
            var leadUpdated = false

            if (
              (existingLead.getString('name') || '').startsWith('Lead Instagram') &&
              igProfileName
            ) {
              existingLead.set('name', igProfileName)
              leadUpdated = true
            }

            var messageHeader = '\n[' + nowBrStr + '] Nova mensagem: ' + text
            existingLead.set('notes', currentLeadNotes + messageHeader)
            leadUpdated = true

            if (!existingLead.getString('assigned_to') && userId) {
              existingLead.set('assigned_to', userId)
              leadUpdated = true
            }

            if (leadUpdated) {
              $app.save(existingLead)
              $app
                .logger()
                .info(
                  '[IG_POST_LEAD_UPDATED] Lead existente de Instagram Direct atualizado por sender_id',
                  'lead_id',
                  existingLead.id,
                  'sender_id',
                  senderId,
                )
              console.log('[IG_POST_LEAD_UPDATED] lead=' + existingLead.id + ' sender=' + senderId)
            }
          } else {
            var newLead = new Record(leadsCol)
            newLead.set('assigned_to', userId)
            newLead.set('name', contactName)
            newLead.set('source', 'Instagram Direct')
            newLead.set('status', 'Novo')
            newLead.set(
              'notes',
              'Capturado via Meta Instagram Direct API\n' +
                'Sender ID: ' +
                senderId +
                (igUsername ? '\n@' + igUsername : '') +
                '\nMensagem: ' +
                text,
            )
            $app.save(newLead)
            $app
              .logger()
              .info(
                '[IG_POST_LEAD_CREATED] Novo lead criado no CRM para Instagram Direct',
                'lead_id',
                newLead.id,
                'sender_id',
                senderId,
              )
            console.log('[IG_POST_LEAD_CREATED] lead=' + newLead.id + ' sender=' + senderId)
          }
        } catch (leadErr) {
          $app
            .logger()
            .error('Failed to process lead from Instagram webhook', 'error', String(leadErr))
        }
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
            var lastMsg = recentMsgs[0]
            var diffMins =
              (new Date().getTime() - new Date(lastMsg.getString('created')).getTime()) / 60000
            if (diffMins < 2) isDuplicate = true
          }
        } catch (_) {}

        if (!isDuplicate) {
          try {
            var convCol = $app.findCollectionByNameOrId('conversations')
            var newMsg = new Record(convCol)
            newMsg.set('customer_id', customer.id)
            newMsg.set('user_id', userId)

            var isSystemMsg =
              /\b(?:\d{4,8})\s+[ée]\s+o\s+teu\s+c[oó]digo/i.test(text) ||
              /(?:n[aã]o\s+o\s+partilhe|n[aã]o\s+compartilhe|don'?t\s+share)/i.test(text) ||
              /c[oó]digo\s+(?:do\s+instagram|do\s+whatsapp|do\s+facebook|da\s+meta)/i.test(text)

            newMsg.set('sender', isSystemMsg ? 'system' : 'customer')
            newMsg.set('content', text)
            newMsg.set('channel', 'instagram')
            $app.save(newMsg)

            if (messageMid) {
              try {
                var sLogsCol = $app.findCollectionByNameOrId('system_logs')
                var midLog = new Record(sLogsCol)
                midLog.set('type', 'instagram_processed_mid')
                midLog.set('message', messageMid)
                midLog.set('user_id', userId)
                midLog.set(
                  'details',
                  JSON.stringify({
                    sender_id: senderId,
                    recipient_id: recipientId,
                    customer_id: customer.id,
                    conv_id: newMsg.id,
                  }),
                )
                $app.saveNoValidate(midLog)
              } catch (_) {}
            }

            $app
              .logger()
              .info(
                'Instagram message saved successfully',
                'customer_id',
                customer.id,
                'sender_id',
                senderId,
              )
            console.log(
              '[IG_POST_MSG_SAVED] customer=' +
                customer.id +
                ' conv=' +
                newMsg.id +
                ' text=' +
                text.substring(0, 40),
            )
          } catch (err) {
            $app
              .logger()
              .error('Failed to save conversation from Instagram webhook', 'error', String(err))
            console.error('[IG_POST_CONV_ERR] ' + String(err))
          }
        } else {
          $app
            .logger()
            .info(
              '[IG_POST_DUPLICATE] Mensagem idêntica recente ignorada',
              'customer_id',
              customer.id,
            )
        }
      }
    }
  }

  var pathUserId = ''
  try {
    pathUserId = e.request.pathValue('userId') || ''
  } catch (_) {}

  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var queryUserId = query['user_id'] || query['uid'] || ''

  var entries = (body && body.entry) || []
  var entrySummaries = []
  for (var i = 0; i < entries.length; i++) {
    var en = entries[i] || {}
    var msgs = en.messaging || []
    var chs = en.changes || []
    var msgPairs = []
    for (var m = 0; m < msgs.length; m++) {
      var item = msgs[m] || {}
      var sId = item.sender ? item.sender.id : ''
      var rId = item.recipient ? item.recipient.id : ''
      var hasTxt = item.message && item.message.text ? 'txt' : ''
      var isEcho = item.message && item.message.is_echo ? 'echo' : ''
      msgPairs.push(
        sId + '->' + rId + (hasTxt ? '(' + hasTxt + ')' : '') + (isEcho ? '(echo)' : ''),
      )
    }
    var chFields = []
    for (var c = 0; c < chs.length; c++) {
      chFields.push(chs[c].field || 'unknown')
    }
    entrySummaries.push(
      '#' +
        i +
        '[id=' +
        (en.id || '') +
        ' msgs=' +
        msgs.length +
        (msgPairs.length ? ' pairs=' + msgPairs.join(',') : '') +
        (chs.length ? ' chs=' + chFields.join(',') : '') +
        ']',
    )
  }

  var debugSummary =
    '[IG_POST_HOOK_PATH] object=' +
    (body ? body.object : 'null') +
    ' entries=' +
    entries.length +
    ' path_uid=' +
    pathUserId +
    ' ' +
    entrySummaries.join(' ')

  $app.logger().info(debugSummary)
  console.log(debugSummary)

  try {
    var sLogsCol = $app.findCollectionByNameOrId('system_logs')
    var sLogRec = new Record(sLogsCol)
    sLogRec.set('type', 'instagram_webhook_post')
    sLogRec.set('message', debugSummary)
    sLogRec.set('user_id', pathUserId || queryUserId || '')
    sLogRec.set(
      'details',
      JSON.stringify({
        object: body ? body.object : null,
        entries_count: entries.length,
        summaries: entrySummaries,
      }),
    )
    $app.saveNoValidate(sLogRec)
  } catch (_) {}

  if (!body || (body.object !== 'instagram' && body.object !== 'page')) {
    return e.string(200, 'EVENT_RECEIVED')
  }

  try {
    processPayload(body, queryUserId, pathUserId)
  } catch (err) {
    $app.logger().error('Error processing Instagram Webhook', 'error', String(err))
    console.error('[IG_POST_HOOK_ERROR] ' + String(err))
  }

  return e.string(200, 'EVENT_RECEIVED')
}

// Rotas originais sob /backend/v1/
routerAdd('POST', '/backend/v1/instagram/webhook', handleInstagramWebhookPost)
routerAdd('POST', '/backend/v1/instagram/webhook/{userId}', handleInstagramWebhookPostWithPathUser)
