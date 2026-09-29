// Hook para POST /backend/v1/meta_whatsapp_webhook
// Todas as funções e variáveis devem estar inline dentro do callback (regra de escopo do PocketBase JSVM)

routerAdd('POST', '/backend/v1/meta_whatsapp_webhook', (e) => {
  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  var query = {}
  try {
    query = e.requestInfo().query || {}
  } catch (_) {}

  var userId = query['user_id'] || query['uid'] || ''

  $app
    .logger()
    .info('Meta WhatsApp Webhook received', 'user_id', userId, 'object', body ? body.object : '')

  var user = null
  if (userId) {
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {}
  }

  // Se user_id não veio na URL, tentar resolver o usuário por outros dados do webhook da Meta:
  // 1. Phone number ID recebido no metadata (entry.changes.value.metadata.phone_number_id)
  if (!user && body && body.entry) {
    try {
      var receivedPhoneId = ''
      var receivedWabaId = body.entry[0] && body.entry[0].id ? String(body.entry[0].id) : ''

      for (var entryItem of body.entry || []) {
        for (var ch of entryItem.changes || []) {
          if (ch.value && ch.value.metadata && ch.value.metadata.phone_number_id) {
            receivedPhoneId = String(ch.value.metadata.phone_number_id)
            break
          }
        }
        if (receivedPhoneId) break
      }

      if (receivedPhoneId) {
        var usersByPhone = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_phone_number_id = {:pid}',
          'created',
          2,
          0,
          { pid: receivedPhoneId },
        )
        if (usersByPhone && usersByPhone.length > 0) {
          user = usersByPhone[0]
          userId = user.id
        }
      }

      if (!user && receivedWabaId) {
        var usersByWaba = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_business_id = {:bid}',
          'created',
          2,
          0,
          { bid: receivedWabaId },
        )
        if (usersByWaba && usersByWaba.length > 0) {
          user = usersByWaba[0]
          userId = user.id
        }
      }
    } catch (_) {}
  }

  // 2. Se ainda não achou e temos exatamente um usuário configurado com WhatsApp
  if (!user) {
    try {
      var allActiveUsers = $app.findRecordsByFilter(
        'users',
        "meta_whatsapp_phone_number_id != '' || meta_whatsapp_verify_token != ''",
        'created',
        2,
        0,
      )
      if (allActiveUsers && allActiveUsers.length === 1) {
        user = allActiveUsers[0]
        userId = user.id
      }
    } catch (_) {}
  }

  if (!user) {
    return e.string(403, 'Forbidden: unable to resolve user for WhatsApp event')
  }

  if (!body || body.object !== 'whatsapp_business_account') {
    return e.string(404, 'Not Found')
  }

  // Helper para normalizar e resolver a origem do lead a partir de qualquer entrada (referral Meta, texto com tag, etc.)
  function resolveLeadOrigin(contentStr, referralObj, displayPhoneStr) {
    var detected = {
      label: '',
      notesEntry: '',
      originType: 'direto',
      rawText: contentStr || '',
      launchSlug: '',
    }

    var nowIso = new Date().toISOString()
    var nowBrStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    // 1. Referral nativo do Meta Click-to-WhatsApp
    if (referralObj) {
      var cName = (referralObj.campaign_name || referralObj.campaign || '').trim()
      var aName = (
        referralObj.ad_name ||
        referralObj.headline ||
        referralObj.source_id ||
        ''
      ).trim()
      var mRaw = (referralObj.media || referralObj.media_type || '').toLowerCase()
      if (!mRaw && referralObj.source_type && referralObj.source_type.toLowerCase() !== 'ad') {
        mRaw = referralObj.source_type.toLowerCase()
      }
      var mLabel = ''
      if (mRaw.indexOf('insta') !== -1) {
        mLabel = 'Instagram'
      } else if (mRaw.indexOf('face') !== -1) {
        mLabel = 'Facebook'
      } else if (mRaw) {
        mLabel = mRaw.charAt(0).toUpperCase() + mRaw.slice(1)
      }

      var parts = ['Anúncio Meta']
      if (mLabel) parts[0] = 'Anúncio Meta (' + mLabel + ')'
      if (cName) parts.push(cName)
      if (aName && aName !== cName) parts.push(aName)

      detected.label = parts.join(' — ')
      detected.originType = 'meta_ad'
      detected.notesEntry =
        '[Origem: Anúncio Meta — ' +
        (cName || 'Campanha') +
        ' — ' +
        (aName || 'Anúncio') +
        ', ' +
        nowBrStr +
        ']'
      if (referralObj.headline && referralObj.headline !== aName) {
        detected.notesEntry += ' (Headline: ' + referralObj.headline + ')'
      }
      if (referralObj.source_id) {
        detected.notesEntry += ' (Ad ID: ' + referralObj.source_id + ')'
      }
      return detected
    }

    // 2. Extração via mensagem pré-formatada (links rastreados, landing pages, QR codes, CTAs)
    var textLower = (contentStr || '').toLowerCase()

    // 2a. Padrão Landing Page pública: "landing page [slug]" ou "origem: landing page [slug]"
    var lpMatch =
      contentStr.match(/landing page\s+([a-z0-9\-_]+)/i) ||
      contentStr.match(/landing\s+page\s*[:-]\s*([a-z0-9\-_]+)/i)
    if (lpMatch && lpMatch[1]) {
      var slug = lpMatch[1].trim()
      detected.label = 'Landing Page — ' + slug
      detected.originType = 'landing_page'
      detected.launchSlug = slug
      detected.notesEntry = '[Origem: Landing Page ' + slug + ', ' + nowBrStr + ']'
      return detected
    }

    // 2b. Padrão explícito de parâmetro rastreado: "origem=[valor]", "origem: [valor]", "orig=[valor]"
    var originParamMatch = contentStr.match(
      /(?:origem|origin|src|utm_source)\s*[=:]\s*([a-z0-9\-_]+)/i,
    )
    if (originParamMatch && originParamMatch[1]) {
      var rawVal = originParamMatch[1].trim()
      var formattedLabel = rawVal

      if (rawVal.indexOf('google') !== -1) {
        formattedLabel = 'Google Ads — ' + rawVal
        detected.originType = 'google_ads'
      } else if (rawVal.indexOf('insta') !== -1) {
        formattedLabel = 'Instagram Orgânico — ' + rawVal
        detected.originType = 'instagram'
      } else if (rawVal.indexOf('meta') !== -1 || rawVal.indexOf('face') !== -1) {
        formattedLabel = 'Anúncio Meta — ' + rawVal
        detected.originType = 'meta_ad'
      } else if (rawVal.indexOf('remarketing') !== -1 || rawVal.indexOf('remkt') !== -1) {
        formattedLabel = 'Remarketing — ' + rawVal
        detected.originType = 'remarketing'
      } else if (rawVal.indexOf('site') !== -1 || rawVal.indexOf('portal') !== -1) {
        formattedLabel = 'Portal / Site — ' + rawVal
        detected.originType = 'portal'
      } else {
        formattedLabel = 'Link Rastreado — ' + rawVal
        detected.originType = 'tracked_link'
      }

      detected.label = formattedLabel
      detected.notesEntry = '[Origem: ' + formattedLabel + ', ' + nowBrStr + ']'
      return detected
    }

    // 2c. Detecção de menção nominal aos Lançamentos (ex: Villa dos Açores, etc.)
    if (
      textLower.indexOf('villa dos açores') !== -1 ||
      textLower.indexOf('villa dos acores') !== -1 ||
      textLower.indexOf('villa acores') !== -1
    ) {
      detected.label = 'Lançamento — villa-dos-acores'
      detected.originType = 'launch_direct'
      detected.launchSlug = 'villa-dos-acores'
      detected.notesEntry = '[Origem: Interesse em Villa dos Açores, ' + nowBrStr + ']'
      return detected
    }

    // 2d. Fallback obrigatório: nunca nulo/vazio. Se não tem rastreio nem anúncio, é WhatsApp Direto
    var directLabel = 'WhatsApp direto'
    if (displayPhoneStr) {
      directLabel += ' (' + displayPhoneStr + ')'
    }
    detected.label = directLabel
    detected.originType = 'direto'
    detected.notesEntry = '[Origem: ' + directLabel + ', ' + nowBrStr + ']'
    return detected
  }

  // Helper para atualizar histórico de origens mantendo deduplicação e acumulando lista cronológica
  function recordOriginOnCustomer(custRec, originInfo) {
    var nowIso = new Date().toISOString()
    var currentSource = custRec.getString('source') || ''
    var isDirect = originInfo.originType === 'direto'

    // Regra: se o lead já tem uma origem rica (ex: Anúncio Meta ou Landing) e esta mensagem é "direto" sem anúncio,
    // mantemos a origem principal anterior, mas registramos na last_origin e no origin_history.
    var isNewHigherPriority =
      !currentSource ||
      currentSource.indexOf('WhatsApp direto') !== -1 ||
      currentSource.indexOf('Meta - WhatsApp') !== -1 ||
      originInfo.originType === 'meta_ad' ||
      originInfo.originType === 'landing_page' ||
      originInfo.originType === 'tracked_link' ||
      originInfo.originType === 'google_ads'

    if (isNewHigherPriority && originInfo.label) {
      custRec.set('source', originInfo.label)
    }

    custRec.set('last_origin', originInfo.label)
    custRec.set('last_origin_at', nowIso)

    // Atualiza notes se houver entrada nova e não repetida
    if (originInfo.notesEntry) {
      var curNotes = (custRec.getString('notes') || '').trim()
      if (!curNotes) {
        custRec.set('notes', originInfo.notesEntry)
      } else if (curNotes.indexOf(originInfo.notesEntry) === -1) {
        custRec.set('notes', curNotes + '\n' + originInfo.notesEntry)
      }
    }

    // Atualiza origin_history (Array de objetos)
    var hist = []
    try {
      var rawHist = custRec.get('origin_history')
      if (Array.isArray(rawHist)) {
        hist = rawHist.slice(0, 30) // mantém até 30 registros
      }
    } catch (_) {}

    // Evita duplicar se a mesma origem foi registrada nos últimos 5 minutos
    var isDuplicateHist = false
    if (hist.length > 0) {
      var lastH = hist[hist.length - 1]
      if (lastH && lastH.source === originInfo.label) {
        isDuplicateHist = true
      }
    }

    if (!isDuplicateHist) {
      hist.push({
        source: originInfo.label,
        type: originInfo.originType,
        date: nowIso,
        launch_slug: originInfo.launchSlug || undefined,
      })
      custRec.set('origin_history', hist)
    }
  }

  try {
    for (var entry of body.entry || []) {
      for (var change of entry.changes || []) {
        var value = change.value
        if (!value || !value.messages || value.messages.length === 0) continue

        var contacts = value.contacts || []
        var metadata = value.metadata || {}
        var displayPhone = (metadata.display_phone_number || '').replace(/\D/g, '')

        for (var msg of value.messages) {
          var phone = (msg.from || '').replace(/\D/g, '')
          if (!phone) continue

          var content = ''
          if (msg.type === 'text' && msg.text && msg.text.body) {
            content = msg.text.body
          } else if (msg.type === 'audio' || msg.type === 'voice') {
            content = '[Áudio Recebido]'
            try {
              var mediaId = (msg.audio && msg.audio.id) || (msg.voice && msg.voice.id) || ''
              var waUserToken =
                (user && user.getString('meta_whatsapp_access_token')) ||
                (user && user.getString('meta_page_access_token')) ||
                ''
              if (!waUserToken) {
                try {
                  var tokenUsers = $app.findRecordsByFilter(
                    'users',
                    "meta_whatsapp_access_token != ''",
                    '-created',
                    1,
                    0,
                  )
                  if (tokenUsers.length > 0) {
                    waUserToken = tokenUsers[0].getString('meta_whatsapp_access_token')
                  }
                } catch (_) {}
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

              if (mediaId && waUserToken && openAiKey) {
                // 1. Obter URL do arquivo de mídia na Graph API v21.0
                var mediaMetaRes = $http.send({
                  url: 'https://graph.facebook.com/v21.0/' + mediaId,
                  method: 'GET',
                  headers: {
                    Authorization: 'Bearer ' + waUserToken,
                  },
                  timeout: 15,
                })

                var mediaDownloadUrl =
                  mediaMetaRes && mediaMetaRes.json && mediaMetaRes.json.url
                    ? mediaMetaRes.json.url
                    : ''

                if (mediaDownloadUrl) {
                  // 2. Download do binário de áudio com Bearer token do WhatsApp
                  var mediaBinaryRes = $http.send({
                    url: mediaDownloadUrl,
                    method: 'GET',
                    headers: {
                      Authorization: 'Bearer ' + waUserToken,
                    },
                    timeout: 25,
                  })

                  if (
                    mediaBinaryRes &&
                    mediaBinaryRes.statusCode === 200 &&
                    mediaBinaryRes.body &&
                    mediaBinaryRes.body.length > 0
                  ) {
                    // 3. Montar multipart/form-data para OpenAI Whisper
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
                      mediaBinaryRes.body.length +
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
                    whisperPayloadBytes.set(mediaBinaryRes.body, curOffset)
                    curOffset += mediaBinaryRes.body.length
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

                    var transcriptionText = ''
                    if (whisperRes && whisperRes.statusCode === 200) {
                      if (whisperRes.json && whisperRes.json.text) {
                        transcriptionText = String(whisperRes.json.text).trim()
                      } else if (whisperRes.body) {
                        if (typeof whisperRes.body === 'string') {
                          transcriptionText = whisperRes.body.trim()
                        } else {
                          try {
                            transcriptionText = String.fromCharCode
                              .apply(null, whisperRes.body)
                              .trim()
                          } catch (_) {}
                        }
                      }
                    }

                    if (transcriptionText) {
                      content = '[Áudio do cliente]: "' + transcriptionText + '"'
                      try {
                        var logColOk = $app.findCollectionByNameOrId('system_logs')
                        var okLog = new Record(logColOk)
                        okLog.set('user_id', userId || '')
                        okLog.set('type', 'audio_transcribed')
                        okLog.set('message', 'Áudio de WhatsApp transcrito com sucesso via Whisper')
                        okLog.set(
                          'details',
                          'Media ID: ' +
                            mediaId +
                            ' | Texto: ' +
                            transcriptionText.substring(0, 150),
                        )
                        okLog.set('payload', {
                          phone: phone,
                          media_id: mediaId,
                          transcription: transcriptionText,
                        })
                        $app.saveNoValidate(okLog)
                      } catch (_) {}
                    } else {
                      throw new Error(
                        'Whisper returned status ' +
                          (whisperRes ? whisperRes.statusCode : 'none') +
                          ' ' +
                          JSON.stringify(
                            (whisperRes && (whisperRes.json || whisperRes.body)) || '',
                          ),
                      )
                    }
                  } else {
                    throw new Error('Falha ao baixar binário do áudio da Meta')
                  }
                } else {
                  throw new Error('URL de download da mídia não encontrada na resposta da Meta')
                }
              } else {
                throw new Error(
                  'Credenciais ausentes para transcrição (mediaId=' +
                    !!mediaId +
                    ', waUserToken=' +
                    !!waUserToken +
                    ', openAiKey=' +
                    !!openAiKey +
                    ')',
                )
              }
            } catch (audioTransErr) {
              content = '[Áudio Recebido - não foi possível transcrever]'
              try {
                var logColFail = $app.findCollectionByNameOrId('system_logs')
                var failLog = new Record(logColFail)
                failLog.set('user_id', userId || '')
                failLog.set('type', 'audio_transcription_failed')
                failLog.set('message', 'Falha ao transcrever áudio recebido no WhatsApp')
                failLog.set('details', String(audioTransErr.message || audioTransErr))
                failLog.set('payload', {
                  phone: phone,
                  media_id: (msg.audio && msg.audio.id) || (msg.voice && msg.voice.id) || '',
                  error: String(audioTransErr),
                })
                $app.saveNoValidate(failLog)
              } catch (_) {}
            }
          } else if (msg.type === 'image' && msg.image && msg.image.caption) {
            content = msg.image.caption
          } else if (msg.type === 'button' && msg.button && msg.button.text) {
            content = msg.button.text
          } else if (msg.type === 'interactive' && msg.interactive) {
            var it = msg.interactive
            content =
              (it.button_reply && it.button_reply.title) ||
              (it.list_reply && it.list_reply.title) ||
              '[Interação Recebida]'
          } else {
            content = '[' + (msg.type || 'Mensagem') + ' Recebida]'
          }
          if (!content) continue

          var contactInfo = contacts.find(function (c) {
            return c.wa_id === msg.from
          })
          var contactName =
            (contactInfo && contactInfo.profile && contactInfo.profile.name) ||
            (contactInfo && contactInfo.wa_id) ||
            phone

          // Extrai referral do objeto da mensagem ou do change.value (quando click-to-WhatsApp)
          var referral = msg.referral || value.referral || null

          // Resolve origem de forma unificada (Meta Referral, Landing Page, link rastreado ou direto)
          var originInfo = resolveLeadOrigin(content, referral, displayPhone)

          if (referral) {
            // Registrar em system_logs (type "ad_referral")
            try {
              var logsCol = $app.findCollectionByNameOrId('system_logs')
              var adLog = new Record(logsCol)
              adLog.set('user_id', userId || '')
              adLog.set('type', 'ad_referral')
              adLog.set('message', 'Referral de anúncio Meta capturado: ' + originInfo.label)
              adLog.set('details', 'Origem resolvida: ' + originInfo.label + ' | Phone: ' + phone)
              adLog.set('payload', {
                phone: phone,
                contact_name: contactName,
                referral: referral,
                label: originInfo.label,
              })
              $app.saveNoValidate(adLog)
            } catch (logErr) {
              $app.logger().error('Failed to log ad_referral', 'error', String(logErr))
            }
          }

          // Localiza cliente existente por telefone para deduplicação
          var customer = null
          try {
            customer = $app.findFirstRecordByFilter(
              'customers',
              'phone ~ {:ph} || phone_1_value ~ {:ph}',
              { ph: phone },
            )
          } catch (_) {}

          var isNewCustomer = false

          if (!customer) {
            try {
              var customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', userId)
              customer.set('name', contactName)
              customer.set('phone', phone)
              customer.set('status', 'Novo')

              recordOriginOnCustomer(customer, originInfo)

              $app.save(customer)
              isNewCustomer = true
            } catch (err) {
              $app
                .logger()
                .error('Failed to create customer from WhatsApp webhook', 'error', String(err))
              continue
            }
          } else {
            // Cliente já existe: atualiza user_id se vazio e atualiza histórico de origens
            try {
              var custToUpdate = $app.findRecordById('customers', customer.id)
              if (!custToUpdate.getString('user_id')) {
                custToUpdate.set('user_id', userId)
              }

              recordOriginOnCustomer(custToUpdate, originInfo)

              $app.save(custToUpdate)
              customer = custToUpdate
            } catch (upErr) {
              $app
                .logger()
                .error('Failed to update customer origin history', 'error', String(upErr))
            }
          }

          // Garantir que NENHUM lead se perca na tabela 'leads': cria registro se for novo contato
          if (isNewCustomer) {
            try {
              var leadsCol = $app.findCollectionByNameOrId('leads')
              var lead = new Record(leadsCol)
              lead.set('assigned_to', userId)
              lead.set('name', contactName)
              lead.set('phone', phone)
              lead.set('source', originInfo.label || 'WhatsApp Cloud API')
              lead.set('status', 'Novo')
              var leadNotes = 'Capturado via Meta WhatsApp Cloud API'
              if (displayPhone) leadNotes += ' (' + displayPhone + ')'
              leadNotes += '\nOrigem: ' + (originInfo.label || 'WhatsApp direto')
              leadNotes += '\nMensagem: ' + content
              lead.set('notes', leadNotes)
              $app.save(lead)
            } catch (err) {
              $app
                .logger()
                .error('Failed to create lead from WhatsApp webhook', 'error', String(err))
            }
          }

          // Gravação da mensagem na conversa
          var isDuplicate = false
          try {
            var recentMsgs = $app.findRecordsByFilter(
              'conversations',
              "customer_id = {:cid} && sender = 'customer' && content = {:text}",
              '-created',
              1,
              0,
              { cid: customer.id, text: content },
            )
            if (recentMsgs.length > 0) {
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

              // Se a mensagem for código de verificação ou número de gateway de sistema, grava com sender 'system'
              var isSystemMsg =
                phone === '447710173736' ||
                /\b(?:\d{4,8})\s+[ée]\s+o\s+teu\s+c[oó]digo/i.test(content) ||
                /(?:n[aã]o\s+o\s+partilhe|n[aã]o\s+compartilhe|don'?t\s+share)/i.test(content) ||
                /c[oó]digo\s+(?:do\s+instagram|do\s+whatsapp|do\s+facebook|da\s+meta)/i.test(
                  content,
                )

              newMsg.set('sender', isSystemMsg ? 'system' : 'customer')
              newMsg.set('content', content)
              newMsg.set('channel', 'whatsapp')
              $app.save(newMsg)
            } catch (err) {
              $app
                .logger()
                .error('Failed to save conversation from WhatsApp webhook', 'error', String(err))
            }
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Error processing WhatsApp Webhook', 'error', String(err))
  }

  return e.string(200, 'EVENT_RECEIVED')
})

// Rota complementar com userId no path: POST /backend/v1/meta_whatsapp_webhook/{userId}
routerAdd('POST', '/backend/v1/meta_whatsapp_webhook/{userId}', (e) => {
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

  var userId = pathUserId || query['user_id'] || query['uid'] || ''

  $app
    .logger()
    .info(
      'Meta WhatsApp Webhook received (path userId)',
      'user_id',
      userId,
      'object',
      body ? body.object : '',
    )

  var user = null
  if (userId) {
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {}
  }

  if (!user && body && body.entry) {
    try {
      var receivedPhoneId = ''
      var receivedWabaId = body.entry[0] && body.entry[0].id ? String(body.entry[0].id) : ''

      for (var entryItem of body.entry || []) {
        for (var ch of entryItem.changes || []) {
          if (ch.value && ch.value.metadata && ch.value.metadata.phone_number_id) {
            receivedPhoneId = String(ch.value.metadata.phone_number_id)
            break
          }
        }
        if (receivedPhoneId) break
      }

      if (receivedPhoneId) {
        var usersByPhone = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_phone_number_id = {:pid}',
          'created',
          2,
          0,
          { pid: receivedPhoneId },
        )
        if (usersByPhone && usersByPhone.length > 0) {
          user = usersByPhone[0]
          userId = user.id
        }
      }

      if (!user && receivedWabaId) {
        var usersByWaba = $app.findRecordsByFilter(
          'users',
          'meta_whatsapp_business_id = {:bid}',
          'created',
          2,
          0,
          { bid: receivedWabaId },
        )
        if (usersByWaba && usersByWaba.length > 0) {
          user = usersByWaba[0]
          userId = user.id
        }
      }
    } catch (_) {}
  }

  if (!user) {
    try {
      var allActiveUsers = $app.findRecordsByFilter(
        'users',
        "meta_whatsapp_phone_number_id != '' || meta_whatsapp_verify_token != ''",
        'created',
        2,
        0,
      )
      if (allActiveUsers && allActiveUsers.length === 1) {
        user = allActiveUsers[0]
        userId = user.id
      }
    } catch (_) {}
  }

  if (!user) {
    return e.string(403, 'Forbidden: unable to resolve user for WhatsApp event')
  }

  if (!body || body.object !== 'whatsapp_business_account') {
    return e.string(404, 'Not Found')
  }

  // Helper para normalizar e resolver a origem do lead a partir de qualquer entrada (referral Meta, texto com tag, etc.)
  function resolveLeadOrigin(contentStr, referralObj, displayPhoneStr) {
    var detected = {
      label: '',
      notesEntry: '',
      originType: 'direto',
      rawText: contentStr || '',
      launchSlug: '',
    }

    var nowIso = new Date().toISOString()
    var nowBrStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    // 1. Referral nativo do Meta Click-to-WhatsApp
    if (referralObj) {
      var cName = (referralObj.campaign_name || referralObj.campaign || '').trim()
      var aName = (
        referralObj.ad_name ||
        referralObj.headline ||
        referralObj.source_id ||
        ''
      ).trim()
      var mRaw = (referralObj.media || referralObj.media_type || '').toLowerCase()
      if (!mRaw && referralObj.source_type && referralObj.source_type.toLowerCase() !== 'ad') {
        mRaw = referralObj.source_type.toLowerCase()
      }
      var mLabel = ''
      if (mRaw.indexOf('insta') !== -1) {
        mLabel = 'Instagram'
      } else if (mRaw.indexOf('face') !== -1) {
        mLabel = 'Facebook'
      } else if (mRaw) {
        mLabel = mRaw.charAt(0).toUpperCase() + mRaw.slice(1)
      }

      var parts = ['Anúncio Meta']
      if (mLabel) parts[0] = 'Anúncio Meta (' + mLabel + ')'
      if (cName) parts.push(cName)
      if (aName && aName !== cName) parts.push(aName)

      detected.label = parts.join(' — ')
      detected.originType = 'meta_ad'
      detected.notesEntry =
        '[Origem: Anúncio Meta — ' +
        (cName || 'Campanha') +
        ' — ' +
        (aName || 'Anúncio') +
        ', ' +
        nowBrStr +
        ']'
      if (referralObj.headline && referralObj.headline !== aName) {
        detected.notesEntry += ' (Headline: ' + referralObj.headline + ')'
      }
      if (referralObj.source_id) {
        detected.notesEntry += ' (Ad ID: ' + referralObj.source_id + ')'
      }
      return detected
    }

    // 2. Extração via mensagem pré-formatada (links rastreados, landing pages, QR codes, CTAs)
    var textLower = (contentStr || '').toLowerCase()

    // 2a. Padrão Landing Page pública: "landing page [slug]" ou "origem: landing page [slug]"
    var lpMatch =
      contentStr.match(/landing page\s+([a-z0-9\-_]+)/i) ||
      contentStr.match(/landing\s+page\s*[:-]\s*([a-z0-9\-_]+)/i)
    if (lpMatch && lpMatch[1]) {
      var slug = lpMatch[1].trim()
      detected.label = 'Landing Page — ' + slug
      detected.originType = 'landing_page'
      detected.launchSlug = slug
      detected.notesEntry = '[Origem: Landing Page ' + slug + ', ' + nowBrStr + ']'
      return detected
    }

    // 2b. Padrão explícito de parâmetro rastreado: "origem=[valor]", "origem: [valor]", "orig=[valor]"
    var originParamMatch = contentStr.match(
      /(?:origem|origin|src|utm_source)\s*[=:]\s*([a-z0-9\-_]+)/i,
    )
    if (originParamMatch && originParamMatch[1]) {
      var rawVal = originParamMatch[1].trim()
      var formattedLabel = rawVal

      if (rawVal.indexOf('google') !== -1) {
        formattedLabel = 'Google Ads — ' + rawVal
        detected.originType = 'google_ads'
      } else if (rawVal.indexOf('insta') !== -1) {
        formattedLabel = 'Instagram Orgânico — ' + rawVal
        detected.originType = 'instagram'
      } else if (rawVal.indexOf('meta') !== -1 || rawVal.indexOf('face') !== -1) {
        formattedLabel = 'Anúncio Meta — ' + rawVal
        detected.originType = 'meta_ad'
      } else if (rawVal.indexOf('remarketing') !== -1 || rawVal.indexOf('remkt') !== -1) {
        formattedLabel = 'Remarketing — ' + rawVal
        detected.originType = 'remarketing'
      } else if (rawVal.indexOf('site') !== -1 || rawVal.indexOf('portal') !== -1) {
        formattedLabel = 'Portal / Site — ' + rawVal
        detected.originType = 'portal'
      } else {
        formattedLabel = 'Link Rastreado — ' + rawVal
        detected.originType = 'tracked_link'
      }

      detected.label = formattedLabel
      detected.notesEntry = '[Origem: ' + formattedLabel + ', ' + nowBrStr + ']'
      return detected
    }

    // 2c. Detecção de menção nominal aos Lançamentos (ex: Villa dos Açores, etc.)
    if (
      textLower.indexOf('villa dos açores') !== -1 ||
      textLower.indexOf('villa dos acores') !== -1 ||
      textLower.indexOf('villa acores') !== -1
    ) {
      detected.label = 'Lançamento — villa-dos-acores'
      detected.originType = 'launch_direct'
      detected.launchSlug = 'villa-dos-acores'
      detected.notesEntry = '[Origem: Interesse em Villa dos Açores, ' + nowBrStr + ']'
      return detected
    }

    // 2d. Fallback obrigatório: nunca nulo/vazio. Se não tem rastreio nem anúncio, é WhatsApp Direto
    var directLabel = 'WhatsApp direto'
    if (displayPhoneStr) {
      directLabel += ' (' + displayPhoneStr + ')'
    }
    detected.label = directLabel
    detected.originType = 'direto'
    detected.notesEntry = '[Origem: ' + directLabel + ', ' + nowBrStr + ']'
    return detected
  }

  // Helper para atualizar histórico de origens mantendo deduplicação e acumulando lista cronológica
  function recordOriginOnCustomer(custRec, originInfo) {
    var nowIso = new Date().toISOString()
    var currentSource = custRec.getString('source') || ''

    var isNewHigherPriority =
      !currentSource ||
      currentSource.indexOf('WhatsApp direto') !== -1 ||
      currentSource.indexOf('Meta - WhatsApp') !== -1 ||
      originInfo.originType === 'meta_ad' ||
      originInfo.originType === 'landing_page' ||
      originInfo.originType === 'tracked_link' ||
      originInfo.originType === 'google_ads'

    if (isNewHigherPriority && originInfo.label) {
      custRec.set('source', originInfo.label)
    }

    custRec.set('last_origin', originInfo.label)
    custRec.set('last_origin_at', nowIso)

    // Atualiza notes se houver entrada nova e não repetida
    if (originInfo.notesEntry) {
      var curNotes = (custRec.getString('notes') || '').trim()
      if (!curNotes) {
        custRec.set('notes', originInfo.notesEntry)
      } else if (curNotes.indexOf(originInfo.notesEntry) === -1) {
        custRec.set('notes', curNotes + '\n' + originInfo.notesEntry)
      }
    }

    // Atualiza origin_history (Array de objetos)
    var hist = []
    try {
      var rawHist = custRec.get('origin_history')
      if (Array.isArray(rawHist)) {
        hist = rawHist.slice(0, 30)
      }
    } catch (_) {}

    var isDuplicateHist = false
    if (hist.length > 0) {
      var lastH = hist[hist.length - 1]
      if (lastH && lastH.source === originInfo.label) {
        isDuplicateHist = true
      }
    }

    if (!isDuplicateHist) {
      hist.push({
        source: originInfo.label,
        type: originInfo.originType,
        date: nowIso,
        launch_slug: originInfo.launchSlug || undefined,
      })
      custRec.set('origin_history', hist)
    }
  }

  try {
    for (var entry of body.entry || []) {
      for (var change of entry.changes || []) {
        var value = change.value
        if (!value || !value.messages || value.messages.length === 0) continue

        var contacts = value.contacts || []
        var metadata = value.metadata || {}
        var displayPhone = (metadata.display_phone_number || '').replace(/\D/g, '')

        for (var msg of value.messages) {
          var phone = (msg.from || '').replace(/\D/g, '')
          if (!phone) continue

          var content = ''
          if (msg.type === 'text' && msg.text && msg.text.body) {
            content = msg.text.body
          } else if (msg.type === 'audio' || msg.type === 'voice') {
            content = '[Áudio Recebido]'
            try {
              var mediaIdSecond = (msg.audio && msg.audio.id) || (msg.voice && msg.voice.id) || ''
              var waUserTokenSecond =
                (user && user.getString('meta_whatsapp_access_token')) ||
                (user && user.getString('meta_page_access_token')) ||
                ''
              if (!waUserTokenSecond) {
                try {
                  var tokenUsersSecond = $app.findRecordsByFilter(
                    'users',
                    "meta_whatsapp_access_token != ''",
                    '-created',
                    1,
                    0,
                  )
                  if (tokenUsersSecond.length > 0) {
                    waUserTokenSecond = tokenUsersSecond[0].getString('meta_whatsapp_access_token')
                  }
                } catch (_) {}
              }

              var openAiKeySecond = $os.getenv('OPENAI_API_KEY') || ''
              if (
                !openAiKeySecond &&
                typeof $secrets !== 'undefined' &&
                $secrets.has &&
                $secrets.has('OPENAI_API_KEY')
              ) {
                openAiKeySecond = $secrets.get('OPENAI_API_KEY') || ''
              }

              if (mediaIdSecond && waUserTokenSecond && openAiKeySecond) {
                var mediaMetaResSecond = $http.send({
                  url: 'https://graph.facebook.com/v21.0/' + mediaIdSecond,
                  method: 'GET',
                  headers: {
                    Authorization: 'Bearer ' + waUserTokenSecond,
                  },
                  timeout: 15,
                })

                var mediaDownloadUrlSecond =
                  mediaMetaResSecond && mediaMetaResSecond.json && mediaMetaResSecond.json.url
                    ? mediaMetaResSecond.json.url
                    : ''

                if (mediaDownloadUrlSecond) {
                  var mediaBinaryResSecond = $http.send({
                    url: mediaDownloadUrlSecond,
                    method: 'GET',
                    headers: {
                      Authorization: 'Bearer ' + waUserTokenSecond,
                    },
                    timeout: 25,
                  })

                  if (
                    mediaBinaryResSecond &&
                    mediaBinaryResSecond.statusCode === 200 &&
                    mediaBinaryResSecond.body &&
                    mediaBinaryResSecond.body.length > 0
                  ) {
                    var whisperBoundarySecond = '----BoundaryWhisper' + $security.randomString(16)
                    var partModelSecond =
                      '--' +
                      whisperBoundarySecond +
                      '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n'
                    var partLangSecond =
                      '--' +
                      whisperBoundarySecond +
                      '\r\nContent-Disposition: form-data; name="language"\r\n\r\npt\r\n'
                    var partFormatSecond =
                      '--' +
                      whisperBoundarySecond +
                      '\r\nContent-Disposition: form-data; name="response_format"\r\n\r\ntext\r\n'
                    var fileHeaderSecond =
                      '--' +
                      whisperBoundarySecond +
                      '\r\nContent-Disposition: form-data; name="file"; filename="audio.ogg"\r\nContent-Type: audio/ogg\r\n\r\n'
                    var whisperFooterSecond = '\r\n--' + whisperBoundarySecond + '--\r\n'

                    var partModelBytesSecond = new Uint8Array(partModelSecond.length)
                    for (var mi2 = 0; mi2 < partModelSecond.length; mi2++) {
                      partModelBytesSecond[mi2] = partModelSecond.charCodeAt(mi2)
                    }
                    var partLangBytesSecond = new Uint8Array(partLangSecond.length)
                    for (var li2 = 0; li2 < partLangSecond.length; li2++) {
                      partLangBytesSecond[li2] = partLangSecond.charCodeAt(li2)
                    }
                    var partFormatBytesSecond = new Uint8Array(partFormatSecond.length)
                    for (var fi2 = 0; fi2 < partFormatSecond.length; fi2++) {
                      partFormatBytesSecond[fi2] = partFormatSecond.charCodeAt(fi2)
                    }
                    var fileHeaderBytesSecond = new Uint8Array(fileHeaderSecond.length)
                    for (var hi2 = 0; hi2 < fileHeaderSecond.length; hi2++) {
                      fileHeaderBytesSecond[hi2] = fileHeaderSecond.charCodeAt(hi2)
                    }
                    var footerBytesSecond = new Uint8Array(whisperFooterSecond.length)
                    for (var foi2 = 0; foi2 < whisperFooterSecond.length; foi2++) {
                      footerBytesSecond[foi2] = whisperFooterSecond.charCodeAt(foi2)
                    }

                    var totalLenSecond =
                      partModelBytesSecond.length +
                      partLangBytesSecond.length +
                      partFormatBytesSecond.length +
                      fileHeaderBytesSecond.length +
                      mediaBinaryResSecond.body.length +
                      footerBytesSecond.length

                    var whisperPayloadBytesSecond = new Uint8Array(totalLenSecond)
                    var curOffsetSecond = 0
                    whisperPayloadBytesSecond.set(partModelBytesSecond, curOffsetSecond)
                    curOffsetSecond += partModelBytesSecond.length
                    whisperPayloadBytesSecond.set(partLangBytesSecond, curOffsetSecond)
                    curOffsetSecond += partLangBytesSecond.length
                    whisperPayloadBytesSecond.set(partFormatBytesSecond, curOffsetSecond)
                    curOffsetSecond += partFormatBytesSecond.length
                    whisperPayloadBytesSecond.set(fileHeaderBytesSecond, curOffsetSecond)
                    curOffsetSecond += fileHeaderBytesSecond.length
                    whisperPayloadBytesSecond.set(mediaBinaryResSecond.body, curOffsetSecond)
                    curOffsetSecond += mediaBinaryResSecond.body.length
                    whisperPayloadBytesSecond.set(footerBytesSecond, curOffsetSecond)

                    var whisperResSecond = $http.send({
                      url: 'https://api.openai.com/v1/audio/transcriptions',
                      method: 'POST',
                      headers: {
                        Authorization: 'Bearer ' + openAiKeySecond,
                        'Content-Type': 'multipart/form-data; boundary=' + whisperBoundarySecond,
                      },
                      body: whisperPayloadBytesSecond.buffer,
                      timeout: 30,
                    })

                    var transcriptionTextSecond = ''
                    if (whisperResSecond && whisperResSecond.statusCode === 200) {
                      if (whisperResSecond.json && whisperResSecond.json.text) {
                        transcriptionTextSecond = String(whisperResSecond.json.text).trim()
                      } else if (whisperResSecond.body) {
                        if (typeof whisperResSecond.body === 'string') {
                          transcriptionTextSecond = whisperResSecond.body.trim()
                        } else {
                          try {
                            transcriptionTextSecond = String.fromCharCode
                              .apply(null, whisperResSecond.body)
                              .trim()
                          } catch (_) {}
                        }
                      }
                    }

                    if (transcriptionTextSecond) {
                      content = '[Áudio do cliente]: "' + transcriptionTextSecond + '"'
                      try {
                        var logColOkSecond = $app.findCollectionByNameOrId('system_logs')
                        var okLogSecond = new Record(logColOkSecond)
                        okLogSecond.set('user_id', userId || '')
                        okLogSecond.set('type', 'audio_transcribed')
                        okLogSecond.set(
                          'message',
                          'Áudio de WhatsApp transcrito com sucesso via Whisper',
                        )
                        okLogSecond.set(
                          'details',
                          'Media ID: ' +
                            mediaIdSecond +
                            ' | Texto: ' +
                            transcriptionTextSecond.substring(0, 150),
                        )
                        okLogSecond.set('payload', {
                          phone: phone,
                          media_id: mediaIdSecond,
                          transcription: transcriptionTextSecond,
                        })
                        $app.saveNoValidate(okLogSecond)
                      } catch (_) {}
                    } else {
                      throw new Error(
                        'Whisper returned status ' +
                          (whisperResSecond ? whisperResSecond.statusCode : 'none') +
                          ' ' +
                          JSON.stringify(
                            (whisperResSecond &&
                              (whisperResSecond.json || whisperResSecond.body)) ||
                              '',
                          ),
                      )
                    }
                  } else {
                    throw new Error('Falha ao baixar binário do áudio da Meta')
                  }
                } else {
                  throw new Error('URL de download da mídia não encontrada na resposta da Meta')
                }
              } else {
                throw new Error(
                  'Credenciais ausentes para transcrição (mediaId=' +
                    !!mediaIdSecond +
                    ', waUserToken=' +
                    !!waUserTokenSecond +
                    ', openAiKey=' +
                    !!openAiKeySecond +
                    ')',
                )
              }
            } catch (audioTransErrSecond) {
              content = '[Áudio Recebido - não foi possível transcrever]'
              try {
                var logColFailSecond = $app.findCollectionByNameOrId('system_logs')
                var failLogSecond = new Record(logColFailSecond)
                failLogSecond.set('user_id', userId || '')
                failLogSecond.set('type', 'audio_transcription_failed')
                failLogSecond.set('message', 'Falha ao transcrever áudio recebido no WhatsApp')
                failLogSecond.set(
                  'details',
                  String(audioTransErrSecond.message || audioTransErrSecond),
                )
                failLogSecond.set('payload', {
                  phone: phone,
                  media_id: (msg.audio && msg.audio.id) || (msg.voice && msg.voice.id) || '',
                  error: String(audioTransErrSecond),
                })
                $app.saveNoValidate(failLogSecond)
              } catch (_) {}
            }
          } else if (msg.type === 'image' && msg.image && msg.image.caption) {
            content = msg.image.caption
          } else if (msg.type === 'button' && msg.button && msg.button.text) {
            content = msg.button.text
          } else if (msg.type === 'interactive' && msg.interactive) {
            var it = msg.interactive
            content =
              (it.button_reply && it.button_reply.title) ||
              (it.list_reply && it.list_reply.title) ||
              '[Interação Recebida]'
          } else {
            content = '[' + (msg.type || 'Mensagem') + ' Recebida]'
          }
          if (!content) continue

          var contactInfo = contacts.find(function (c) {
            return c.wa_id === msg.from
          })
          var contactName =
            (contactInfo && contactInfo.profile && contactInfo.profile.name) ||
            (contactInfo && contactInfo.wa_id) ||
            phone

          var referral = msg.referral || value.referral || null
          var originInfo = resolveLeadOrigin(content, referral, displayPhone)

          if (referral) {
            try {
              var logsCol = $app.findCollectionByNameOrId('system_logs')
              var adLog = new Record(logsCol)
              adLog.set('user_id', userId || '')
              adLog.set('type', 'ad_referral')
              adLog.set('message', 'Referral de anúncio Meta capturado: ' + originInfo.label)
              adLog.set('details', 'Origem resolvida: ' + originInfo.label + ' | Phone: ' + phone)
              adLog.set('payload', {
                phone: phone,
                contact_name: contactName,
                referral: referral,
                label: originInfo.label,
              })
              $app.saveNoValidate(adLog)
            } catch (logErr) {
              $app.logger().error('Failed to log ad_referral', 'error', String(logErr))
            }
          }

          var customer = null
          try {
            customer = $app.findFirstRecordByFilter(
              'customers',
              'phone ~ {:ph} || phone_1_value ~ {:ph}',
              { ph: phone },
            )
          } catch (_) {}

          var isNewCustomer = false
          if (!customer) {
            try {
              var customersCol = $app.findCollectionByNameOrId('customers')
              customer = new Record(customersCol)
              customer.set('user_id', userId)
              customer.set('name', contactName)
              customer.set('phone', phone)
              customer.set('status', 'Novo')

              recordOriginOnCustomer(customer, originInfo)

              $app.save(customer)
              isNewCustomer = true
            } catch (err) {
              $app
                .logger()
                .error('Failed to create customer from WhatsApp webhook', 'error', String(err))
              continue
            }
          } else {
            try {
              var custToUpdate = $app.findRecordById('customers', customer.id)
              if (!custToUpdate.getString('user_id')) {
                custToUpdate.set('user_id', userId)
              }

              recordOriginOnCustomer(custToUpdate, originInfo)

              $app.save(custToUpdate)
              customer = custToUpdate
            } catch (upErr) {
              $app
                .logger()
                .error('Failed to update customer origin history', 'error', String(upErr))
            }
          }

          if (isNewCustomer) {
            try {
              var leadsCol = $app.findCollectionByNameOrId('leads')
              var lead = new Record(leadsCol)
              lead.set('assigned_to', userId)
              lead.set('name', contactName)
              lead.set('phone', phone)
              lead.set('source', originInfo.label || 'WhatsApp Cloud API')
              lead.set('status', 'Novo')
              var leadNotes = 'Capturado via Meta WhatsApp Cloud API'
              if (displayPhone) leadNotes += ' (' + displayPhone + ')'
              leadNotes += '\nOrigem: ' + (originInfo.label || 'WhatsApp direto')
              leadNotes += '\nMensagem: ' + content
              lead.set('notes', leadNotes)
              $app.save(lead)
            } catch (err) {
              $app
                .logger()
                .error('Failed to create lead from WhatsApp webhook', 'error', String(err))
            }
          }

          var isDuplicate = false
          try {
            var recentMsgs = $app.findRecordsByFilter(
              'conversations',
              "customer_id = {:cid} && sender = 'customer' && content = {:text}",
              '-created',
              1,
              0,
              { cid: customer.id, text: content },
            )
            if (recentMsgs.length > 0) {
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

              var isSystemMsgSecond =
                phone === '447710173736' ||
                /\b(?:\d{4,8})\s+[ée]\s+o\s+teu\s+c[oó]digo/i.test(content) ||
                /(?:n[aã]o\s+o\s+partilhe|n[aã]o\s+compartilhe|don'?t\s+share)/i.test(content) ||
                /c[oó]digo\s+(?:do\s+instagram|do\s+whatsapp|do\s+facebook|da\s+meta)/i.test(
                  content,
                )

              newMsg.set('sender', isSystemMsgSecond ? 'system' : 'customer')
              newMsg.set('content', content)
              newMsg.set('channel', 'whatsapp')
              $app.save(newMsg)
            } catch (err) {
              $app
                .logger()
                .error('Failed to save conversation from WhatsApp webhook', 'error', String(err))
            }
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Error processing WhatsApp Webhook', 'error', String(err))
  }

  return e.string(200, 'EVENT_RECEIVED')
})
