// Hook para GET e POST em /backend/v1/meta_messenger_webhook
// Integração de Messenger + Instagram Direct pela Página 1401557100168686 ("www.brfimoveis.com.br")
// Suporte ao handshake de verificação GET da Meta e recepção de eventos POST
// NOTA: todo o código vive DENTRO dos handlers (regra de escopo do bundler do pb_hooks —
// funções top-level referenciadas pelos handlers podem sumir do bundle deployado).

function handleMetaMessengerWebhookGet(e) {
  var pathUserId = ''
  try {
    pathUserId = e.request.pathValue('userId') || ''
  } catch (_) {}

  // Log de auditoria do handshake (inline no handler — era função top-level e sumia no deploy)
  try {
    var hsReqInfo = {}
    try {
      hsReqInfo = e.requestInfo() || {}
    } catch (_) {}

    var hsQuery = hsReqInfo.query || {}
    var hsUserAgent = ''
    var hsXHubSig256 = ''
    try {
      hsUserAgent = e.request.header.get('user-agent') || ''
      hsXHubSig256 =
        e.request.header.get('x-hub-signature-256') || e.request.header.get('x-hub-signature') || ''
    } catch (_) {}

    var hsNowIso = new Date().toISOString()
    var hsMode = hsQuery['hub.mode'] || e.request.header.get('hub.mode') || ''
    var hsToken = hsQuery['hub.verify_token'] || e.request.header.get('hub.verify_token') || ''
    var hsChallenge = hsQuery['hub.challenge'] || e.request.header.get('hub.challenge') || ''

    var hsSysLogsCol = $app.findCollectionByNameOrId('system_logs')
    var hsLogRec = new Record(hsSysLogsCol, {
      type: 'meta_messenger_webhook_get',
      message:
        'GET /backend/v1/meta_messenger_webhook handshake - mode: ' +
        (hsMode || 'vazio') +
        ' | token: ' +
        (hsToken ? hsToken.substring(0, 15) + '...' : 'vazio'),
      details:
        'Method: GET | Time: ' +
        hsNowIso +
        ' | User-Agent: ' +
        hsUserAgent +
        ' | PathUser: ' +
        (pathUserId || 'none') +
        ' | Signature: ' +
        (hsXHubSig256 ? 'presente' : 'ausente'),
      payload: {
        method: 'GET',
        timestamp: hsNowIso,
        query: hsQuery,
        mode: hsMode,
        verify_token: hsToken,
        challenge: hsChallenge,
        path_user_id: pathUserId || '',
      },
    })
    $app.save(hsLogRec)
  } catch (hsErr) {
    try {
      $app
        .logger()
        .warn(
          'Falha defensiva ao registrar handshake GET meta_messenger em system_logs',
          'err',
          String(hsErr),
        )
    } catch (_) {}
  }

  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var mode =
    query['hub.mode'] ||
    e.request.header.get('hub.mode') ||
    e.request.header.get('x-hub-mode') ||
    ''
  var token =
    query['hub.verify_token'] ||
    e.request.header.get('hub.verify_token') ||
    e.request.header.get('x-hub-verify-token') ||
    ''
  var challenge =
    query['hub.challenge'] ||
    e.request.header.get('hub.challenge') ||
    e.request.header.get('x-hub-challenge') ||
    ''
  var userId = pathUserId || query['user_id'] || query['uid'] || ''

  // Ping sem parâmetros
  if (!mode && !token && !challenge) {
    return e.string(200, 'OK')
  }

  if (mode !== 'subscribe') {
    return e.string(403, 'Forbidden: hub.mode must be "subscribe"')
  }

  if (!token) {
    return e.string(403, 'Forbidden: missing hub.verify_token parameter')
  }

  var acceptedTokens = ['BRF IA CRM', 'BRFIACRM', 'BRF_IA_CRM', 'brf_ia_crm', 'brf-ia-crm']

  if (userId) {
    try {
      var explicitUser = $app.findRecordById('users', userId)
      if (explicitUser) {
        var ut = explicitUser.getString('meta_whatsapp_verify_token')
        if (ut && acceptedTokens.indexOf(ut) === -1) {
          acceptedTokens.push(ut)
        }
      }
    } catch (_) {}
  }

  try {
    var usersWithToken = $app.findRecordsByFilter(
      'users',
      "meta_whatsapp_verify_token != ''",
      'created',
      5,
      0,
    )
    for (var u of usersWithToken) {
      var t = u.getString('meta_whatsapp_verify_token')
      if (t && acceptedTokens.indexOf(t) === -1) {
        acceptedTokens.push(t)
      }
    }
  } catch (_) {}

  var tokenNorm = (token || '').trim().toLowerCase()
  var matchFound = false
  for (var candidate of acceptedTokens) {
    if (tokenNorm === candidate.trim().toLowerCase()) {
      matchFound = true
      break
    }
  }

  if (!matchFound) {
    $app
      .logger()
      .warn('meta_messenger_webhook handshake rejeitado: token incorreto', 'received', token)
    return e.string(403, 'Forbidden: invalid verify_token')
  }

  $app
    .logger()
    .info('meta_messenger_webhook handshake aprovado!', 'challenge_len', (challenge || '').length)
  return e.string(200, challenge || '')
}

