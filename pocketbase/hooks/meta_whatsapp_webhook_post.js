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
          } else if (msg.type === 'audio') {
            content = '[Áudio Recebido]'
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
          } else if (msg.type === 'audio') {
            content = '[Áudio Recebido]'
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