function handleMetaMessengerWebhookPost(e) {
  var sysLogsCol = null
  var nowIso = new Date().toISOString()
  var body = null
  var rawBodyStr = ''
  var reqInfo = {}
  try {
    reqInfo = e.requestInfo() || {}
    body = reqInfo.body || null
  } catch (_) {}

  try {
    if (body !== null && body !== undefined) {
      rawBodyStr = typeof body === 'string' ? body : JSON.stringify(body)
    }
  } catch (_) {
    rawBodyStr = '[erro ao serializar corpo]'
  }

  var pathUserId = ''
  try {
    pathUserId = e.request.pathValue('userId') || ''
  } catch (_) {}
  var query = reqInfo.query || {}
  var queryUserId = query['user_id'] || query['uid'] || ''
  var effectiveUserId = pathUserId || queryUserId || ''

  var userAgent = ''
  var xHubSig256 = ''
  try {
    userAgent = e.request.header.get('user-agent') || ''
    xHubSig256 = e.request.header.get('x-hub-signature-256') || ''
  } catch (_) {}

  var entriesCount = (body && body.entry && body.entry.length) || 0
  var rawObject = body && typeof body === 'object' ? body.object || '' : ''

  // 1. Gravar em system_logs sempre para auditoria
  try {
    var sysLogsCol = $app.findCollectionByNameOrId('system_logs')
    var postLogRec = new Record(sysLogsCol, {
      type: 'meta_messenger_webhook_post',
      message:
        'POST /backend/v1/meta_messenger_webhook - object: ' +
        (rawObject || 'desconhecido') +
        ' | entries: ' +
        entriesCount,
      details:
        'Time: ' +
        nowIso +
        ' | Object: ' +
        rawObject +
        ' | Sig256: ' +
        (xHubSig256 ? 'presente' : 'ausente') +
        ' | User-Agent: ' +
        userAgent,
      payload: {
        method: 'POST',
        timestamp: nowIso,
        headers: {
          'user-agent': userAgent,
          'x-hub-signature-256': xHubSig256 ? '[presente]' : '[ausente]',
        },
        raw_body:
          rawBodyStr.length > 4000 ? rawBodyStr.substring(0, 4000) + '... [truncado]' : rawBodyStr,
        parsed_body: body,
      },
    })
    $app.save(postLogRec)
  } catch (rawLogErr) {
    try {
      $app
        .logger()
        .warn('Falha defensiva ao registrar POST em system_logs', 'err', String(rawLogErr))
    } catch (_) {}
  }

  // Validação do objeto da Meta: "page" ou "instagram"
  if (
    !body ||
    (body.object !== 'page' && body.object !== 'instagram' && body.object !== 'messenger')
  ) {
    $app
      .logger()
      .info('meta_messenger_webhook ignorando objeto não monitorado', 'object', rawObject)
    return e.string(200, 'EVENT_RECEIVED')
  }

  // Identificação do usuário do CRM
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
        "meta_page_access_token != '' || meta_instagram_page_token != '' || meta_whatsapp_verify_token != ''",
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
  var pageToken = user
    ? user.getString('meta_page_access_token') || user.getString('meta_instagram_page_token') || ''
    : ''

  // ===== ÁUDIO (VOZ): download + transcrição Whisper — mesmo fluxo do WhatsApp =====
  // Baixa o anexo de áudio do webhook da Meta (payload.url direto ou attachment_id
  // resolvido pela Graph API com o page token) e transcreve via OpenAI Whisper.
  // Totalmente autossuficiente: declarada dentro do handler (regra de escopo do Goja).
  function transcribeMetaAudioAttachment(tokenVal, att, logPrefix, userIdVal) {
    var result = { ok: false, transcript: '', error: '' }
    try {
      var payloadObj = (att && att.payload) || {}
      var directUrl = payloadObj.url || ''
      var attachmentId = payloadObj.attachment_id || ''

      if (!directUrl && attachmentId && tokenVal) {
        // Anexo sem URL direta: resolve a URL temporária de download pela Graph API
        try {
          var attMetaRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/messenger_platform/attachment?attachment_id=' +
              encodeURIComponent(attachmentId) +
              '&access_token=' +
              encodeURIComponent(tokenVal),
            method: 'GET',
            timeout: 15,
          })
          if (
            attMetaRes &&
            attMetaRes.statusCode === 200 &&
            attMetaRes.json &&
            attMetaRes.json.payload &&
            attMetaRes.json.payload.url
          ) {
            directUrl = attMetaRes.json.payload.url
          }
        } catch (_) {}
      }

      if (!directUrl) {
        result.error = 'URL de download do áudio não encontrada no anexo do webhook'
        return result
      }

      var audioBinRes = null
      try {
        audioBinRes = $http.send({ url: directUrl, method: 'GET', timeout: 25 })
      } catch (_) {}
      if ((!audioBinRes || audioBinRes.statusCode !== 200 || !audioBinRes.body) && tokenVal) {
        try {
          audioBinRes = $http.send({
            url: directUrl,
            method: 'GET',
            headers: { Authorization: 'Bearer ' + tokenVal },
            timeout: 25,
          })
        } catch (_) {}
      }
      if (!audioBinRes || audioBinRes.statusCode !== 200 || !audioBinRes.body) {
        result.error =
          'Falha ao baixar binário do áudio (status=' +
          (audioBinRes ? audioBinRes.statusCode : 'none') +
          ')'
        return result
      }

      var openAiKey = $os.getenv('OPENAI_API_KEY') || ''
      if (
        !openAiKey &&
        typeof $secrets !== 'undefined' &&
        $secrets.has &&
        $secrets.has('OPENAI_API_KEY')
      ) {
        openAiKey = $secrets.get('OPENAI_API_KEY') || ''
      }
      if (!openAiKey) {
        result.error = 'OPENAI_API_KEY ausente para transcrição'
        return result
      }

      var whisperBoundary = '----BoundaryWhisper' + $security.randomString(16)
      var partModel =
        '--' +
        whisperBoundary +
        '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n'
      var partLang =
        '--' + whisperBoundary + '\r\nContent-Disposition: form-data; name="language"\r\n\r\npt\r\n'
      var partFormat =
        '--' +
        whisperBoundary +
        '\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n'
      var fileHeader =
        '--' +
        whisperBoundary +
        '\r\nContent-Disposition: form-data; name="file"; filename="audio.mp4"\r\nContent-Type: audio/mp4\r\n\r\n'
      var whisperFooter = '\r\n--' + whisperBoundary + '--\r\n'

      var partModelBytes = new Uint8Array(partModel.length)
      for (var bi1 = 0; bi1 < partModel.length; bi1++)
        partModelBytes[bi1] = partModel.charCodeAt(bi1)
      var partLangBytes = new Uint8Array(partLang.length)
      for (var bi2 = 0; bi2 < partLang.length; bi2++) partLangBytes[bi2] = partLang.charCodeAt(bi2)
      var partFormatBytes = new Uint8Array(partFormat.length)
      for (var bi3 = 0; bi3 < partFormat.length; bi3++)
        partFormatBytes[bi3] = partFormat.charCodeAt(bi3)
      var fileHeaderBytes = new Uint8Array(fileHeader.length)
      for (var bi4 = 0; bi4 < fileHeader.length; bi4++)
        fileHeaderBytes[bi4] = fileHeader.charCodeAt(bi4)
      var footerBytes = new Uint8Array(whisperFooter.length)
      for (var bi5 = 0; bi5 < whisperFooter.length; bi5++)
        footerBytes[bi5] = whisperFooter.charCodeAt(bi5)

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

      var transcript = ''
      if (whisperRes && whisperRes.statusCode === 200) {
        if (whisperRes.json && whisperRes.json.text) {
          transcript = String(whisperRes.json.text).trim()
        } else if (whisperRes.body) {
          if (typeof whisperRes.body === 'string') {
            transcript = whisperRes.body.trim()
          } else {
            try {
              transcript = String.fromCharCode.apply(null, whisperRes.body).trim()
            } catch (_) {}
          }
        }
      }

      if (transcript) {
        result.ok = true
        result.transcript = transcript
      } else {
        result.error =
          'Whisper retornou status ' +
          (whisperRes ? whisperRes.statusCode : 'none') +
          ' ' +
          JSON.stringify((whisperRes && (whisperRes.json || whisperRes.body)) || '')
      }
    } catch (tErr) {
      result.error = String(tErr && tErr.message ? tErr.message : tErr)
    }
    return result
  }

  try {
    var entries = body.entry || []
    for (var ei = 0; ei < entries.length; ei++) {
      var entry = entries[ei] || {}
      var pageId = entry.id ? String(entry.id) : '1401557100168686'
      var entryTime = entry.time || Date.now()
      var messagingList = entry.messaging || []

      for (var mi = 0; mi < messagingList.length; mi++) {
        var messaging = messagingList[mi] || {}

        // Ignora ecos da própria página ou leituras/entregas
        if (messaging.message && messaging.message.is_echo) {
          $app.logger().info('meta_messenger_webhook ignorando eco da página', 'page_id', pageId)
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

        // Se o remetente for a própria página, ignora
        if (senderId === pageId || !senderId) {
          continue
        }

        var text = ''
        var hasAttachment = false
        var attachmentType = ''
        var isIgChannelEvent = body.object === 'instagram'

        if (messaging.message) {
          if (messaging.message.text) {
            text = messaging.message.text
          } else if (messaging.message.attachments && messaging.message.attachments.length > 0) {
            hasAttachment = true
            var att = messaging.message.attachments[0] || {}
            attachmentType = att.type || 'mídia'
            // Fallback de texto: shares, stories e cards trazem payload.text / payload.title
            var attPayloadText = (att.payload && (att.payload.text || att.payload.title)) || ''
            if (attPayloadText && String(attPayloadText).trim()) {
              text = String(attPayloadText)
            } else if (
              String(attachmentType).toLowerCase() === 'audio' ||
              String(attachmentType).toLowerCase() === 'voice'
            ) {
              // ÁUDIO/VOZ: transcrever via Whisper (mesma pipeline do WhatsApp) com o page token
              var audioLogPrefix = isIgChannelEvent ? 'instagram' : 'messenger'
              var audioChannelLabel =
                audioLogPrefix === 'instagram' ? 'Instagram Direct' : 'Messenger'
              var tRes = transcribeMetaAudioAttachment(pageToken, att, audioLogPrefix, finalUserId)
              if (tRes && tRes.ok && tRes.transcript) {
                text = '[Áudio do cliente]: "' + tRes.transcript + '"'
                try {
                  var audioOkLog = new Record(sysLogsCol, {
                    type: audioLogPrefix + '_audio_transcribed',
                    user_id: finalUserId,
                    message:
                      'Áudio de ' +
                      audioChannelLabel +
                      ' transcrito com sucesso via Whisper (sender ' +
                      senderId +
                      ')',
                    details:
                      'Transcrição: ' +
                      (tRes.transcript.length > 200
                        ? tRes.transcript.substring(0, 200) + '...'
                        : tRes.transcript),
                    payload: {
                      channel: audioLogPrefix,
                      sender_id: senderId,
                      page_id: pageId,
                      transcription: tRes.transcript,
                    },
                  })
                  $app.save(audioOkLog)
                } catch (_) {}
              } else {
                // Falha de transcrição: degrada educadamente (a Bia pede para repetir por texto)
                text = '[Áudio Recebido - não foi possível transcrever]'
                try {
                  var audioFailLog = new Record(sysLogsCol, {
                    type: audioLogPrefix + '_audio_transcription_failed',
                    user_id: finalUserId,
                    message:
                      'Falha ao transcrever áudio recebido via ' +
                      audioChannelLabel +
                      ' (sender ' +
                      senderId +
                      ')',
                    details: (tRes && tRes.error) || 'erro desconhecido',
                    payload: {
                      channel: audioLogPrefix,
                      sender_id: senderId,
                      page_id: pageId,
                      attachment: {
                        type: attachmentType,
                        url: (att.payload && att.payload.url) || '',
                        attachment_id: (att.payload && att.payload.attachment_id) || '',
                      },
                    },
                  })
                  $app.save(audioFailLog)
                } catch (_) {}
              }
            } else {
              text = '[' + attachmentType + ' recebido via Direct/Messenger]'
            }
          } else if (messaging.message.quick_reply && messaging.message.quick_reply.payload) {
            text = messaging.message.quick_reply.payload
          }
        } else if (messaging.postback && messaging.postback.title) {
          text = messaging.postback.title
        }

        if (!text) {
          text = '[Mensagem recebida]'
        }

        // Identifica o canal: Instagram Direct vs Facebook Messenger
        var isInstagram =
          body.object === 'instagram' ||
          Boolean(messaging.sender && messaging.sender.user_ref) ||
          Boolean(
            entry.changes &&
            entry.changes.some(function (c) {
              return c.field === 'instagram'
            }),
          )

        // Se a página for 1401557100168686 e vier de IG ou tiver marcação
        var channelName = isInstagram ? 'Instagram Direct' : 'Facebook Messenger'
        var channelKey = isInstagram ? 'instagram' : 'messenger'

        var senderProfileName = ''
        if (pageToken && senderId && !senderId.startsWith('test_')) {
          try {
            var profileRes = $http.send({
              url:
                'https://graph.facebook.com/v22.0/' +
                senderId +
                '?fields=first_name,last_name,name,username',
              method: 'GET',
              headers: { Authorization: 'Bearer ' + pageToken },
              timeout: 8,
            })
            if (profileRes && profileRes.statusCode === 200 && profileRes.json) {
              senderProfileName =
                profileRes.json.name ||
                profileRes.json.username ||
                (profileRes.json.first_name
                  ? profileRes.json.first_name +
                    (profileRes.json.last_name ? ' ' + profileRes.json.last_name : '')
                  : '')
            }
          } catch (_) {}
        }

        var contactName =
          senderProfileName ||
          (isInstagram ? 'Lead Instagram (' : 'Lead Messenger (') +
            senderId.substring(0, Math.min(8, senderId.length)) +
            ')'

        var nowIsoString = new Date().toISOString()
        var nowBrString = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

        // Buscar ou criar cliente
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
            customer.set('source', channelName)
            customer.set('last_origin', channelName)
            customer.set('last_origin_at', nowIsoString)
            customer.set(
              'notes',
              '[' +
                channelName +
                ', ' +
                nowBrString +
                ']\nID Remetente: ' +
                senderId +
                '\nPágina ID: ' +
                pageId +
                ' (1401557100168686)',
            )
            customer.set('origin_history', [
              {
                source: channelName,
                type: channelKey,
                date: nowIsoString,
                sender_id: senderId,
                page_id: pageId,
              },
            ])
            $app.save(customer)
          } catch (cErr) {
            $app.logger().error('Falha ao criar cliente meta_messenger', 'err', String(cErr))
            continue
          }
        } else {
          try {
            var custUp = $app.findRecordById('customers', customer.id)
            if (!custUp.getString('user_id') && finalUserId) {
              custUp.set('user_id', finalUserId)
            }
            if ((custUp.getString('name') || '').startsWith('Lead ') && senderProfileName) {
              custUp.set('name', senderProfileName)
              custUp.set('first_name', senderProfileName.split(' ')[0])
            }
            custUp.set('last_origin', channelName)
            custUp.set('last_origin_at', nowIsoString)
            $app.save(custUp)
            customer = custUp
          } catch (_) {}
        }

        // Criar ou atualizar conversa
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
            newMsg.set('channel', channelKey)
            $app.save(newMsg)
          } catch (saveErr) {
            $app.logger().error('Falha ao gravar conversa meta_messenger', 'err', String(saveErr))
          }
        }

        // Registro de sucesso em system_logs
        try {
          var successLog = new Record(sysLogsCol, {
            type: 'meta_messenger_webhook_success',
            user_id: finalUserId,
            message:
              'Evento ' +
              channelName +
              ' recebido de ' +
              (contactName || senderId) +
              ' na Página ' +
              pageId,
            details:
              'Sender: ' +
              senderId +
              ' | Page: ' +
              pageId +
              ' | Msg: ' +
              (text.length > 100 ? text.substring(0, 100) + '...' : text),
            payload: {
              channel: channelKey,
              sender_id: senderId,
              page_id: pageId,
              text: text,
              customer_id: customer ? customer.id : null,
              time: entryTime,
            },
          })
          $app.save(successLog)
        } catch (_) {}
      }
    }
  } catch (err) {
    $app.logger().error('Erro ao processar meta_messenger_webhook POST', 'err', String(err))
    try {
      var errLog = new Record(sysLogsCol, {
        type: 'meta_messenger_webhook_error',
        user_id: finalUserId,
        message: 'Erro no processamento de meta_messenger_webhook: ' + String(err.message || err),
        details: String(err),
        payload: { body: body },
      })
      $app.save(errLog)
    } catch (_) {}
  }

  return e.string(200, 'EVENT_RECEIVED')
}

// Registro das rotas públicas exigidas
routerAdd('GET', '/backend/v1/meta_messenger_webhook', handleMetaMessengerWebhookGet)
routerAdd('GET', '/backend/v1/meta_messenger_webhook/{userId}', handleMetaMessengerWebhookGet)
routerAdd('POST', '/backend/v1/meta_messenger_webhook', handleMetaMessengerWebhookPost)
routerAdd('POST', '/backend/v1/meta_messenger_webhook/{userId}', handleMetaMessengerWebhookPost)
