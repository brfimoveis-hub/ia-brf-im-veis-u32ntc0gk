onRecordAfterCreateSuccess((e) => {
  const sender = e.record.getString('sender')

  if (sender !== 'customer' && sender !== 'user' && sender !== 'lead') {
    return e.next()
  }

  function callMetaWithRetry(url, method, headers, bodyData, maxRetries = 3) {
    let attempt = 0
    let res = null
    const backoffs = [1000, 3000, 9000]
    while (attempt <= maxRetries) {
      try {
        res = $http.send({
          url,
          method,
          headers,
          body: bodyData,
          timeout: 20,
        })
        if (res && res.statusCode >= 200 && res.statusCode < 300) {
          return res
        }
        console.warn(
          `[AI_REPLY] Meta HTTP call non-2xx: url=${url} statusCode=${res ? res.statusCode : 'none'} response=${JSON.stringify(res ? res.json || res.body || '' : '')}`,
        )
      } catch (httpErr) {
        console.error(`[AI_REPLY] Meta HTTP send exception: url=${url} error=${String(httpErr)}`)
      }
      if (attempt < maxRetries) {
        const sleepMs = backoffs[attempt] || 9000
        const start = new Date().getTime()
        while (new Date().getTime() - start < sleepMs) {}
      }
      attempt++
    }

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const newLog = new Record(logsCol)
      newLog.set('type', 'api_failure')
      newLog.set('message', `Falha Meta API ou Externa (${url}) após ${maxRetries} tentativas.`)
      newLog.set(
        'payload',
        JSON.stringify({ statusCode: res ? res.statusCode : null, body: res ? res.json : null }),
      )
      $app.saveNoValidate(newLog)
    } catch (_) {}

    return res
  }

  let acquiredLock = false
  var matchedProps = []
  var detectedSpecificPropertyQuery = false
  var targetSpecificProp = null
  var hasFreeSearchIntent = false
  function isFreeSearchIntent(text) {
    if (!text || typeof text !== 'string') return false
    return /\b(?:pesquisar(?:\s+para\s+mim)?|buscar(?:\s+para\s+mim)?|procurar(?:\s+para\s+mim)?|fazenda|área\s+rural|area\s+rural|sítio|sitio|chácara|chacara|terreno|rural)\b/i.test(
      text,
    )
  }
  const customerId = e.record.getString('customer_id')
  const conversationChannel = e.record.getString('channel') || 'whatsapp'
  const incomingMsgId = e.record.id
  let userId = e.record.getString('user_id')

  // Horário oficial de Brasília (UTC-3) disponível em todos os escopos (incluindo o catch de erro)
  const now = new Date()
  const brTime = new Date(now.getTime() - 3 * 3600 * 1000)
  const brHour = brTime.getUTCHours()

  // Regra de saudação temporal (America/Sao_Paulo):
  // Bom dia até ~12h (0h..11h59), Boa tarde das 12h às 17h59, Boa noite a partir das 18h
  function getTemporalGreetingWord(hour) {
    const h = typeof hour === 'number' ? hour : brHour
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  function buildTemporalGreeting(name, hour) {
    const salutation = getTemporalGreetingWord(hour)
    if (name && name.trim()) {
      return `${salutation}, ${name.trim()}!`
    }
    return `${salutation}!`
  }

  console.log(
    `[AI_REPLY] Triggered for customer=${customerId} sender=${sender} channel=${conversationChannel} msgId=${incomingMsgId}`,
  )

  try {
    const customerInitialCheck = $app.findRecordById('customers', customerId)
    if (!userId) {
      userId = customerInitialCheck.getString('user_id') || ''
    }

    if (customerInitialCheck.get('is_blocked') === true) {
      console.log(`[AI_REPLY] Customer ${customerId} is blocked, skipping.`)
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const blockLog = new Record(logsCol)
        blockLog.set('user_id', userId || '')
        blockLog.set('type', 'ai_reply_skipped')
        blockLog.set('message', 'IA não respondeu: cliente bloqueado')
        blockLog.set('details', 'Customer is blocked. AI auto-reply skipped.')
        blockLog.set('payload', JSON.stringify({ customer_id: customerId }))
        $app.saveNoValidate(blockLog)
      } catch (_) {}
      return e.next()
    }

    // Detecção e bloqueio de automação/mensagens de sistema (código de verificação, SMS Meta/Instagram, etc.)
    const incomingText = (e.record.getString('content') || '').trim()
    const checkCustPhone = customerInitialCheck.getString('phone') || ''
    const checkCustName = customerInitialCheck.getString('name') || ''
    const isVerificationCodeMsg =
      /\b(?:\d{4,8})\s+[ée]\s+o\s+teu\s+c[oó]digo/i.test(incomingText) ||
      /\b(?:\d{4,8})\s+[ée]\s+o\s+seu\s+c[oó]digo/i.test(incomingText) ||
      /\b(?:\d{4,8})\s+is\s+your\s+(?:Instagram|Facebook|WhatsApp|Meta|security|verification)\s+code/i.test(
        incomingText,
      ) ||
      /(?:n[aã]o\s+o\s+partilhe|n[aã]o\s+compartilhe|do\s*not\s+share|don'?t\s+share|never\s+share)/i.test(
        incomingText,
      ) ||
      /c[oó]digo\s+(?:do\s+instagram|do\s+whatsapp|do\s+facebook|da\s+meta|de\s+confirma[cç][aã]o|de\s+verifica[cç][aã]o|de\s+seguran[cç]a)/i.test(
        incomingText,
      ) ||
      /^\s*\d{4,8}\s*[-:]?\s*(?:c[oó]digo|code|é o|is your)\b/i.test(incomingText) ||
      incomingText === '[unsupported Recebida]' ||
      incomingText.includes(
        'este número é exclusivo para comunicados e novidades, sem atendimento humano',
      )

    const isSystemSenderNumber =
      checkCustPhone.replace(/\D/g, '') === '447710173736' ||
      checkCustPhone === '+44 7710 173736' ||
      /^facebook\s+business$/i.test(checkCustName)

    if (isVerificationCodeMsg || isSystemSenderNumber) {
      console.log(
        `[AI_REPLY] Mensagem de verificação/sistema detectada para customer=${customerId}. Resposta automática cancelada.`,
      )
      return e.next()
    }

    // Lock acquisition with 180s TTL (3 min). Trava com now - lockTime >= 180000 é expirada e sobrescrita.
    // Tags sem timestamp (ai_processing legado) ou inválidas são expiradas imediatamente.
    const lockTtlMs = 180000
    try {
      $app.runInTransaction((txApp) => {
        const customer = txApp.findRecordById('customers', customerId)
        let rawTags = customer.get('tags')
        let tags = []
        if (Array.isArray(rawTags)) {
          tags = rawTags.filter((t) => typeof t === 'string')
        } else if (typeof rawTags === 'string') {
          try {
            const parsed = JSON.parse(rawTags)
            if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === 'string')
          } catch (_) {}
        }

        const nowMs = new Date().getTime()
        const lockPrefix = 'ai_processing:'
        let activeLock = false

        for (let i = 0; i < tags.length; i++) {
          const t = tags[i]
          if (t === 'ai_processing') {
            // Tag legada sem timestamp numérico trava para sempre -> considerar expirada e limpar
            activeLock = false
            break
          }
          if (t.startsWith(lockPrefix)) {
            const lockTimeStr = t.substring(lockPrefix.length)
            const lockTime = parseInt(lockTimeStr, 10)
            // Trava ativa apenas se tiver timestamp válido e não tiver completado 180.000ms (3 min)
            if (!isNaN(lockTime) && nowMs - lockTime < lockTtlMs) {
              activeLock = true
              break
            }
          }
        }

        // Se a trava estiver ativa há menos de 180s, respeitar rigorosamente a trava para evitar execuções paralelas concorrentes

        if (activeLock) {
          throw new Error('LOCKED')
        }

        const newTags = tags.filter((t) => t !== 'ai_processing' && !t.startsWith('ai_processing:'))
        newTags.push(`ai_processing:${nowMs}`)
        customer.set('tags', newTags)
        txApp.saveNoValidate(customer)
        acquiredLock = true
      })
    } catch (err) {
      if (err.message === 'LOCKED') {
        console.log(
          `[AI_REPLY] Customer ${customerId} already has active ai_processing lock (<180s), skipping.`,
        )
        return e.next()
      }
      console.error(`[AI_REPLY] Lock acquisition error for ${customerId}: ${String(err)}`)
      return e.next()
    }

    console.log(`[AI_REPLY] Lock acquired successfully for customer=${customerId}`)

    // Check if another message arrived and made this one obsolete
    try {
      const latestMsgs = $app.findRecordsByFilter(
        'conversations',
        `customer_id = '${customerId}'`,
        '-created',
        1,
        0,
      )
      if (latestMsgs.length > 0) {
        const lastMsg = latestMsgs[0]
        if (lastMsg.id !== incomingMsgId) {
          console.log(
            `[AI_REPLY] Skipping: incoming message ${incomingMsgId} is not the latest (latest=${lastMsg.id})`,
          )
          return e.next()
        }
        const lastSender = lastMsg.getString('sender')
        if (lastSender !== 'customer' && lastSender !== 'user' && lastSender !== 'lead') {
          console.log(`[AI_REPLY] Skipping: last sender is '${lastSender}'`)
          return e.next()
        }
      }
    } catch (err) {
      console.warn(`[AI_REPLY] Check latest message failed (non-fatal): ${String(err)}`)
    }

    let userRecord = null
    try {
      if (userId) {
        userRecord = $app.findRecordById('users', userId)
      }
    } catch (err) {
      console.warn(`[AI_REPLY] Could not load user ${userId}: ${String(err)}`)
    }

    if (!userRecord) {
      try {
        const fallbackUsers = $app.findRecordsByFilter(
          'users',
          "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
          '-created',
          1,
          0,
        )
        if (fallbackUsers.length > 0) {
          userRecord = fallbackUsers[0]
          userId = userRecord.id
          console.log(`[AI_REPLY] Resolved fallback user ${userId}`)
        }
      } catch (_) {}
    }

    const customer = $app.findRecordById('customers', customerId)
    let rawCustomerTags = customer.get('tags')
    let tags = []
    if (Array.isArray(rawCustomerTags)) {
      tags = rawCustomerTags.filter((t) => typeof t === 'string')
    }
    const customerPhone = customer.getString('phone') || ''
    const customerSource = customer.getString('source') || ''
    const customerLastOrigin = (customer.getString('last_origin') || '').trim()
    const customerNotes = (customer.getString('notes') || '').trim()
    const effectiveOrigin = customerLastOrigin || customerSource || ''
    const isAdReferral =
      effectiveOrigin.toLowerCase().includes('anúncio') ||
      effectiveOrigin.toLowerCase().includes('anuncio') ||
      customerSource.toLowerCase().includes('anúncio') ||
      customerSource.toLowerCase().includes('anuncio') ||
      customerNotes.toLowerCase().includes('origem: anúncio') ||
      customerNotes.toLowerCase().includes('origem: anuncio')

    // PRE-DETECÇÃO DE DESENCAIXE IMPLÍCITO OU IMÓVEL ESPECÍFICO NA ÚLTIMA MENSAGEM DO LEAD (MÁXIMA PRIORIDADE):
    const incomingCustMsgText = (e.record.getString('content') || '').trim()
    let isMismatchDetected = false
    let isCustomerExplicitRejection = false
    let lastMsgSpecificPropertyRequested = false
    let lastMsgPropertyCodeOrNum = ''
    let isShortContinuationMsg = false

    // Função utilitária para extrair código explícito de imóvel no texto
    // Retorna { fullCode: "AP343", numOnly: "343" } ou null
    function extractExplicitPropertyCode(txt) {
      if (!txt || typeof txt !== 'string') return null
      const cleaned = txt.trim()
      if (!cleaned) return null

      // 1. Slug de URL do site brfimoveis (ex: brfimoveis.com.br/343/..., /343/)
      const urlMatch = cleaned.match(/(?:brfimoveis\.com\.br\/|\/)(\d{1,6})\b/i)
      if (urlMatch && urlMatch[1]) {
        return { fullCode: urlMatch[1], numOnly: urlMatch[1] }
      }

      // 2. Hashtag com código ou número (ex: #AP343, #ap 343, #343, #ARU341, #341)
      const hashMatch = cleaned.match(/#\s*([a-zA-Z]{0,4})\s*(\d{2,5})\b/i)
      if (hashMatch && hashMatch[2]) {
        const prefix = (hashMatch[1] || '').toUpperCase()
        const numOnly = hashMatch[2]
        return { fullCode: prefix ? `${prefix}${numOnly}` : numOnly, numOnly: numOnly }
      }

      // 3. Código padrão com prefixo real (ex: AP 343, AP343, ap 343, ARU 341, LM-344, CS 331, TR 338, COB 290)
      const codeMatch = cleaned.match(/\b(AP|LM|CS|TR|ARU|COB|BRF)[-_\s]*(\d{2,5})\b/i)
      if (codeMatch && codeMatch[2]) {
        const prefix = codeMatch[1].toUpperCase()
        const numOnly = codeMatch[2]
        return { fullCode: `${prefix}${numOnly}`, numOnly: numOnly }
      }

      // 4. Termo com contexto imobiliário (ex: "imóvel 343", "apartamento 343", "código 343", "apto 343", "ref 343")
      const numWithContext = cleaned.match(
        /(?:im[oó]vel|imovel|apartamento|apto|fazenda|casa|terreno|c[oó]digo|codigo|cod|ref)\s*#?\s*([a-zA-Z]{0,4})\s*(\d{2,5})\b/i,
      )
      if (numWithContext && numWithContext[2]) {
        const prefix = (numWithContext[1] || '').toUpperCase()
        const numOnly = numWithContext[2]
        return { fullCode: prefix ? `${prefix}${numOnly}` : numOnly, numOnly: numOnly }
      }

      // 5. Número isolado explícito de imóvel no texto (ex: "343", "o 343", "e o 343", "informações do 343")
      // Ignora anos correntes ou valores arredondados genéricos
      const bareNumMatch = cleaned.match(/\b(\d{3,4})\b/)
      if (
        bareNumMatch &&
        bareNumMatch[1] &&
        bareNumMatch[1] !== '2024' &&
        bareNumMatch[1] !== '2025' &&
        bareNumMatch[1] !== '2026' &&
        bareNumMatch[1] !== '500' &&
        bareNumMatch[1] !== '100' &&
        bareNumMatch[1] !== '200'
      ) {
        return { fullCode: bareNumMatch[1], numOnly: bareNumMatch[1] }
      }

      return null
    }

    // ITEM 6: ANTI-INSISTÊNCIA — Detecção de recusa/frustração do cliente
    if (incomingCustMsgText) {
      const refusalRegex =
        /\b(?:n[aã]o\s+é\s+nada\s+disso|n[aã]o\s+e\s+nada\s+disso|n[aã]o\s+[eé]\s+isso|n[aã]o\s+era\s+isso|voc[eê]\s+est[aá]\s+doida|voc[eê]\s+t[aá]\s+doida|t[aá]\s+me\s+fazendo\s+de\s+ot[aá]rio|t[aá]\s+me\s+fazendo\s+de\s+trouxa|est[aá]\s+me\s+fazendo\s+de\s+ot[aá]rio|parece\s+que\s+n[aã]o|estamos\s+falando\s+do\s+mesmo\s+im[oó]vel|n[aã]o\s+foi\s+isso(?:\s+que\s+eu\s+pedi)?|est[aá]\s+confundindo|est[aá]\s+me\s+confundindo|t[aá]\s+confundindo|t[aá]\s+me\s+confundindo|confundiu|n[aã]o\s+pedi\s+isso|n[aã]o\s+quero\s+esse|n[aã]o\s+é\s+esse|n[aã]o\s+e\s+esse|voc[eê]\s+trocou\s+de\s+im[oó]vel|trocou\s+o\s+im[oó]vel|im[oó]vel\s+errado)\b/i
      if (refusalRegex.test(incomingCustMsgText)) {
        isMismatchDetected = true
        isCustomerExplicitRejection = true
        console.log(
          `[AI_REPLY] [ANTI-INSISTÊNCIA] Recusa/frustração explícita detectada para lead ${customerId}: "${incomingCustMsgText}".`,
        )
      }
    }

    // CORREÇÃO 2 — DETECÇÃO DE MENSAGENS CURTAS DE CONTINUIDADE
    isShortContinuationMsg = (() => {
      if (!incomingCustMsgText) return false
      const cleanMsg = incomingCustMsgText
        .trim()
        .toLowerCase()
        .replace(/[.!?,;:\-_~]+/g, '')
      if (cleanMsg.length <= 4) {
        if (/^(ok|sim|s|ta|tá|manda|ver|bom|oi|ola|olá|bora)$/.test(cleanMsg)) return true
      }
      return (
        /^(aguardando|pois n[aã]o|pode mandar|pode mandar aqui|pode enviar|pode mandar por aqui|manda a[ií]|manda bala|manda ver|ebuk e tabela|e-?book e tabela|quero o e-?book|tabela e e-?book|quero a tabela|manda a tabela|mande a tabela|pode mandar a tabela|estou aguardando|no aguardo|com certeza|perfeito|combinado|show|beleza|tudo bem|vamos l[aá]|pode ser|claro)$/i.test(
          cleanMsg,
        ) ||
        (/\b(?:ebuk|ebook|e-book)\b/i.test(cleanMsg) && cleanMsg.length <= 25)
      )
    })()

    // ITEM 1: FOCO DEFINITIVO — Se a última mensagem contém código explícito, extrair com prioridade absoluta
    if (incomingCustMsgText) {
      const directCodeFound = extractExplicitPropertyCode(incomingCustMsgText)
      if (directCodeFound) {
        lastMsgSpecificPropertyRequested = true
        lastMsgPropertyCodeOrNum = directCodeFound.fullCode
        // Se a mensagem trouxe código explícito novo, ela re-alinha a conversa e supera recusa anterior
        isMismatchDetected = false
        console.log(
          `[AI_REPLY] [FOCO EXPLÍCITO DETECTADO] Código "${directCodeFound.fullCode}" (num=${directCodeFound.numOnly}) encontrado na mensagem atual do lead.`,
        )
      }
    }

    // Procura por Dossiê de Lançamento publicado compatível (launches com status='publicado')
    // SÓ vincula se a última mensagem do lead NÃO for sobre um imóvel específico diferente
    let matchedLaunch = null
    if (!lastMsgSpecificPropertyRequested) {
      try {
        const publishedLaunches = $app.findRecordsByFilter(
          'launches',
          "status = 'publicado'",
          '-created',
          50,
          0,
        )
        const referralSearchText =
          `${effectiveOrigin} ${customerSource} ${customerNotes} ${conversationChannel || ''}`.toLowerCase()

        for (const lItem of publishedLaunches) {
          const lName = (lItem.getString('name') || '').toLowerCase()
          const lSlug = (lItem.getString('slug') || '').toLowerCase()
          const lEnterprise = (lItem.getString('enterprise_name') || '').toLowerCase()

          let keywords = lItem.get('keywords')
          if (typeof keywords === 'string') {
            try {
              keywords = JSON.parse(keywords)
            } catch (_) {
              keywords = [keywords]
            }
          }

          const matchTerms = [lName, lSlug, lEnterprise]
          if (Array.isArray(keywords)) {
            for (let kwIdx = 0; kwIdx < keywords.length; kwIdx++) {
              matchTerms.push(keywords[kwIdx])
            }
          }

          const hasMatch = matchTerms.some((term) => {
            if (!term || typeof term !== 'string') return false
            const t = term.trim().toLowerCase()
            return t.length > 2 && referralSearchText.includes(t)
          })

          if (hasMatch) {
            matchedLaunch = lItem
            console.log(
              `[AI_REPLY] Matched published launch dossier: "${lItem.getString('name')}" (slug=${lSlug}, id=${lItem.id}) for customer=${customerId}`,
            )
            break
          }
        }
      } catch (launchErr) {
        console.warn(
          `[AI_REPLY] Error checking published launches (non-fatal): ${String(launchErr)}`,
        )
      }
    } else {
      console.log(
        `[AI_REPLY] Lead requested specific property (${lastMsgPropertyCodeOrNum}) in latest message. Suppressing historical matchedLaunch dossier to prevent cross-contamination.`,
      )
    }

    // Procura por Playbook de Anúncio ativo compatível (ad_playbooks)
    // SÓ vincula se a última mensagem do lead NÃO for sobre um imóvel específico diferente
    let matchedPlaybook = null
    if (!lastMsgSpecificPropertyRequested) {
      try {
        const activePlaybooks = $app.findRecordsByFilter(
          'ad_playbooks',
          'active = true',
          '-created',
          50,
          0,
        )
        const referralSearchText =
          `${effectiveOrigin} ${customerSource} ${customerNotes}`.toLowerCase()

        for (const pbItem of activePlaybooks) {
          let keywords = pbItem.get('match_keywords')
          if (typeof keywords === 'string') {
            try {
              keywords = JSON.parse(keywords)
            } catch (_) {
              keywords = [keywords]
            }
          }
          if (Array.isArray(keywords)) {
            const hasMatch = keywords.some((kw) => {
              if (!kw || typeof kw !== 'string') return false
              const trimmedKw = kw.trim().toLowerCase()
              return trimmedKw.length > 0 && referralSearchText.includes(trimmedKw)
            })
            if (hasMatch) {
              matchedPlaybook = pbItem
              console.log(
                `[AI_REPLY] Matched ad playbook: "${pbItem.getString('name')}" (id=${pbItem.id}) for customer=${customerId}`,
              )
              break
            }
          }
        }
      } catch (pbErr) {
        console.warn(`[AI_REPLY] Error checking ad_playbooks (non-fatal): ${String(pbErr)}`)
      }
    } else {
      console.log(
        `[AI_REPLY] Lead requested specific property (${lastMsgPropertyCodeOrNum}) in latest message. Suppressing historical ad_playbook to prevent cross-contamination.`,
      )
    }
    const customerName = (customer.getString('name') || '').trim()
    const customerFirstName = (customer.getString('first_name') || '').trim()

    // Validação estrita do nome do cliente:
    // Extrai o primeiro nome real do lead a partir de customer first_name ou name.
    // "Mauro Maurício" vira "Mauro" (jamais string vazia ou descarte).
    // Se parecer suspeito, incompleto, telefone, e-mail ou não confiável, retorna vazio.
    function cleanAndValidateLeadName(firstName, fullName) {
      const candidate = (firstName || '').trim() || (fullName || '').trim()
      if (!candidate) return ''

      // Ignora telefones, números, símbolos ou formatos de contato
      if (candidate.includes('+') || candidate.includes('@') || /^\d+$/.test(candidate)) return ''
      if (
        /^(lead|cliente|contato|teste|whatsapp|meta|novo|usuario|usuário|imóvel|imovel)\b/i.test(
          candidate,
        )
      )
        return ''

      // Se for apenas o primeiro nome
      const parts = candidate.split(/\s+/).filter(Boolean)
      const firstPart = parts[0]

      // Se o primeiro nome tem menos de 2 letras ou contém caracteres especiais estranhos
      if (!firstPart || firstPart.length < 2 || /[0-9_#\*\/\\]/.test(firstPart)) return ''

      // Capitalização bonita do primeiro nome
      return firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()
    }

    let displayName = cleanAndValidateLeadName(customerFirstName, customerName)

    let receiverPhone = ''
    const sourceMatch = customerSource.match(/Meta\s*-\s*(\d+)/)
    if (sourceMatch) {
      receiverPhone = sourceMatch[1]
    } else if (customerPhone.includes('48992098050') || customerSource.includes('48992098050')) {
      receiverPhone = '48992098050'
    } else if (customerPhone.includes('48991828050') || customerSource.includes('48991828050')) {
      receiverPhone = '48991828050'
    }
    const isTargetLead =
      customerPhone.includes('48992098050') ||
      customerPhone.includes('4899728050') ||
      customerPhone.includes('99728050') ||
      customerSource.includes('48992098050') ||
      customerSource.includes('4899728050')

    const deliveryEnabled = userRecord ? userRecord.get('delivery_enabled') !== false : true
    const deliveryStart = userRecord
      ? userRecord.getString('delivery_start_time') || '09:00'
      : '09:00'
    const deliveryEnd = userRecord ? userRecord.getString('delivery_end_time') || '18:00' : '18:00'
    let deliveryDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    if (userRecord && userRecord.get('delivery_days')) {
      try {
        const parsed = userRecord.get('delivery_days')
        if (Array.isArray(parsed) && parsed.length > 0) deliveryDays = parsed
      } catch (_) {}
    }

    const dayOfWeek = brTime.getUTCDay()
    const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = daysMap[dayOfWeek]

    let hoursStr = brHour.toString()
    if (hoursStr.length < 2) hoursStr = '0' + hoursStr
    let minutesStr = brTime.getUTCMinutes().toString()
    if (minutesStr.length < 2) minutesStr = '0' + minutesStr
    const currentTimeStr = `${hoursStr}:${minutesStr}`

    if (!deliveryEnabled) {
      console.log(`[AI_REPLY] Message deferred: delivery disabled for user ${userId}`)
      return e.next()
    }

    const isWhatsAppDirect = conversationChannel === 'whatsapp' || !conversationChannel
    const is24_7Flow = receiverPhone.includes('992098050') || isTargetLead || isWhatsAppDirect

    if (!is24_7Flow) {
      if (
        !deliveryDays.includes(currentDay) ||
        currentTimeStr < deliveryStart ||
        currentTimeStr > deliveryEnd
      ) {
        console.log(`[AI_REPLY] Message deferred: outside business hours (${currentTimeStr})`)
        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const log = new Record(logsCol)
          log.set('user_id', userId || '')
          log.set('type', 'ai_reply_deferred')
          log.set('message', 'IA adiada: fora do horário de atendimento')
          log.set(
            'details',
            `Horário atual: ${currentTimeStr}, expediente: ${deliveryStart}-${deliveryEnd}`,
          )
          log.set('payload', JSON.stringify({ customer_id: customerId }))
          $app.saveNoValidate(log)
        } catch (_) {}
        return e.next()
      }
    }

    // Variáveis hoistadas no topo do hook para evitar ReferenceError em Goja
    matchedProps = []
    detectedSpecificPropertyQuery = false
    targetSpecificProp = null
    hasFreeSearchIntent = false

    // Anti-flood com DEBOUNCE ACUMULATIVO (remover descarte silencioso <5s).
    // Caso real: se nova mensagem do lead chega logo após resposta da IA ou em sequência,
    // jamais descartar com return e.next(). Buscar mensagens do lead dos últimos 30s,
    // concatenar o conteúdo e processar o conjunto priorizando a mensagem mais recente.
    let customerMessage = (e.record.getString('content') || '').trim()
    try {
      const thirtySecondsAgoIso = new Date(now.getTime() - 30000)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19)
      const recentCustMsgs = $app.findRecordsByFilter(
        'conversations',
        `customer_id = '${customerId}' && (sender = 'customer' || sender = 'user' || sender = 'lead') && created >= '${thirtySecondsAgoIso}'`,
        'created',
        20,
        0,
      )
      if (recentCustMsgs && recentCustMsgs.length > 1) {
        const aggregatedParts = []
        for (let i = 0; i < recentCustMsgs.length; i++) {
          const mTxt = (recentCustMsgs[i].getString('content') || '').trim()
          if (mTxt && aggregatedParts.indexOf(mTxt) === -1) {
            aggregatedParts.push(mTxt)
          }
        }
        if (aggregatedParts.length > 1) {
          // Processar conjunto priorizando a mais recente no final
          customerMessage = aggregatedParts.join(' | ')
          console.log(
            `[AI_REPLY] Anti-flood debounce acumulativo ativado (30s): agrupadas ${aggregatedParts.length} mensagens para customer ${customerId}: "${customerMessage.substring(0, 100)}"`,
          )
        }
      }
    } catch (debounceErr) {
      console.warn(`[AI_REPLY] Debounce check warning (non-fatal): ${String(debounceErr)}`)
    }

    if (tags.includes('ai_paused')) {
      console.log(`[AI_REPLY] AI paused for customer ${customerId}`)
      return e.next()
    }

    const aiName = userRecord ? userRecord.getString('ai_name') || 'Bia' : 'Bia'
    const biaInstructions = userRecord ? userRecord.getString('bia_instructions') : ''
    const motherAiInstructions = userRecord ? userRecord.getString('ai_instructions') : ''

    // Carregar Caderno de Aprendizados da Bia (regras permanentes ativas do curador/Mauro - Prioridade desc: Constituição v3 = 500, foco total no imóvel = 200)
    let biaLearningsText = ''
    try {
      const activeLearnings = $app.findRecordsByFilter(
        'bia_learnings',
        'is_active = true',
        '-priority,-created',
        50,
        0,
      )
      if (activeLearnings && activeLearnings.length > 0) {
        biaLearningsText =
          '\n### REGRAS PERMANENTES DO CURADOR (CADERNO DE APRENDIZADOS DA BIA - SIGA SEMPRE):\n' +
          activeLearnings
            .map((rec, idx) => {
              const rTitle = (rec.getString('title') || '').trim()
              const rText = (rec.getString('rule_text') || '').trim()
              const rAuthor = (rec.getString('author') || 'Mauro').trim()
              const rPriority = rec.getInt('priority') || 0
              return `${idx + 1}. [${rTitle || 'Regra Permanente'}] (Prioridade ${rPriority} - Curador: ${rAuthor}): ${rText}`
            })
            .join('\n\n')
      }
    } catch (learningsErr) {
      console.warn(`[AI_REPLY] Error loading bia_learnings (non-fatal): ${String(learningsErr)}`)
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const learnErrLog = new Record(logsCol)
        learnErrLog.set('user_id', userId || '')
        learnErrLog.set('type', 'bia_learnings_lookup_error')
        learnErrLog.set('message', 'Erro não-fatal ao carregar bia_learnings')
        learnErrLog.set('details', String(learningsErr))
        $app.saveNoValidate(learnErrLog)
      } catch (_) {}
    }

    // Clean persona, mother and cadence instructions from canned loop phrase with unicode / hyphen tolerance
    const cleanInstructionText = (txt) => {
      if (!txt) return ''
      return txt
        .replace(/3\.\s*Gestão de Interrupções:.*?\(Retorno à Cadência 2\)\.?/gi, '')
        .replace(
          /1\.\s*GESTÃO DE INTERRUPÇÕES\s*[\u2010-\u2015\-—].*?sem confrontar o cliente\.?/gi,
          '',
        )
        .replace(
          /responda\s+(?:EXATAMENTE\s*:\s*)?["'“«]Com certeza,\s*vou te passar os valores agora mesmo.*?["'”»]/gi,
          'apresente os imóveis e valores do catálogo imediatamente com os links oficiais.',
        )
        .replace(
          /Com certeza,\s*vou te passar os valores agora mesmo[.\s]*Apenas para eu te enviar a unidade com o melhor custo[\u2010-\u2015\-]benefício para o seu perfil,?\s*o que é mais importante para você além do valor\??/gi,
          'Apresente os imóveis e valores reais do catálogo imediatamente com os links oficiais.',
        )
    }

    const defaultBiaPersonaFallback = `Você é a Bia, consultora da BRF Imóveis (www.brfimoveis.com.br).
Sua missão e conduta são regidas EXCLUSIVAMENTE pelo TEXTO ÚNICO DA BIA — v2.0 gravado no Caderno de Aprendizados (bia_learnings prioridade máxima).`

    const personaInstructions = cleanInstructionText(
      biaInstructions.trim() ? biaInstructions : defaultBiaPersonaFallback,
    )
    const cleanMotherAiInstructions = cleanInstructionText(motherAiInstructions)

    if (!customerMessage) {
      customerMessage = (e.record.getString('content') || '').trim()
    }

    // O contextText e as instruções de comportamento vêm exclusivamente do bia_learnings ativo (TEXTO ÚNICO DA BIA - v2.0)
    let contextText = ''

    let historyRecords = []
    let fullCustomerHistory = []
    try {
      // Carrega até 40 mensagens do histórico para extrair dados consolidados e evitar loops
      fullCustomerHistory = $app.findRecordsByFilter(
        'conversations',
        `customer_id = '${customerId}'`,
        '-created',
        40,
        0,
      )
      fullCustomerHistory.reverse()
      // Mantém as últimas 12 no contexto direto de chat
      historyRecords = fullCustomerHistory.slice(-12)
    } catch (_) {}

    // ======================================================================
    // EXTRAÇÃO E CONSOLIDAÇÃO DE DADOS JÁ RESPONDIDOS PELO LEAD (ANTI-LOOP)
    // ======================================================================
    const collectedLeadData = {
      name: '',
      purpose: '', // compra / venda / locação / permuta
      payment: '', // à vista / financiamento / FGTS
      typology: '', // casa / apto / studio / dormitórios / suítes
      location: '', // bairro / cidade
      priceRange: '', // faixa de preço
      specificPropertyInterests: [], // links ou referências de imóveis específicos do anúncio/portal
    }

    // Inicializa com dados já existentes no registro do customer
    const existingCustName = customer.getString('name') || customer.getString('first_name') || ''
    if (existingCustName && !existingCustName.includes('+') && !/^\d+$/.test(existingCustName)) {
      const cleaned = cleanAndValidateLeadName('', existingCustName)
      if (cleaned) collectedLeadData.name = cleaned
    }
    if (customer.getString('price_range')) {
      collectedLeadData.priceRange = customer.getString('price_range')
    }
    if (customer.getString('neighborhood')) {
      collectedLeadData.location = customer.getString('neighborhood')
    }

    // Varrer mensagens do cliente no histórico completo para extrair dados fornecidos
    try {
      const allCustMsgs = (fullCustomerHistory.length > 0 ? fullCustomerHistory : historyRecords)
        .filter((m) => {
          const s = m.getString('sender')
          return s === 'customer' || s === 'user' || s === 'lead'
        })
        .map((m) => (m.getString('content') || '').trim())

      // Inclui também a mensagem atual
      if (customerMessage && !allCustMsgs.includes(customerMessage.trim())) {
        allCustMsgs.push(customerMessage.trim())
      }

      for (const text of allCustMsgs) {
        const lower = text.toLowerCase()

        // 1. Nome do lead (ex: "me chamo Marcia mendes", "sou a Marcia", "meu nome é Marcia", ou resposta curta "Marcia")
        const nameMatch = text.match(
          /(?:me\s+chamo|meu\s+nome\s+[ée]|sou\s+(?:o|a)?)\s+([A-Za-zÀ-ÿ]{2,25}(?:\s+[A-Za-zÀ-ÿ]{2,25})*)/i,
        )
        if (nameMatch && nameMatch[1]) {
          const cand = nameMatch[1].trim()
          const valid = cleanAndValidateLeadName('', cand)
          if (valid) {
            collectedLeadData.name = valid
            try {
              const fName = valid.split(' ')[0]
              if (
                fName &&
                fName.length > 1 &&
                (!customer.getString('name') ||
                  customer.getString('name').includes('❤️') ||
                  customer.getString('name').startsWith('+'))
              ) {
                customer.set('name', valid)
                customer.set('first_name', fName)
                $app.saveNoValidate(customer)
              }
            } catch (_) {}
          }
        } else if (!collectedLeadData.name && /^[A-Za-zÀ-ÿ]{2,18}$/.test(text.trim())) {
          // Se for resposta de uma palavra que seja um nome válido
          const word = text.trim()
          if (
            !/^(sim|nao|não|quero|ok|ola|olá|bom|boa|casa|apto|vista|compra|venda)$/i.test(word)
          ) {
            const valid = cleanAndValidateLeadName('', word)
            if (valid) {
              collectedLeadData.name = valid
              try {
                const fName = valid.split(' ')[0]
                if (
                  fName &&
                  fName.length > 1 &&
                  (!customer.getString('name') ||
                    customer.getString('name').includes('❤️') ||
                    customer.getString('name').startsWith('+'))
                ) {
                  customer.set('name', valid)
                  customer.set('first_name', fName)
                  $app.saveNoValidate(customer)
                }
              } catch (_) {}
            }
          }
        }

        // 2. Finalidade e Perfil do Lead (Compra, Investimento vs Moradia, Venda, Permuta, Aluguel)
        if (
          lower.includes('investir') ||
          lower.includes('investimento') ||
          lower.includes('para investimento') ||
          lower.includes('pra investimento') ||
          lower.includes('rentabilidade') ||
          lower.includes('revenda') ||
          lower.includes('locacao por temporada') ||
          lower.includes('locação por temporada') ||
          lower.includes('airbnb')
        ) {
          collectedLeadData.purpose = 'Compra para Investimento'
          collectedLeadData.profile = 'Investidor'
          // Atualiza automaticamente no customer no banco se ainda não estiver gravado
          try {
            if (customer.getString('lead_profile') !== 'Investidor') {
              customer.set('lead_profile', 'Investidor')
              $app.saveNoValidate(customer)
              console.log(
                `[AI_REPLY] Atualizado lead_profile para "Investidor" para o cliente ${customerId} com base na mensagem do lead`,
              )
            }
          } catch (_) {}
        } else if (
          lower.includes('morar') ||
          lower.includes('moradia') ||
          lower.includes('minha família') ||
          lower.includes('minha familia') ||
          lower.includes('para morar') ||
          lower.includes('pra morar')
        ) {
          collectedLeadData.purpose = 'Compra para Moradia'
          collectedLeadData.profile = 'Morador'
          try {
            if (
              customer.getString('lead_profile') !== 'Morador' &&
              !customer.getString('lead_profile')
            ) {
              customer.set('lead_profile', 'Morador')
              $app.saveNoValidate(customer)
            }
          } catch (_) {}
        } else if (
          lower.includes('compra') ||
          lower.includes('comprar') ||
          lower.includes('adquirir')
        ) {
          collectedLeadData.purpose = 'Compra'
        } else if (
          lower.includes('venda') ||
          lower.includes('vender') ||
          lower.includes('anunciar')
        ) {
          collectedLeadData.purpose = 'Venda de imóvel próprio'
        } else if (lower.includes('permuta') || lower.includes('troca')) {
          collectedLeadData.purpose = 'Permuta / Troca'
        } else if (
          lower.includes('aluguel') ||
          lower.includes('locação') ||
          lower.includes('locacao')
        ) {
          collectedLeadData.purpose = 'Locação / Aluguel'
        }

        // 3. Pagamento (à vista, financiamento, carta de crédito, FGTS)
        if (
          /\b(a\s+vista|[aà]\s*vista|recursos\s+pr[oó]prios|dinheiro)\b/i.test(lower) ||
          lower.includes('pagar a vista') ||
          lower.includes('pagar à vista') ||
          lower.includes('vou pagar a vista') ||
          lower.includes('vou pagar à vista')
        ) {
          collectedLeadData.payment = 'À vista (recursos próprios)'
        } else if (
          /\b(financiad[ao]|financiamento|financiar|carta\s+de\s+cr[eé]dito|fgts|banco|caixa|itau|bradesco|santander)\b/i.test(
            lower,
          )
        ) {
          collectedLeadData.payment = 'Financiamento bancário'
          if (lower.includes('fgts')) {
            collectedLeadData.payment += ' (com uso de FGTS)'
          }
        }

        // 4. Tipologia e dormitórios (casa, apartamento, cobertura, suítes, dorms)
        let typologyParts = []
        if (lower.includes('casa')) typologyParts.push('Casa')
        if (lower.includes('apartamento') || lower.includes('apto'))
          typologyParts.push('Apartamento')
        if (lower.includes('sobrado')) typologyParts.push('Sobrado')
        if (lower.includes('cobertura')) typologyParts.push('Cobertura')
        if (lower.includes('studio') || lower.includes('kitnet')) typologyParts.push('Studio')

        const suiteMatch =
          text.match(/(\d+)\s*su[ií]tes?/i) ||
          (/tr[eê]s\s+su[ií]tes?/i.test(lower) ? [null, '3'] : null) ||
          (/duas\s+su[ií]tes?/i.test(lower) ? [null, '2'] : null)
        if (suiteMatch) {
          typologyParts.push(`${suiteMatch[1]} suíte(s)`)
        }

        const dormMatch =
          text.match(/(\d+)\s*(?:dormit[oó]rios?|quartos?|dorms?)/i) ||
          (/tr[eê]s\s+(?:dorm|quarto)/i.test(lower) ? [null, '3'] : null) ||
          (/dois\s+(?:dorm|quarto)/i.test(lower) ? [null, '2'] : null)
        if (dormMatch && !suiteMatch) {
          typologyParts.push(`${dormMatch[1]} dormitório(s)`)
        }

        if (typologyParts.length > 0) {
          const currentTypo = typologyParts.join(', ')
          // Prefere descrições mais completas (ex: "Casa, 3 suíte(s)")
          if (
            !collectedLeadData.typology ||
            currentTypo.length >= collectedLeadData.typology.length
          ) {
            collectedLeadData.typology = currentTypo
          }
        }

        // 5. Localização / Bairro
        if (lower.includes('ingleses'))
          collectedLeadData.location = 'Ingleses do Rio Vermelho, Florianópolis'
        else if (lower.includes('canasvieiras'))
          collectedLeadData.location = 'Canasvieiras, Florianópolis'
        else if (lower.includes('jurerê') || lower.includes('jurere'))
          collectedLeadData.location = 'Jurerê, Florianópolis'
        else if (lower.includes('trindade')) collectedLeadData.location = 'Trindade, Florianópolis'
        else if (lower.includes('campeche')) collectedLeadData.location = 'Campeche, Florianópolis'
        else if (lower.includes('capoeiras'))
          collectedLeadData.location = 'Capoeiras, Florianópolis'
        else if (lower.includes('estreito')) collectedLeadData.location = 'Estreito, Florianópolis'
        else if (lower.includes('coqueiros'))
          collectedLeadData.location = 'Coqueiros, Florianópolis'
        else if (lower.includes('são josé') || lower.includes('sao jose'))
          collectedLeadData.location = 'São José'
        else if (lower.includes('palhoça') || lower.includes('palhoca'))
          collectedLeadData.location = 'Palhoça'
        else if (lower.includes('biguaçu') || lower.includes('biguacu'))
          collectedLeadData.location = 'Biguaçu'

        // 6. Faixa de preço (se mencionada)
        const prMatch = text.match(
          /(?:at[eé]|faixa|or[cç]amento|valor|pre[cç]o)\s*(?:de|r\$)?\s*(\d+[\.,]?\d*)\s*(k|mil|milh[oõ]es|milhao|milhão)?/i,
        )
        if (prMatch) {
          collectedLeadData.priceRange = prMatch[0].trim()
        }

        // 7. Links ou referências de portal / anúncio (Chaves na Mão, VivaReal, Zap, brfimoveis, etc.)
        const portalUrlMatch = text.match(/https?:\/\/[^\s\)\>\"\'\`]+/gi)
        if (portalUrlMatch) {
          for (const u of portalUrlMatch) {
            if (!collectedLeadData.specificPropertyInterests.includes(u)) {
              collectedLeadData.specificPropertyInterests.push(u)
            }
          }
        }
      }
    } catch (parseHistErr) {
      console.warn(
        `[AI_REPLY] Error compiling customer history data (non-fatal): ${String(parseHistErr)}`,
      )
    }

    // Se o nome foi descoberto pelo histórico, atualizar displayName e persistir imediatamente no customer
    if (collectedLeadData.name) {
      try {
        const fName = collectedLeadData.name.split(' ')[0]
        if (fName && fName.length > 1) {
          const currentName = customer.getString('name') || ''
          const currentFirstName = customer.getString('first_name') || ''
          if (
            !currentName ||
            currentName.includes('❤️') ||
            currentName.startsWith('+') ||
            !currentFirstName ||
            currentFirstName.includes('❤️')
          ) {
            customer.set('name', collectedLeadData.name)
            customer.set('first_name', fName)
            $app.saveNoValidate(customer)
          }
        }
      } catch (_) {}
      if (!displayName) {
        displayName = collectedLeadData.name.split(' ')[0]
      }
    }

    // Detecção de interesse explícito no imóvel do anúncio/portal ("gostei dessa", "tenho interesse neste imóvel", link enviado)
    const lowerCustMsg = customerMessage.toLowerCase()
    const isExplicitSpecificPropertyInterest =
      lowerCustMsg.includes('gostei dessa') ||
      lowerCustMsg.includes('gostei desse') ||
      lowerCustMsg.includes('gostei deste') ||
      lowerCustMsg.includes('tenho interesse neste imóvel') ||
      lowerCustMsg.includes('tenho interesse nesse imóvel') ||
      lowerCustMsg.includes('tenho interesse neste imovel') ||
      lowerCustMsg.includes('tenho interesse nesse imovel') ||
      lowerCustMsg.includes('chaves na mão') ||
      lowerCustMsg.includes('chavesnamao') ||
      lowerCustMsg.includes('vivareal') ||
      lowerCustMsg.includes('zapimoveis') ||
      lowerCustMsg.includes('zap imóveis') ||
      (lowerCustMsg.includes('esse imóvel') && lowerCustMsg.includes('fotos')) ||
      (lowerCustMsg.includes('este imóvel') && lowerCustMsg.includes('fotos'))

    const effectiveLeadProfile =
      customer.getString('lead_profile') || collectedLeadData.profile || ''
    const isNameAlreadyKnown = !!(collectedLeadData.name || displayName)
    let collectedDataSummary = `### RESUMO DE DADOS JÁ COLETADOS DESTE CLIENTE (NÃO REPETIR ESTAS PERGUNTAS):
- Nome do cliente: ${collectedLeadData.name || displayName || 'Não informado ainda'}
- Perfil do Lead: ${effectiveLeadProfile || 'Não informado'}
- Finalidade: ${collectedLeadData.purpose || (effectiveLeadProfile === 'Investidor' ? 'Investimento' : effectiveLeadProfile === 'Morador' ? 'Moradia' : 'Não informada ainda')}
- Forma de pagamento: ${collectedLeadData.payment || 'Não informada ainda'}
- Tipologia / dormitórios: ${collectedLeadData.typology || 'Não informada ainda'}
- Região / Bairro: ${collectedLeadData.location || 'Não informada ainda'}
- Faixa de valor / investimento: ${collectedLeadData.priceRange || 'Não informada ainda'}
${collectedLeadData.specificPropertyInterests.length > 0 ? `- Imóvel específico de interesse do anúncio/portal: ${collectedLeadData.specificPropertyInterests.join(', ')}` : ''}

DIRETRIZES CRÍTICAS ANTI-REPETIÇÃO E FLUXO CONTÍNUO:
${
  isNameAlreadyKnown
    ? `* REGRA CRÍTICA DO NOME DO LEAD: O nome do cliente já é conhecido e confirmado ("${collectedLeadData.name || displayName}"). É ESTRITAMENTE PROIBIDO perguntar "qual o seu nome?", "como posso te chamar?" ou pedir identificação novamente.\n`
    : ''
}1. NUNCA repita uma pergunta cuja resposta já consta na lista acima!
   - Se o lead já disse que o objetivo é INVESTIMENTO ou o perfil é "Investidor": NUNCA pergunte "é para morar ou investir?"! Trate como Investidor e apresente a rentabilidade e valorização.
   - Se o lead já disse que vai pagar à vista ou financiado: NUNCA pergunte sobre financiamento/à vista novamente!
   - Se o lead já se apresentou ou o nome já é conhecido: NUNCA pergunte "como posso te chamar?" nem repita apresentações formais!
   - Se o lead já informou a tipologia ("casa com 3 suítes", etc.): NUNCA pergunte novamente tipologia ou quantidade de quartos!
   - TODA mensagem do lead deve receber uma resposta que PRIMEIRO atende o que ele perguntou ou pediu (se pediu condição de pagamento, planta, urgência "quero comprar hoje" → conduza de imediato!).
   - Avance SEMPRE para o próximo dado faltante da qualificação ou para a condução do fechamento.
2. INTERESSE EM IMÓVEL ESPECÍFICO (ANÚNCIO / LINK DE PORTAL):
   ${isExplicitSpecificPropertyInterest ? `* ATENÇÃO MÁXIMA: O lead acabou de demonstrar interesse direto no imóvel específico do anúncio/portal ("${customerMessage.substring(0, 80)}")! NÃO continue com questionário nem perguntas burocráticas! Apresente imediatamente esse imóvel ou opções compatíveis do catálogo BRF (nome, diferenciais, localização, valor e link oficial), parabenize a escolha e pergunte se quer ver as fotos e agendar visita.` : '* Se o lead demonstrar interesse num imóvel específico (link/mensagem de portal/anúncio), apresente esse imóvel (nome, preço, localização, link oficial) em vez de continuar o questionário.'}`

    // Regra permanente de saudação temporal (Mauro): em TODA resposta a Bia saúda com bom dia/boa tarde/boa noite + nome
    let hoursSinceLastAiMsg = null
    try {
      const prevAiMsgs = $app.findRecordsByFilter(
        'conversations',
        `customer_id = '${customerId}' && sender = 'ai'`,
        '-created',
        1,
        0,
      )
      if (prevAiMsgs.length > 0) {
        const lastCreatedStr = prevAiMsgs[0].getString('created')
        const lastCreatedDate = new Date(lastCreatedStr)
        const diffMs = now.getTime() - lastCreatedDate.getTime()
        hoursSinceLastAiMsg = diffMs / (3600 * 1000)
      }
    } catch (_) {}

    let channelContext = ''
    if (receiverPhone.includes('991828050')) {
      channelContext = `\n[PERFIL DE ATENDIMENTO: REMARKETING]\nO cliente veio de uma campanha de remarketing (já nos conhece ou interagiu antes).\nDIRETRIZES DE REMARKETING:\n- Aborde de forma mais direta, focando em reengajamento.\n- Trabalhe ativamente objeções.\n`
    } else {
      channelContext = `\n[PERFIL DE ATENDIMENTO: GERAL]\nO cliente é um lead novo (primeiro contato).\nDIRETRIZES GERAIS:\n- Faça a qualificação inicial.\n`
    }

    // Real Estate Properties Catalog from Database (brfimoveis.com.br)
    let propertyContext = ''
    let isRequestingOptions = false
    let extractedMaxPrice = 0
    let extractedBedrooms = 0
    let extractedLocation = ''
    let matchedLocFilter = ''
    const matchedIdsMap = {}
    matchedProps = []
    detectedSpecificPropertyQuery = false
    targetSpecificProp = null
    hasFreeSearchIntent = false

    try {
      // Build search text using current customer message AND recent customer messages
      let customerHistoryTexts = [customerMessage.toLowerCase()]
      if (historyRecords && historyRecords.length > 0) {
        historyRecords.forEach((h) => {
          const s = h.getString('sender')
          if (s === 'customer' || s === 'user' || s === 'lead') {
            customerHistoryTexts.push((h.getString('content') || '').toLowerCase())
          }
        })
      }
      const combinedCustText = customerHistoryTexts.join(' ')

      // Detect if user is asking for options / listings / links
      const optionTriggers = [
        'opções',
        'opcoes',
        'opção',
        'opcao',
        'links',
        'link',
        'imóveis',
        'imoveis',
        'o que vc tem',
        'o que você tem',
        'o que voce tem',
        'o que tem',
        'quais imóveis',
        'quais imoveis',
        'quais apartamentos',
        'quais aptos',
        'tem algo',
        'me passa',
        'manda os link',
        'manda as opções',
        'manda opcoes',
        'manda opções',
        'apresentar opções',
        'apresentar opcoes',
        'mostrar',
        'fotos',
        'catalogo',
        'catálogo',
      ]
      isRequestingOptions = optionTriggers.some((trig) =>
        customerMessage.toLowerCase().includes(trig),
      )

      // Extract price filter (e.g. "até 500k", "500 k", "até 500 mil", "500000", "400k", "1 milhão")
      const priceKMatch = combinedCustText.match(
        /(?:até|ate|maximo|máximo|de|por)?\s*(\d+[\.,]?\d*)\s*(?:k|mil(?:hões|hoes|hao|hão)?)/i,
      )
      if (priceKMatch) {
        let numVal = parseFloat(priceKMatch[1].replace(',', '.'))
        if (/milh/i.test(priceKMatch[0])) {
          extractedMaxPrice = numVal * 1000000
        } else {
          // e.g. 500k or 500 mil
          extractedMaxPrice = numVal < 10000 ? numVal * 1000 : numVal
        }
      } else {
        const rawNumMatch = combinedCustText.match(
          /(?:até|ate|valor|preço|preco)\s*(?:de|r\$)?\s*(\d{3,7})/i,
        )
        if (rawNumMatch) {
          extractedMaxPrice = parseFloat(rawNumMatch[1])
        }
      }

      // Extract bedrooms filter (e.g. "2 dorms", "2 dormitórios", "2 quartos", "3 dorm", "1 quarto")
      const bedMatch = combinedCustText.match(/(\d+)\s*(?:dorm|quarto|suite|suíte)/i)
      if (bedMatch) {
        extractedBedrooms = parseInt(bedMatch[1], 10)
      } else if (
        combinedCustText.includes('dois dorm') ||
        combinedCustText.includes('dois quarto')
      ) {
        extractedBedrooms = 2
      } else if (
        combinedCustText.includes('tres dorm') ||
        combinedCustText.includes('três dorm') ||
        combinedCustText.includes('tres quarto')
      ) {
        extractedBedrooms = 3
      } else if (combinedCustText.includes('um dorm') || combinedCustText.includes('um quarto')) {
        extractedBedrooms = 1
      }

      // Extract location / city / neighborhood / continente
      const locationsMap = [
        {
          key: 'continente',
          filter:
            "city ~ 'São José' || city ~ 'Sao Jose' || neighborhood ~ 'Capoeiras' || neighborhood ~ 'Estreito' || neighborhood ~ 'Coqueiros' || neighborhood ~ 'Balneário' || neighborhood ~ 'Barreiros' || neighborhood ~ 'Continente'",
        },
        {
          key: 'perto a ilha',
          filter:
            "neighborhood ~ 'Capoeiras' || neighborhood ~ 'Estreito' || neighborhood ~ 'Coqueiros' || neighborhood ~ 'Balneário'",
        },
        {
          key: 'perto da ilha',
          filter:
            "neighborhood ~ 'Capoeiras' || neighborhood ~ 'Estreito' || neighborhood ~ 'Coqueiros' || neighborhood ~ 'Balneário'",
        },
        { key: 'capoeiras', filter: "neighborhood ~ 'Capoeiras'" },
        { key: 'coqueiros', filter: "neighborhood ~ 'Coqueiros'" },
        { key: 'estreito', filter: "neighborhood ~ 'Estreito' || neighborhood ~ 'Balneário'" },
        { key: 'balneário', filter: "neighborhood ~ 'Balneário'" },
        { key: 'balneario', filter: "neighborhood ~ 'Balneário'" },
        { key: 'areias', filter: "neighborhood ~ 'Areias'" },
        { key: 'barreiros', filter: "neighborhood ~ 'Barreiros'" },
        { key: 'floresta', filter: "neighborhood ~ 'Floresta'" },
        { key: 'são josé', filter: "city ~ 'São José' || city ~ 'Sao Jose'" },
        { key: 'sao jose', filter: "city ~ 'São José' || city ~ 'Sao Jose'" },
        { key: 'palhoça', filter: "city ~ 'Palhoça' || city ~ 'Palhoca'" },
        { key: 'palhoca', filter: "city ~ 'Palhoça' || city ~ 'Palhoca'" },
        { key: 'biguaçu', filter: "city ~ 'Biguaçu' || city ~ 'Biguacu'" },
        { key: 'biguacu', filter: "city ~ 'Biguaçu' || city ~ 'Biguacu'" },
        { key: 'trindade', filter: "neighborhood ~ 'Trindade'" },
        { key: 'canasvieiras', filter: "neighborhood ~ 'Canasvieiras'" },
        { key: 'canas vieiras', filter: "neighborhood ~ 'Canasvieiras' || title ~ 'Canasvieiras'" },
        { key: 'ingleses', filter: "neighborhood ~ 'Ingleses'" },
        { key: 'jurere', filter: "neighborhood ~ 'Jurerê' || title ~ 'Jurerê'" },
        { key: 'jurerê', filter: "neighborhood ~ 'Jurerê' || title ~ 'Jurerê'" },
        {
          key: 'açores',
          filter: "neighborhood ~ 'Açores' || title ~ 'Açores' || title ~ 'Acores'",
        },
        {
          key: 'acores',
          filter: "neighborhood ~ 'Açores' || title ~ 'Açores' || title ~ 'Acores'",
        },
        {
          key: 'rio caveiras',
          filter: "neighborhood ~ 'Rio Caveiras' || city ~ 'Biguaçu' || city ~ 'Biguacu'",
        },
      ]

      for (const locItem of locationsMap) {
        if (combinedCustText.includes(locItem.key)) {
          matchedLocFilter = locItem.filter
          extractedLocation = locItem.key
          break
        }
      }

      // 0. Priorizar busca do empreendimento do Playbook ativo quando houver match
      if (matchedPlaybook) {
        const pbEmpreendimento = (matchedPlaybook.getString('empreendimento') || '').trim()
        const pbName = (matchedPlaybook.getString('name') || '').trim()
        let pbKeywords = matchedPlaybook.get('match_keywords') || []
        if (typeof pbKeywords === 'string') {
          try {
            pbKeywords = JSON.parse(pbKeywords)
          } catch (_) {
            pbKeywords = [pbKeywords]
          }
        }

        const playbookTerms = [pbEmpreendimento, pbName]
        if (Array.isArray(pbKeywords)) {
          for (let pkIdx = 0; pkIdx < pbKeywords.length; pkIdx++) {
            playbookTerms.push(pbKeywords[pkIdx])
          }
        }
        const filteredPlaybookTerms = playbookTerms
          .filter(Boolean)
          .map((t) => String(t).trim())
          .filter((t) => t.length > 2)

        for (const term of filteredPlaybookTerms) {
          const safeTerm = term.replace(/'/g, "''")
          try {
            const pbProps = $app.findRecordsByFilter(
              'properties',
              `is_active = true && (title ~ '${safeTerm}' || features ~ '${safeTerm}' || description ~ '${safeTerm}' || code ~ '${safeTerm}' || neighborhood ~ '${safeTerm}')`,
              '-created',
              3,
              0,
            )
            for (let pbIdx = 0; pbIdx < pbProps.length; pbIdx++) {
              const pr = pbProps[pbIdx]
              if (!matchedIdsMap[pr.id]) {
                matchedIdsMap[pr.id] = true
                matchedProps.push(pr)
              }
            }
          } catch (_) {}
          if (matchedProps.length >= 3) break
        }
      }

      // 1. Check if customer mentioned known projects / launches (can match MULTIPLE projects at once)
      // REGRA ITEM 1: Se o lead pediu código explícito, herança direta nesta sessão ou se há imóvel em foco (targetSpecificProp),
      // NÃO executar knownProjects para não contaminar matchedProps com lançamentos genéricos (ex: Colinas, Neo, Terrá)
      // Alternativas/outros projetos SOMENTE em pivô de recusa.
      const combinedCustAndAdText = `${combinedCustText} ${customerSource.toLowerCase()} ${customerNotes.toLowerCase()}`

      if (!lastMsgSpecificPropertyRequested && !isShortContinuationMsg && !targetSpecificProp) {
        const knownProjects = [
          {
            regex: /terr[aá]/i,
            filter:
              "is_active = true && (title ~ 'Terrá' || title ~ 'Terra' || features ~ 'Terrá' || code ~ '329')",
          },
          {
            regex: /viva\s*trindade/i,
            filter:
              "is_active = true && (title ~ 'Viva Trindade' || features ~ 'Viva Trindade' || code ~ '301')",
          },
          {
            regex: /villa\s*(?:dos\s*)?ac[oó]rdes|villa\s*(?:dos\s*)?a[cç][oó]res/i,
            filter:
              "is_active = true && (title ~ 'Acordes' || title ~ 'Açores' || title ~ 'Acores' || features ~ 'Villa dos Acordes' || features ~ 'Villa dos Açores' || code ~ '280')",
          },
          {
            regex: /villa\s*areias|residencial\s*areias/i,
            filter:
              "is_active = true && (title ~ 'Areias' || features ~ 'Villa Areias' || features ~ 'Residencial Areias' || code ~ '295')",
          },
          {
            regex: /canasvieiras|canas\s*vieiras|studios?\s*canas|studios?\s*vista\s*mar/i,
            filter:
              "is_active = true && (features ~ 'Canasvieiras' || features ~ 'Studios' || title ~ 'Canasvieiras' || code ~ '330')",
          },
          {
            regex: /viva\s*balne[aá]rio/i,
            filter:
              "is_active = true && (title ~ 'Viva Balneário' || title ~ 'Viva Balneario' || features ~ 'Viva Balneário' || code ~ '342')",
          },
          {
            regex: /colinas\s*(?:de\s*)?s[aã]o\s*pedro/i,
            filter:
              "is_active = true && (title ~ 'Colinas' || features ~ 'Colinas de São Pedro' || code ~ '326' || code ~ '337' || code ~ '333')",
          },
          {
            regex: /solar\s*(?:di\s*)?plaza/i,
            filter:
              "is_active = true && (title ~ 'Solar' || features ~ 'Solar Di Plaza' || code ~ '327')",
          },
          {
            regex: /neo\s*continente/i,
            filter:
              "is_active = true && (title ~ 'Neo Continente' || features ~ 'Neo Continente' || code ~ '289')",
          },
          {
            regex: /biguacu\s*rio\s*caveiras|rio\s*caveiras/i,
            filter: "is_active = true && (features ~ 'Rio Caveiras' || code ~ '310')",
          },
          {
            regex: /opus|agron[oô]mica\s*opus/i,
            filter: "is_active = true && (features ~ 'Opus' || code ~ '311')",
          },
        ]

        for (let i = 0; i < knownProjects.length; i++) {
          const proj = knownProjects[i]
          if (proj.regex.test(combinedCustAndAdText)) {
            const projResults = $app.findRecordsByFilter(
              'properties',
              proj.filter,
              '-created',
              3,
              0,
            )
            for (let j = 0; j < projResults.length; j++) {
              const pr = projResults[j]
              if (!matchedIdsMap[pr.id]) {
                matchedIdsMap[pr.id] = true
                matchedProps.push(pr)
              }
            }
          }
        }
      }
      // 1b. Extração ampla de códigos de imóveis e busca exata normalizada
      // Helper estrito: normalizar código sem espaços, hífens ou letras minúsculas (ex: "AP 343" -> "AP343", "343" -> "343")
      function normalizeCodeStrict(c) {
        if (!c) return ''
        return String(c)
          .replace(/[-_\s]+/g, '')
          .toUpperCase()
      }

      // Helper estrito: extrai apenas os dígitos finais
      function extractCodeDigits(c) {
        if (!c) return ''
        const m = String(c).match(/\d{2,5}/)
        return m ? m[0] : ''
      }

      // Helper estrito de busca exata em properties
      // Proibido fuzzy por prefixo: 343 NUNCA deve retornar 333 ou 337
      function findPropertyByExactCode(targetCodeStr) {
        if (!targetCodeStr) return null
        const normTarget = normalizeCodeStrict(targetCodeStr)
        const digits = extractCodeDigits(targetCodeStr)
        if (!digits) return null

        try {
          // Busca no banco por aproximação inicial apenas para os dígitos exatos
          const candidates = $app.findRecordsByFilter(
            'properties',
            `code ~ '${digits}' || url ~ '/${digits}/'`,
            '-created',
            20,
            0,
          )

          // 1º passo: correspondência idêntica no código normalizado sem espaços
          for (let ci = 0; ci < candidates.length; ci++) {
            const cand = candidates[ci]
            const candCodeNorm = normalizeCodeStrict(cand.getString('code'))
            if (candCodeNorm === normTarget) {
              return cand
            }
          }

          // 2º passo: correspondência idêntica nos dígitos numéricos (ex: lead pediu '343' e cadastro é 'AP 343' ou 'AP343')
          for (let ci = 0; ci < candidates.length; ci++) {
            const cand = candidates[ci]
            const candDigits = extractCodeDigits(cand.getString('code'))
            if (candDigits === digits) {
              return cand
            }
          }

          // 3º passo: conferência na URL oficial (ex: brfimoveis.com.br/343/...)
          for (let ci = 0; ci < candidates.length; ci++) {
            const cand = candidates[ci]
            const candUrl = cand.getString('url') || ''
            if (candUrl.includes(`/${digits}/`) || candUrl.endsWith(`/${digits}`)) {
              return cand
            }
          }
        } catch (lookupEx) {
          console.warn(
            `[AI_REPLY] Erro ao buscar código exato ${targetCodeStr}: ${String(lookupEx)}`,
          )
        }
        return null
      }

      // ITEM 1 & 6: FOCO DEFINITIVO
      // Se a última mensagem contém código explícito (AP343/ap 343/#AP343/"343"):
      // esse imóvel vence TUDO: limpar matchedProps, ignorar knownProjects/matchedLaunch/matchedPlaybook/histórico.
      if (lastMsgSpecificPropertyRequested && lastMsgPropertyCodeOrNum) {
        const exactMatchProp = findPropertyByExactCode(lastMsgPropertyCodeOrNum)
        if (exactMatchProp) {
          matchedProps = [exactMatchProp]
          for (const k in matchedIdsMap) delete matchedIdsMap[k]
          matchedIdsMap[exactMatchProp.id] = true
          targetSpecificProp = exactMatchProp
          detectedSpecificPropertyQuery = true
          matchedLaunch = null
          matchedPlaybook = null
          console.log(
            `[AI_REPLY] [FOCO FINAL] ${lastMsgPropertyCodeOrNum} → ${exactMatchProp.id} (code="${exactMatchProp.getString('code')}", price="${exactMatchProp.getString('price_formatted')}")`,
          )
        } else {
          // Se nenhum imóvel corresponde exatamente, NÃO inferir outro! Proibido fuzzy por prefixo.
          matchedProps = []
          for (const k in matchedIdsMap) delete matchedIdsMap[k]
          targetSpecificProp = null
          detectedSpecificPropertyQuery = true
          matchedLaunch = null
          matchedPlaybook = null
          console.log(
            `[AI_REPLY] [FOCO FINAL] ${lastMsgPropertyCodeOrNum} → NÃO ENCONTRADO (nenhum imóvel inferido por aproximação).`,
          )
        }
      } else if (isShortContinuationMsg) {
        // Mensagens curtas de continuação ("pode mandar aqui", "ok", "manda") herdam o foco FINAL da última mensagem com código da sessão
        let inheritedProp = null
        try {
          const recentSessionMsgs = (
            fullCustomerHistory && fullCustomerHistory.length > 0
              ? fullCustomerHistory
              : historyRecords || []
          ).slice(-8)

          // Varrer de trás para frente procurando a mensagem mais recente com código explícito
          for (let hIdx = recentSessionMsgs.length - 1; hIdx >= 0; hIdx--) {
            const hMsg = recentSessionMsgs[hIdx]
            const hTxt = hMsg.getString('content') || ''
            const parsedCode = extractExplicitPropertyCode(hTxt)
            if (parsedCode && parsedCode.fullCode) {
              const candProp = findPropertyByExactCode(parsedCode.fullCode)
              if (candProp) {
                inheritedProp = candProp
                break
              }
            }
          }
        } catch (heritErr) {
          console.warn(`[AI_REPLY] Erro ao buscar herança de sessão: ${String(heritErr)}`)
        }

        if (inheritedProp) {
          matchedProps = [inheritedProp]
          for (const k in matchedIdsMap) delete matchedIdsMap[k]
          matchedIdsMap[inheritedProp.id] = true
          targetSpecificProp = inheritedProp
          detectedSpecificPropertyQuery = true
          matchedLaunch = null
          matchedPlaybook = null
          console.log(
            `[AI_REPLY] [FOCO FINAL] Herança de sessão ativa → ${inheritedProp.id} (code="${inheritedProp.getString('code')}", price="${inheritedProp.getString('price_formatted')}")`,
          )
        }
      } else if (!isMismatchDetected) {
        // REGRA DE MÁQUINA 2: FOCO ÚNICO
        // Código digitado pelo cliente vence tudo. Caminho sliceForPropertyScan/histCodeRegex DESATIVADO
        // para nunca ressuscitar códigos antigos do histórico e sobrescrever o foco atual.
        console.log(
          '[AI_REPLY] [FOCO ÚNICO] sliceForPropertyScan desativado para proteger o foco atual.',
        )
        if (matchedProps.length > 0 && !targetSpecificProp) {
          targetSpecificProp = matchedProps[0]
        }
      }

      const hasFoundLeadSpecificProperty = detectedSpecificPropertyQuery && matchedProps.length > 0
      const leadRequestedPropertyMissing =
        detectedSpecificPropertyQuery && matchedProps.length === 0
      // 2. Filter by criteria (Price <= X, Bedrooms >= Y, Location)
      if (
        matchedProps.length === 0 &&
        (extractedMaxPrice > 0 || extractedBedrooms > 0 || matchedLocFilter)
      ) {
        let filterParts = ['is_active = true']
        if (extractedMaxPrice > 0) {
          filterParts.push(`price <= ${extractedMaxPrice}`)
        }
        if (extractedBedrooms > 0) {
          filterParts.push(`bedrooms >= ${extractedBedrooms}`)
        }
        if (matchedLocFilter) {
          filterParts.push(`(${matchedLocFilter})`)
        }

        const criteriaFilter = filterParts.join(' && ')
        console.log(`[AI_REPLY] Searching properties by criteria: ${criteriaFilter}`)
        let criteriaResults = $app.findRecordsByFilter('properties', criteriaFilter, 'price', 6, 0)

        // If location made criteria too strict, fallback to price + bedrooms
        if (
          criteriaResults.length === 0 &&
          matchedLocFilter &&
          (extractedMaxPrice > 0 || extractedBedrooms > 0)
        ) {
          let relaxedParts = ['is_active = true']
          if (extractedMaxPrice > 0) relaxedParts.push(`price <= ${extractedMaxPrice}`)
          if (extractedBedrooms > 0) relaxedParts.push(`bedrooms >= ${extractedBedrooms}`)
          console.log(`[AI_REPLY] Relaxing location filter: ${relaxedParts.join(' && ')}`)
          criteriaResults = $app.findRecordsByFilter(
            'properties',
            relaxedParts.join(' && '),
            'price',
            6,
            0,
          )
        }

        if (criteriaResults.length > 0) {
          for (let crIdx = 0; crIdx < criteriaResults.length; crIdx++) {
            const cr = criteriaResults[crIdx]
            if (!matchedIdsMap[cr.id]) {
              matchedIdsMap[cr.id] = true
              matchedProps.push(cr)
            }
          }
        }
      }

      // CORREÇÃO C: BUSCA LIVRE SEM CÓDIGO ("pesquisar para mim", "fazenda em Urubici", "área rural", "casa em Florianópolis", etc.)
      hasFreeSearchIntent = isFreeSearchIntent(combinedCustAndAdText)

      if (matchedProps.length === 0 && !detectedSpecificPropertyQuery && hasFreeSearchIntent) {
        // Extrai termos-chave para busca textual em properties (tipo, cidade, título)
        const ruralKeywords = ['rural', 'fazenda', 'sitio', 'sítio', 'chacara', 'chácara']
        const isRuralQuery = ruralKeywords.some((k) =>
          combinedCustAndAdText.toLowerCase().includes(k),
        )

        try {
          let freeResults = []
          if (isRuralQuery) {
            // Busca propriedades rurais cadastradas com filtro expandido (property_type, description, title, code)
            freeResults = $app.findRecordsByFilter(
              'properties',
              "is_active = true && (property_type ~ 'Rural' || property_type ~ 'Fazenda' || title ~ 'Rural' || title ~ 'Fazenda' || description ~ 'rural' || description ~ 'fazenda' || description ~ 'hectares' || code ~ 'ARU')",
              '-created',
              4,
              0,
            )
          } else {
            // Busca genérica por palavras de localização ou tipo (incluindo property_type ~ term e description ~ term)
            const searchTerms = []
            if (/urubici/i.test(combinedCustAndAdText)) {
              searchTerms.push("city ~ 'Urubici' || title ~ 'Urubici' || description ~ 'Urubici'")
              // Se pediu Urubici / Serra Catarinense, busca também na macrorregião (São Joaquim, Lages)
              searchTerms.push(
                "city ~ 'São Joaquim' || description ~ 'vinícolas' || description ~ 'vinicolas' || description ~ 'Serra'",
              )
            }
            if (/s[aã]o\s+joaquim/i.test(combinedCustAndAdText))
              searchTerms.push(
                "city ~ 'São Joaquim' || title ~ 'São Joaquim' || description ~ 'São Joaquim'",
              )
            if (/lages/i.test(combinedCustAndAdText))
              searchTerms.push("city ~ 'Lages' || title ~ 'Lages' || description ~ 'Lages'")
            if (/florian[oó]polis/i.test(combinedCustAndAdText))
              searchTerms.push(
                "city ~ 'Florianópolis' || title ~ 'Florianópolis' || description ~ 'Florianópolis'",
              )
            if (/s[aã]o\s+jos[eé]/i.test(combinedCustAndAdText))
              searchTerms.push(
                "city ~ 'São José' || title ~ 'São José' || description ~ 'São José'",
              )
            if (/palho[cç]a/i.test(combinedCustAndAdText))
              searchTerms.push("city ~ 'Palhoça' || title ~ 'Palhoça' || description ~ 'Palhoça'")
            if (/bigua[cç]u/i.test(combinedCustAndAdText))
              searchTerms.push("city ~ 'Biguaçu' || title ~ 'Biguaçu' || description ~ 'Biguaçu'")
            if (/barreiros/i.test(combinedCustAndAdText))
              searchTerms.push(
                "neighborhood ~ 'Barreiros' || title ~ 'Barreiros' || description ~ 'Barreiros'",
              )
            if (/jurer[eê]/i.test(combinedCustAndAdText))
              searchTerms.push(
                "neighborhood ~ 'Jurerê' || title ~ 'Jurerê' || description ~ 'Jurerê'",
              )

            if (/apartamento|apto/i.test(combinedCustAndAdText))
              searchTerms.push("property_type ~ 'Apartamento' || description ~ 'apartamento'")
            if (/casa/i.test(combinedCustAndAdText))
              searchTerms.push("property_type ~ 'Casa' || description ~ 'casa'")
            if (/terreno|lote/i.test(combinedCustAndAdText))
              searchTerms.push("property_type ~ 'Terreno' || description ~ 'terreno'")
            if (/studio/i.test(combinedCustAndAdText))
              searchTerms.push("property_type ~ 'Studio' || description ~ 'studio'")
            if (/cobertura/i.test(combinedCustAndAdText))
              searchTerms.push("property_type ~ 'Cobertura' || description ~ 'cobertura'")

            if (searchTerms.length > 0) {
              const freeFilter = `is_active = true && (${searchTerms.join(' || ')})`
              freeResults = $app.findRecordsByFilter('properties', freeFilter, '-created', 4, 0)
            }
          }

          for (let frIdx = 0; frIdx < freeResults.length; frIdx++) {
            const fr = freeResults[frIdx]
            if (!matchedIdsMap[fr.id]) {
              matchedIdsMap[fr.id] = true
              matchedProps.push(fr)
            }
          }
          if (matchedProps.length > 0) {
            console.log(
              `[AI_REPLY] BUSCA LIVRE LOCALIZOU ${matchedProps.length} imóvel(is) compatível(is): ${matchedProps.map((m) => m.getString('code')).join(', ')}`,
            )
          } else {
            console.log(
              `[AI_REPLY] BUSCA LIVRE NÃO localizou imóveis exatos para "${combinedCustAndAdText}". PROIBIDO injetar lançamentos aleatórios.`,
            )
          }
        } catch (freeErr) {
          console.warn(`[AI_REPLY] Erro na busca livre de imóveis: ${String(freeErr)}`)
        }
      }

      // 3. Fallback: SE e SOMENTE SE o lead não estiver em busca de imóvel específico nem em busca livre pontual
      // REGRA CRÍTICA B & C: Se o lead perguntou sobre um imóvel específico (código, link ou número) ou fez busca livre específica e não achou,
      // É TERMINANTEMENTE PROIBIDO preencher o catálogo com outros lançamentos ou imóveis alternativos (nem Vistage nem code ~ 'LM').
      if (
        matchedProps.length === 0 &&
        !detectedSpecificPropertyQuery &&
        !hasFreeSearchIntent &&
        !isMismatchDetected
      ) {
        const topLaunches = $app.findRecordsByFilter(
          'properties',
          "is_active = true && code ~ 'LM'",
          '-created',
          4,
          0,
        )
        for (let tlIdx = 0; tlIdx < topLaunches.length; tlIdx++) {
          const tl = topLaunches[tlIdx]
          if (!matchedIdsMap[tl.id]) {
            matchedIdsMap[tl.id] = true
            matchedProps.push(tl)
          }
        }
        if (matchedProps.length < 4) {
          const generalProps = $app.findRecordsByFilter(
            'properties',
            'is_active = true',
            'price',
            4,
            0,
          )
          for (let gpIdx = 0; gpIdx < generalProps.length; gpIdx++) {
            const gp = generalProps[gpIdx]
            if (!matchedIdsMap[gp.id] && matchedProps.length < 6) {
              matchedIdsMap[gp.id] = true
              matchedProps.push(gp)
            }
          }
        }
      }
      if (matchedProps.length > 0) {
        propertyContext = '\n[CATÁLOGO DE IMÓVEIS REAIS - BRF IMÓVEIS (www.brfimoveis.com.br)]\n'
        propertyContext +=
          'ESTES IMÓVEIS ESTÃO CONFIRMADOS E DISPONÍVEIS NO CATÁLOGO. Se o cliente perguntou por eles ou por opções semelhantes, CONFIRME que temos sim disponíveis e apresente as informações e links oficiais abaixo:\n\n'

        matchedProps.forEach((p, idx) => {
          const pCode = (p.getString('code') || '').trim()
          const pTitle = p.getString('title')
          const pUrl = p.getString('url')
          const pCity = p.getString('city')
          const pNeigh = p.getString('neighborhood')
          const pPrice = p.getString('price_formatted')
          const pBeds = p.getInt('bedrooms')
          const pSuites = p.getInt('suites')
          const pBaths = p.getInt('bathrooms')
          const pParking = p.getInt('parking_spaces')
          const pArea = p.getFloat('area_privativa')
          const pDesc = p.getString('description')
          const isLaunchLm = /^LM/i.test(pCode.replace(/[-_\s]+/g, ''))

          propertyContext += `--- IMÓVEL ${idx + 1} ---\n`
          propertyContext += `Código: ${pCode}\n`
          propertyContext += `Título: ${pTitle}\n`
          propertyContext += `Link Oficial do Imóvel: ${pUrl}\n`
          propertyContext += `Localização: ${pNeigh ? pNeigh + ', ' : ''}${pCity}\n`
          propertyContext += `Valor: ${pPrice}\n`
          if (!isLaunchLm) {
            propertyContext += `FONTE ÚNICA E EXCLUSIVA DE VALOR: ${pPrice || 'Valor sob consulta no link oficial'}. Imóvel de TERCEIROS — proibido citar valores de lançamentos.\n`
          }
          propertyContext += `Sinal de visita = FECHAMENTO: celebrar, pedir dia e período de preferência, confirmar que o Mauro conduzirá no local. Nunca pedir para o cliente ligar.\n`
          if (pBeds > 0)
            propertyContext += `Dormitórios: ${pBeds}${pSuites > 0 ? ` (${pSuites} suítes)` : ''}\n`
          if (pBaths > 0) propertyContext += `Banheiros: ${pBaths}\n`
          if (pParking > 0) propertyContext += `Vagas de garagem: ${pParking}\n`
          if (pArea > 0) propertyContext += `Área Privativa: ${pArea} m²\n`
          if (pDesc) propertyContext += `Destaques: ${pDesc}\n`
          propertyContext += '\n'
        })
      }
    } catch (propErr) {
      console.warn(`[AI_REPLY] Error querying properties catalog (non-fatal): ${String(propErr)}`)
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const pErrLog = new Record(logsCol)
        pErrLog.set('user_id', userId || '')
        pErrLog.set('type', 'properties_lookup_error')
        pErrLog.set('message', 'Erro não-fatal ao buscar imóveis para o contexto da IA')
        pErrLog.set('details', String(propErr))
        $app.saveNoValidate(pErrLog)
      } catch (_) {}
    }

    if (!propertyContext) {
      propertyContext =
        '\n[CATÁLOGO DE IMÓVEIS]\nSite oficial: https://www.brfimoveis.com.br\nPara opções personalizadas e agendamento de visita, informe o perfil desejado que a equipe BRF conduzirá seu atendimento exclusivo.\nSinal de visita = FECHAMENTO: celebrar, pedir dia e período de preferência, confirmar que o Mauro conduzirá no local. Nunca pedir para o cliente ligar.\n'
    }

    // 0. Obter índices de mercado vigentes e MEMOS DE MERCADO por bairro (Constituição v2.0 Art. 10)
    let indicesContextText = ''
    try {
      const latestIndices = $app.findRecordsByFilter('market_indices', '', '-created', 10, 0)
      if (latestIndices && latestIndices.length > 0) {
        const inccRec = latestIndices.find((r) =>
          (r.getString('name') || '').toUpperCase().includes('INCC'),
        )
        const igpmRec = latestIndices.find((r) =>
          (r.getString('name') || '').toUpperCase().includes('IGP-M'),
        )

        indicesContextText +=
          '\n[ÍNDICES ECONÔMICOS DE MERCADO VIGENTES - ATUALIZAÇÃO AUTOMÁTICA]\n'
        if (inccRec) {
          indicesContextText += `- INCC-M: ${inccRec.get('value')}% no mês de referência ${inccRec.getString('reference_month')} (Fonte: ${inccRec.getString('source') || 'BCB/FGV'})\n`
        }
        if (igpmRec) {
          indicesContextText += `- IGP-M: ${igpmRec.get('value')}% no mês de referência ${igpmRec.getString('reference_month')} (Fonte: ${igpmRec.getString('source') || 'BCB/FGV'})\n`
        }
        indicesContextText += `INSTRUÇÃO DE ATUALIZAÇÃO E REAJUSTE DE PREÇOS:\n`
        indicesContextText += `1. Ao citar valores de tabelas de pagamento, verifique sempre o mês de referência da tabela no cabeçalho do documento.\n`
        indicesContextText += `2. Se a tabela for de meses anteriores ao mês vigente, informe ao cliente com clareza e transparência que os valores e parcelas estão sujeitos ao reajuste contratual do INCC e/ou IGP-M acumulado.\n`
        indicesContextText += `3. Se houver mais de uma tabela do mesmo empreendimento, use EXCLUSIVAMENTE a tabela com a data mais recente.\n\n`
      }
    } catch (indErr) {
      console.warn(`[AI_REPLY] Error loading market_indices (non-fatal): ${String(indErr)}`)
    }

    // Injeção de Memos de Inteligência de Mercado por bairro (Art. 10 da Constituição v2.0)
    try {
      const activeMemos = $app.findRecordsByFilter('market_memos', '', '-created', 20, 0)
      if (activeMemos && activeMemos.length > 0) {
        indicesContextText += `\n[MEMO DE INTELIGÊNCIA DE MERCADO OFICIAL DO DIA - CONSTITUIÇÃO v2.0 ART. 10]:\n`
        indicesContextText += `REGRA INVIOLÁVEL: A Bia domina por bairro o valor do m², a valorização anual e o comparativo imobiliário x investimento bancário (poupança). Todo número citado DEVE vir estritamente dos memos abaixo (com fonte e data de referência). NUNCA invente estatísticas de mercado.\n`
        for (let mIdx = 0; mIdx < activeMemos.length; mIdx++) {
          const mRec = activeMemos[mIdx]
          indicesContextText += `• Bairro: ${mRec.getString('neighborhood')} (${mRec.getString('city') || 'Grande Fpolis'}) — m²: R$ ${mRec.get('avg_price_m2')} | Valorização anual: ${mRec.get('annual_appreciation_pct')}% | Poupança ref: ${mRec.get('benchmark_savings_pct')}% | Memo: "${mRec.getString('memo_text')}" (Fonte: ${mRec.getString('source')} - Data: ${mRec.getString('reference_date')})\n`
        }
        indicesContextText += `\n`
      }
    } catch (memoErr) {
      console.warn(`[AI_REPLY] Error loading market_memos (non-fatal): ${String(memoErr)}`)
    }

    // Injeção de Dados Brutos do Memo Diário de Financiamento Imobiliário (Banco Central / Principais Bancos)
    try {
      const latestFinMemos = $app.findRecordsByFilter('financing_memos', '', '-created', 1, 0)
      if (latestFinMemos && latestFinMemos.length > 0) {
        const finRec = latestFinMemos[0]
        const refDateStr = finRec.getString('reference_date') || ''
        const sourceStr =
          finRec.getString('source') || 'Banco Central do Brasil / Portais Oficiais dos Bancos'
        const isPartial = finRec.get('is_partial') === true

        // Calcular defasagem da data de referência
        let isStale = false
        if (refDateStr) {
          try {
            const refTime = new Date(refDateStr).getTime()
            const nowTime = new Date().getTime()
            const diffHours = (nowTime - refTime) / (1000 * 60 * 60)
            if (diffHours > 48) {
              isStale = true
            }
          } catch (_) {}
        }

        indicesContextText += `\n[DADOS BRUTOS OFICIAIS - MEMO DIÁRIO DE FINANCIAMENTO IMOBILIÁRIO]:\n`
        indicesContextText += `Data do Memo: ${refDateStr || 'Recente'} | Fonte: ${sourceStr}${isPartial ? ' (Dados parciais auditados)' : ''}\n`
        if (isStale) {
          indicesContextText += `AVISO DE VIGÊNCIA: Dados do dia ${refDateStr} — confirmar antes de citar números exatos ao cliente.\n`
        }

        // Tenta desempacotar dados estruturados por banco
        let banksList = []
        try {
          const rawBanks = finRec.get('banks_data')
          if (Array.isArray(rawBanks)) {
            banksList = rawBanks
          } else if (typeof rawBanks === 'string') {
            banksList = JSON.parse(rawBanks)
          }
        } catch (_) {}

        if (Array.isArray(banksList) && banksList.length > 0) {
          indicesContextText += `CONDIÇÕES VIGENTES POR BANCO (FINANCIAMENTO RESIDENCIAL):\n`
          for (let bIdx = 0; bIdx < banksList.length; bIdx++) {
            const b = banksList[bIdx]
            const bName = b.bank_name || b.bank_code || 'Banco'
            const minEntrada = b.min_down_payment_pct != null ? `${b.min_down_payment_pct}%` : '20%'
            const maxFin = b.max_financing_pct != null ? `${b.max_financing_pct}%` : '80%'
            const taxaStr =
              b.rate_details ||
              (b.rate_effective_annual_pct
                ? `${b.rate_effective_annual_pct}% a.a.`
                : 'Sob consulta')
            const compRenda =
              b.max_income_commitment_pct != null ? `${b.max_income_commitment_pct}%` : '30%'
            const prazo = b.max_term_months
              ? `${b.max_term_months} meses (${Math.round(b.max_term_months / 12)} anos)`
              : '420 meses (35 anos)'
            const regras = b.special_rules ? ` Regras: ${b.special_rules}` : ''
            const fgtsStr = b.fgts_accepted ? ' Aceita FGTS.' : ''

            indicesContextText += `• ${bName}: Entrada mínima de ${minEntrada} (financia até ${maxFin}). Taxa anual: ${taxaStr}. Comprometimento máximo de renda: até ${compRenda} da renda bruta. Prazo máximo: ${prazo}.${fgtsStr}${regras}\n`
          }
          indicesContextText += `• REGRA PRÁTICA DE RENDA BRUTA EXIGIDA (30% da renda): Renda bruta familiar recomendada = Parcela pretendida ÷ 0,30 (exemplo: parcela de R$ 3.000 exige renda bruta aproximada de R$ 10.000).\n`
        } else {
          // Fallback para summary_text caso banks_data não esteja em formato de array
          const sumText = finRec.getString('summary_text')
          if (sumText) {
            indicesContextText += `${sumText}\n`
          }
        }
        indicesContextText += `\n`
      }
    } catch (finErr) {
      console.warn(`[AI_REPLY] Error loading financing_memos (non-fatal): ${String(finErr)}`)
    }

    let filesContextText = indicesContextText
    // 1. Arquivos da coleção dedicada ai_knowledge_files (com texto extraído de PDF/DOCX/TXT/MD/XLSX) agrupados por Empreendimento
    try {
      const activeKnowledgeRecords = $app.findRecordsByFilter(
        'ai_knowledge_files',
        `user_id = '${userId}' && is_active != false`,
        '-created',
        100,
        0,
      )
      if (activeKnowledgeRecords.length > 0) {
        // Mapear termos da conversa atual e histórico do lead para scoring de relevância
        const leadTextForRelevance =
          `${customerMessage} ${customerSource} ${customerNotes} ${effectiveOrigin}`.toLowerCase()

        // Filtrar para usar SEMPRE a tabela mais recente por empreendimento (ignorando tabelas antigas)
        const enterpriseLatestTable = {}
        for (const kf of activeKnowledgeRecords) {
          const entName = (kf.getString('enterprise') || '').trim() || 'Geral / Institucional'
          const docTitle = (kf.getString('name') || kf.getString('file') || '').toLowerCase()
          const isTable =
            docTitle.includes('tabela') || docTitle.includes('cotas') || docTitle.includes('custo')
          if (isTable) {
            // Como ordenação é -created, o primeiro encontrado é o mais recente
            if (!enterpriseLatestTable[entName]) {
              enterpriseLatestTable[entName] = kf.id
            }
          }
        }

        // Agrupar documentos por empreendimento
        const groupedFiles = {}
        for (const kf of activeKnowledgeRecords) {
          const enterpriseName =
            (kf.getString('enterprise') || '').trim() || 'Geral / Institucional'

          const docTitle = kf.getString('name') || kf.getString('file')
          const lowerTitle = docTitle.toLowerCase()
          const isTable =
            lowerTitle.includes('tabela') ||
            lowerTitle.includes('cotas') ||
            lowerTitle.includes('custo')

          // Se for tabela antiga descartada em prol de uma mais recente do mesmo empreendimento, ignorar
          if (
            isTable &&
            enterpriseLatestTable[enterpriseName] &&
            enterpriseLatestTable[enterpriseName] !== kf.id
          ) {
            continue
          }

          if (!groupedFiles[enterpriseName]) {
            groupedFiles[enterpriseName] = []
          }

          let extracted = (kf.getString('extracted_text') || '').trim()

          // Se ainda não tiver texto extraído mas houver o arquivo, tenta extrair em runtime
          if (!extracted) {
            const rawFileName = kf.getString('file')
            const lowerF = (docTitle || rawFileName).toLowerCase()
            if (lowerF.endsWith('.pdf') || lowerF.endsWith('.docx') || lowerF.endsWith('.xlsx')) {
              try {
                const docRes = $documents.toMarkdown({ record: kf, field: 'file' })
                if (docRes && docRes.markdown) {
                  extracted = docRes.markdown
                  kf.set('extracted_text', extracted)
                  $app.saveNoValidate(kf)
                }
              } catch (_) {}
            } else if (
              lowerF.endsWith('.txt') ||
              lowerF.endsWith('.md') ||
              lowerF.endsWith('.csv')
            ) {
              try {
                const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
                const fileUrl = `${pbUrl}/api/files/${kf.collectionId}/${kf.id}/${rawFileName}`
                const fileRes = $http.send({ url: fileUrl, method: 'GET', timeout: 5 })
                if (fileRes && fileRes.statusCode === 200 && fileRes.body) {
                  extracted = String.fromCharCode.apply(null, fileRes.body)
                  kf.set('extracted_text', extracted)
                  $app.saveNoValidate(kf)
                }
              } catch (_) {}
            }
          }

          if (extracted) {
            // Truncamento inteligente e pontuação de relevância:
            // Documentos do empreendimento mencionado pelo lead recebem até 25.000 caracteres;
            // Outros documentos recebem até 12.000 caracteres ou resumo dos primeiros parágrafos.
            const isRelevantEnterprise =
              enterpriseName !== 'Geral / Institucional' &&
              leadTextForRelevance.includes(enterpriseName.toLowerCase())

            const maxChars = isRelevantEnterprise ? 25000 : 12000
            let safeText = extracted
            if (extracted.length > maxChars) {
              // Trunca no final de sentença ou parágrafo mais próximo para manter integridade
              const cutPoint = extracted.lastIndexOf('\n\n', maxChars)
              const safeCut = cutPoint > maxChars * 0.7 ? cutPoint : maxChars
              safeText =
                extracted.substring(0, safeCut) +
                '\n... [conteúdo adicional truncado para brevidade]'
            }

            groupedFiles[enterpriseName].push({
              title: docTitle,
              content: safeText,
              isRelevant: isRelevantEnterprise,
              property_id: kf.getString('property_id') || '',
            })
          }
        }

        let enterpriseKeys = Object.keys(groupedFiles)
        if (enterpriseKeys.length > 0) {
          // =========================================================================================
          // ISOLAMENTO DE RAG / PROMPT (ANTI-CONTAMINAÇÃO CRUZADA):
          // Se há um imóvel ou lançamento em foco exclusivo:
          // 1. Se o lead citou um imóvel específico (lastMsgSpecificPropertyRequested ou targetSpecificProp),
          //    NÃO injetar documentos de outros lançamentos (Vistage, Viva Balneário, etc.)!
          //    Injetar apenas "Geral / Institucional" ou documentos explicitamente vinculados àquele imóvel.
          // 2. Se há um matchedLaunch ou matchedPlaybook em foco (sem conflito de imóvel específico),
          //    injetar APENAS os documentos dele e institucionais.
          // =========================================================================================
          // CORREÇÃO B: ISOLAMENTO RAG SEM FALLBACK CRUZADO:
          // Se há imóvel em foco (targetSpecificProp ou lastMsgSpecificPropertyRequested):
          // Dossiê vem ESTRITAMENTE do registro em properties.
          // Se enterpriseKeys ficar sem pasta do imóvel, PROIBIDO injetar outros lançamentos (nem Vistage nem code~'LM').
          // Injetar APENAS os dados do cadastro do imóvel + arquivos "Geral / Institucional".
          if (lastMsgSpecificPropertyRequested || targetSpecificProp) {
            const propTitle = targetSpecificProp
              ? (targetSpecificProp.getString('title') || '').toLowerCase()
              : ''
            const propCode = targetSpecificProp
              ? (targetSpecificProp.getString('code') || '').toLowerCase()
              : ''
            const propId = targetSpecificProp ? targetSpecificProp.id : ''

            // CORREÇÃO 2 — Prioridade máxima aos documentos do empreendimento atualmente em pauta no RAG:
            // isComparingInRag só deve ser true se houver intenção explícita de comparação fresca (!isShortContinuationMsg)
            const isComparingInRag =
              !isShortContinuationMsg &&
              typeof isComparisonIntent !== 'undefined' &&
              isComparisonIntent &&
              Array.isArray(matchedProps) &&
              matchedProps.length > 1

            enterpriseKeys = enterpriseKeys.filter((entKey) => {
              if (entKey === 'Geral / Institucional') return true
              const entLower = entKey.toLowerCase()
              const groupDocs = groupedFiles[entKey] || []

              if (isComparingInRag && Array.isArray(matchedProps)) {
                for (var mpI = 0; mpI < matchedProps.length; mpI++) {
                  var mpT = (matchedProps[mpI].getString('title') || '').toLowerCase()
                  var mpC = (matchedProps[mpI].getString('code') || '').toLowerCase()
                  var mpId = matchedProps[mpI].id
                  // Verifica se algum arquivo deste grupo tem property_id igual ao imóvel
                  for (var gdi = 0; gdi < groupDocs.length; gdi++) {
                    if (groupDocs[gdi].property_id && groupDocs[gdi].property_id === mpId) {
                      return true
                    }
                  }
                  // Corrigido: NUNCA liberar indiscriminadamente pastas sem correspondência real ao imóvel em foco
                  if (
                    (mpT && mpT.includes(entLower)) ||
                    (mpC && mpC.includes(entLower)) ||
                    (mpT.includes('vistage') && entLower.includes('vistage'))
                  ) {
                    return true
                  }
                }
                return false
              }

              // Checagem estrita para o imóvel atualmente em foco:
              // 1. Se os arquivos do grupo têm property_id correspondente
              if (propId) {
                for (var gsi = 0; gsi < groupDocs.length; gsi++) {
                  if (groupDocs[gsi].property_id && groupDocs[gsi].property_id === propId) {
                    return true
                  }
                }
              }

              // 2. Ou se o título/código do imóvel em foco casa diretamente com a chave do empreendimento
              const titleMatches =
                propTitle && (propTitle.includes(entLower) || entLower.includes(propTitle))
              const codeMatches =
                propCode && (propCode.includes(entLower) || entLower.includes(propCode))
              return titleMatches || codeMatches
            })
            // Se não encontrou pasta dedicada para este imóvel específico, MANTER APENAS "Geral / Institucional"
            // NUNCA re-injetar outros lançamentos como fallback!
            if (enterpriseKeys.length === 0 && groupedFiles['Geral / Institucional']) {
              enterpriseKeys = ['Geral / Institucional']
            }
            console.log(
              `[AI_REPLY] ISOLAMENTO RAG: lead em foco no imóvel específico (${propCode || lastMsgPropertyCodeOrNum}, comparing=${isComparingInRag}). Chaves de documentos permitidas: ${enterpriseKeys.join(', ')}`,
            )
          } else if (matchedLaunch || matchedPlaybook) {
            const launchName = (matchedLaunch ? matchedLaunch.getString('name') : '').toLowerCase()
            const pbName = (
              matchedPlaybook
                ? matchedPlaybook.getString('empreendimento') || matchedPlaybook.getString('name')
                : ''
            ).toLowerCase()

            enterpriseKeys = enterpriseKeys.filter((entKey) => {
              if (entKey === 'Geral / Institucional') return true
              const entLower = entKey.toLowerCase()
              return (
                (launchName && (launchName.includes(entLower) || entLower.includes(launchName))) ||
                (pbName && (pbName.includes(entLower) || entLower.includes(pbName)))
              )
            })
            console.log(
              `[AI_REPLY] ISOLAMENTO RAG: lead em foco no lançamento/playbook (${launchName || pbName}). Chaves de documentos permitidas: ${enterpriseKeys.join(', ')}`,
            )
          } else {
            // Ordena colocando os empreendimentos mais relevantes para o lead primeiro
            enterpriseKeys.sort((a, b) => {
              const aRelevant = groupedFiles[a].some((d) => d.isRelevant)
              const bRelevant = groupedFiles[b].some((d) => d.isRelevant)
              if (aRelevant && !bRelevant) return -1
              if (!aRelevant && bRelevant) return 1
              if (a === 'Geral / Institucional') return 1
              if (b === 'Geral / Institucional') return -1
              return a.localeCompare(b)
            })
          }

          if (enterpriseKeys.length > 0) {
            filesContextText +=
              '\n[DOCUMENTOS E BASE DE CONHECIMENTO ORGANIZADOS POR EMPREENDIMENTO]\n'
            filesContextText +=
              'INSTRUÇÃO DE EMPREENDIMENTO: Identifique sobre qual empreendimento o lead está falando ou perguntando. Priorize e utilize com destaque as informações específicas do empreendimento correspondente abaixo.\n\n'

            for (const entKey of enterpriseKeys) {
              if (groupedFiles[entKey]) {
                filesContextText += `=====================================================\n`
                filesContextText += `EMPREENDIMENTO: ${entKey.toUpperCase()}\n`
                filesContextText += `=====================================================\n`
                for (const doc of groupedFiles[entKey]) {
                  filesContextText += `\n--- DOCUMENTO (${entKey}): ${doc.title} ---\n${doc.content}\n`
                }
                filesContextText += '\n'
              }
            }
          }
        }
      }
    } catch (kfErr) {
      console.warn(`[AI_REPLY] Error loading ai_knowledge_files (non-fatal): ${String(kfErr)}`)
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const kfErrLog = new Record(logsCol)
        kfErrLog.set('user_id', userId || '')
        kfErrLog.set('type', 'ai_knowledge_files_error')
        kfErrLog.set('message', 'Erro não-fatal ao carregar ai_knowledge_files')
        kfErrLog.set('details', String(kfErr))
        $app.saveNoValidate(kfErrLog)
      } catch (_) {}
    }

    // 2. Compatibilidade legada com ai_knowledge_files armazenados diretamente no registro do usuário
    if (userRecord) {
      try {
        const files = userRecord.get('ai_knowledge_files') || []
        if (Array.isArray(files) && files.length > 0) {
          const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
          files.forEach((f) => {
            if (typeof f === 'string') {
              const lower = f.toLowerCase()
              if (lower.endsWith('.txt') || lower.endsWith('.csv') || lower.endsWith('.md')) {
                const fileUrl = `${pbUrl}/api/files/${userRecord.collectionId}/${userRecord.id}/${f}`
                try {
                  const fRes = $http.send({ url: fileUrl, method: 'GET', timeout: 5 })
                  if (fRes && fRes.statusCode === 200 && fRes.body) {
                    const str = String.fromCharCode.apply(null, fRes.body)
                    filesContextText += `\n--- Arquivo Legado: ${f} ---\n${str}\n`
                  }
                } catch (_) {}
              } else if (
                lower.endsWith('.pdf') ||
                lower.endsWith('.docx') ||
                lower.endsWith('.xlsx')
              ) {
                try {
                  const docRes = $documents.toMarkdown({
                    record: userRecord,
                    field: 'ai_knowledge_files',
                  })
                  if (docRes && docRes.markdown) {
                    filesContextText += `\n--- Arquivo Legado: ${f} ---\n${docRes.markdown}\n`
                  }
                } catch (_) {}
              }
            }
          })
        }
      } catch (_) {}
    }

    const combinedContextText = `${contextText}\n${filesContextText}`.trim()

    const messages = []
    let clientContext = displayName
      ? `\n[DADOS DO CLIENTE]\nNome do cliente: ${displayName}\n(Importante: Chame o cliente pelo primeiro nome de forma natural. NUNCA mencione nem explique de onde veio o nome nem cite campos de cadastro/CRM se o cliente perguntar.)\n`
      : `\n[DADOS DO CLIENTE]\nCliente sem nome confiável definido. Cumprimente com simpatia de forma genérica (ex: "Olá! Tudo bem?") sem inventar nomes nem usar placeholders.\n`

    // Detect lead origin type (Trilha A: Lead de Anúncio vs Trilha B: Lead de Imóvel de Terceiros)
    const isMetaAdSource =
      isAdReferral ||
      /meta|facebook|fb|instagram|ig|an[uú]ncio|ads|click[- ]to[- ]whatsapp|campanha|google ads|gads/i.test(
        effectiveOrigin || customerSource || '',
      )

    if (effectiveOrigin || customerSource) {
      const displayOrigin = effectiveOrigin || customerSource
      if (isMetaAdSource) {
        clientContext += `Origem / Canal de Entrada: "${displayOrigin}"\n`
      } else {
        clientContext += `Origem / Canal de Entrada: "${displayOrigin}" (Origem orgânica / terceiros / indicação)\n`
      }
      clientContext += `- DIRETRIZ DE CONEXÃO POR ORIGEM: Quando for a mensagem inicial ou fizer sentido contextual, cite com simpatia e naturalidade a origem pela qual o cliente chegou (exemplo: "vi que você veio pelo anúncio do Villa dos Açores", "vi que você acessou a página do nosso lançamento", "vi que você veio pelo Instagram da BRF"). Não soe robótico ou invasivo — use como gancho acolhedor de boas-vindas.\n`
    } else {
      clientContext += `Origem / Canal: Origem não especificada (Tratar pela Trilha B ou conforme demanda)\n`
    }

    if (customerNotes) {
      clientContext += `Observações / Histórico: ${customerNotes}\n`
    }

    // Detect if customer mentions intention to sell, rent out, or trade their own property
    const combinedCustText = `${customerMessage} ${customerNotes}`.toLowerCase()
    const ownerIntentRegex =
      /quero vender|tenho um (?:imóvel|apartamento|apto|casa|terreno|imovel)|tenho uma (?:casa|cobertura|sala)|por quanto vendo|colocar (?:à|a) venda|colocar para vender|quero alugar meu|quero anunciar|anunciar meu|administrar meu|captar|avaliação do meu|quanto vale meu/i
    const isOwnerCaptureLead = ownerIntentRegex.test(combinedCustText)

    const targetIsThirdParty =
      targetSpecificProp &&
      !/^LM/i.test((targetSpecificProp.getString('code') || '').replace(/[-_\s]+/g, ''))

    if (matchedLaunch && !isOwnerCaptureLead && !targetIsThirdParty) {
      const lName = matchedLaunch.getString('name') || 'Lançamento'
      const lEnterprise = matchedLaunch.getString('enterprise_name') || lName
      const lHeadline = matchedLaunch.getString('headline') || ''
      const lDesc = matchedLaunch.getString('description') || ''
      const lLocation = matchedLaunch.getString('location') || ''
      const lPayment = matchedLaunch.getString('payment_terms') || ''
      const lArguments = matchedLaunch.getString('sales_arguments') || ''
      const lSlug = matchedLaunch.getString('slug') || ''
      const lCtaMsg = matchedLaunch.getString('cta_default_message') || ''
      const lWebsiteUrl = (matchedLaunch.getString('website_url') || '').trim()
      // Prioridade absoluta: link oficial no site da BRF (ex: https://www.brfimoveis.com.br/vistage), fallback landing interna CRM
      const lOfficialLink =
        lWebsiteUrl ||
        (lSlug ? `https://crm.brfimoveis.com.br/l/${lSlug}` : 'https://www.brfimoveis.com.br')

      let lUnits = matchedLaunch.get('units') || []
      if (typeof lUnits === 'string') {
        try {
          lUnits = JSON.parse(lUnits)
        } catch (_) {
          lUnits = []
        }
      }
      let unitsSummary = ''
      if (Array.isArray(lUnits) && lUnits.length > 0) {
        unitsSummary = lUnits
          .map((u, i) => {
            const typ = u.typology || u.tipo || 'Unidade'
            const area = u.area || ''
            const pr = u.price || u.valor || ''
            const avail = u.available !== false ? 'Disponível' : 'Reservada'
            return `  ${i + 1}. ${typ} - ${area} | Valor: ${pr} (${avail})`
          })
          .join('\n')
      }
      let lDiffs = matchedLaunch.get('differentials') || []
      if (typeof lDiffs === 'string') {
        try {
          lDiffs = JSON.parse(lDiffs)
        } catch (_) {
          lDiffs = []
        }
      }
      let diffsSummary = Array.isArray(lDiffs) ? lDiffs.join('; ') : ''

      clientContext += `\n[ROTEAMENTO: TRILHA LANÇAMENTO ESPECÍFICO — DOSSIÊ PUBLICADO "${lName}"] (MÁXIMA PRIORIDADE):
Você está atendendo um lead com interesse específico no lançamento: ${lEnterprise} (${lLocation}).
DOSSIÊ OFICIAL DO LANÇAMENTO:
Headline: ${lHeadline}
Descrição: ${lDesc}
${unitsSummary ? `Tabela de Unidades:\n${unitsSummary}\n` : ''}
${lPayment ? `Condições de Pagamento: ${lPayment}\n` : ''}
${diffsSummary ? `Diferenciais do Empreendimento: ${diffsSummary}\n` : ''}
${lArguments ? `Argumentos Comerciais: ${lArguments}\n` : ''}
Página Oficial do Lançamento: ${lOfficialLink}

DIRETRIZ DE FOCO NO LANÇAMENTO:
- Conduza o atendimento com base no dossiê acima.
- Destaque as unidades, valores e diferenciais específicos do ${lName}.
- Página oficial do lançamento: ${lOfficialLink} (você pode enviar para o cliente ver fotos, plantas e detalhes oficiais).
- Se o cliente avançar para reserva, visita ao decorado ou proposta: TRATE COMO FECHAMENTO (Art. 3, item 6 da Constituição v2.0), NUNCA COMO TRANSBORDO. Confirme com entusiasmo o interesse e registre para condução do fechamento. É PROIBIDO dizer "vou pedir para o corretor entrar em contato".\n`
    } else if (matchedPlaybook && !isOwnerCaptureLead) {
      const pbName = matchedPlaybook.getString('name') || 'Anúncio'
      const pbEmpreendimento =
        matchedPlaybook.getString('empreendimento') || 'Empreendimento Anunciado'
      const pbPitch = matchedPlaybook.getString('pitch') || ''
      const pbObjective =
        matchedPlaybook.getString('objective') || 'levar para fechamento e agendamento'
      const pbQualifying = matchedPlaybook.getString('qualifying_questions') || ''
      const pbCta = matchedPlaybook.getString('cta_message') || ''

      clientContext += `\n[ROTEAMENTO: TRILHA A — PLAYBOOK DE VENDA FOCADA — ANÚNCIO "${customerSource || pbName}"] (MÁXIMA PRIORIDADE):
Você está atendendo um lead que veio do anúncio do empreendimento ${pbEmpreendimento}.
SIGA RIGOROSAMENTE A TRILHA A:
ROTEIRO / PITCH COMERCIAL:
${pbPitch}

OBJETIVO DE FECHAMENTO:
${pbObjective}

PERGUNTAS DE QUALIFICAÇÃO:
Faça UMA pergunta de qualificação por vez, dentre:
${pbQualifying}

DIRETRIZ DE FOCO TOTAL:
Conduza a conversa exclusivamente para este empreendimento e para o objetivo acima — NÃO ofereça outros imóveis do catálogo, NÃO mude de assunto, NÃO responda perguntas sobre outros empreendimentos a não ser que o cliente pergunte diretamente (nesse caso responda brevemente e retome o foco para este empreendimento).
Ao detectar interesse ou avançar na conversa, conduza para o fechamento com o seguinte CTA: "${pbCta}".\n`
    } else if (isOwnerCaptureLead) {
      clientContext += `\n[ROTEAMENTO: TRILHA B — DETECÇÃO DE PROPRIETÁRIO / CAPTAÇÃO DE IMÓVEL PRÓPRIO] (PRIORIDADE ABSOLUTA):
O cliente manifestou intenção de vender, alugar ou avaliar um imóvel próprio!
Siga IMEDIATAMENTE as diretrizes da TRILHA B:
1. Parabenize pela excelente decisão de comercializar o imóvel com a BRF Imóveis.
2. Posicione a autoridade da BRF: imobiliária especialista na Grande Florianópolis, canal com vídeos e tours no YouTube (https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g) e carteira ativa de compradores.
3. Mapeie os dados essenciais com naturalidade: tipo do imóvel, bairro/cidade, metragem privativa, dormitórios/suítes, vagas, valor pretendido e urgência.
4. NUNCA passe avaliação ou preço fechado sem vistoria e análise técnica. Sinalize que a BRF realiza estudo mercadológico gratuito.
5. Conduza ao fechamento da Trilha B: parabenize, colete os dados básicos e registre no CRM para o Mauro conduzir a captação.\n`
    } else if (isMetaAdSource) {
      clientContext += `\n[ROTEAMENTO: TRILHA A — LEAD DE ANÚNCIO META / CLICK-TO-WHATSAPP]:\n`
      clientContext += `- Este lead veio de anúncio Meta: "${customerSource}".\n`
      clientContext += `- DIRETRIZ PRIORITÁRIA DE ABERTURA: Ao iniciar a conversa ou recepcionar o lead, mencione cordialmente o empreendimento ou anúncio de origem de forma calorosa e concisa (exemplo: "Que ótimo que você viu o nosso lançamento!"). Faça apenas UMA pergunta por vez para mapear o perfil e qualificação financeira antes de enviar preços ou links.\n`
    } else {
      clientContext += `\n[ROTEAMENTO: TRILHA B — LEAD DE IMÓVEL DE TERCEIROS / DEMANDA GERAL]:\n`
      clientContext += `- SEPARAÇÃO ESTRITA: Imóvel de terceiros (prefixos AP, CA, CS, TR, FA, COB, ARU ou qualquer outro sem LM). NUNCA misturar com lançamentos na planta nem usar tabela de pagamento de construtora.\n`
      clientContext += `- DADOS OFICIAIS: Utilize estritamente os dados do link oficial brfimoveis.com.br e do catálogo BRF.\n`
      clientContext += `- SIMILARES: Recomende apenas similares de terceiros do mesmo bairro ou, se não houver, de bairros vizinhos.\n`
      clientContext += `- VISITA É FECHAMENTO: Trate confirmação de visita como fechamento e vitória registrada no CRM. Não diga que corretor vai entrar em contato.\n`
      clientContext += `- Se quer vender imóvel próprio: mapear características (tipo, bairro, metragem, dorms, valor pretendido) e agendar avaliação.\n`
      clientContext += `- Se quer comprar imóvel de terceiros fora do catálogo: acolher com honestidade e apresentar alternativas de terceiros compatíveis.\n`
    }

    const isFirstAiMessageOrAfter24h = hoursSinceLastAiMsg === null || hoursSinceLastAiMsg >= 24
    const temporalGreetingSuggestion = buildTemporalGreeting(displayName, brHour)
    const timeGreetingRule = isFirstAiMessageOrAfter24h
      ? `REGRA DE SAUDAÇÃO TEMPORAL (PRIMEIRO CONTATO OU APÓS 24H DE SILÊNCIO):
- Horário local oficial de envio (America/Sao_Paulo): ${currentTimeStr} (${getTemporalGreetingWord(brHour)}).
- Como este é o primeiro contato da Bia ou se passaram mais de 24h desde a última mensagem, inicie com a saudação temporal: "${temporalGreetingSuggestion}".
- Se o lead não tiver nome confiável no cadastro, use apenas "${getTemporalGreetingWord(brHour)}!" sem inventar nome.
- Nunca repita perguntas já respondidas.`
      : `REGRA DE CONTINUIDADE DO DIÁLOGO (CONVERSA EM ANDAMENTO):
- O diálogo com o cliente já está em andamento (última interação há menos de 24h).
- NÃO use saudações formais nem temporais ("Bom dia/Boa tarde/Boa noite/Olá/Oi"). Vá direto ao ponto, respondendo ou avançando com foco na demanda do cliente de forma consultiva e acolhedora.`

    // ======================================================================
    // PILAR C: DETECÇÃO DE PERFIL, PIVÔ NA REJEIÇÃO E GUARDA DE RECUSA
    // ======================================================================
    const custIncomingMsg = (customerMessage || incomingCustMsgText || '').trim()
    const lowerCustIncoming = custIncomingMsg.toLowerCase()

    // (a) Extração de perfil por Regex simples:
    // Faixa de valor: "até 1.000.000", "900 mil", "2 milhões", "até 500k", etc.
    let extractedPillarPriceRange = ''
    const valMatch = custIncomingMsg.match(
      /(?:at[eé]|faixa|or[cç]amento|valor|pre[cç]o|at[eé]\s*r\$|r\$)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+)\s*(k|mil|milh[oõ]es|milhao|milhão)\b/i,
    )
    if (valMatch) {
      extractedPillarPriceRange = valMatch[0].trim()
    } else {
      const bareValMatch = custIncomingMsg.match(
        /\b(?:at[eé]|valor\s*de|or[cç]amento\s*de|pre[cç]o\s*de)?\s*r\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d{5,8})\b/i,
      )
      if (bareValMatch) extractedPillarPriceRange = bareValMatch[0].trim()
    }

    // Forma de pagamento: "à vista", "financiado", "parcelado"
    let extractedPillarPayment = ''
    if (/\b(?:[aà]\s*vista|recursos\s+pr[oó]prios|dinheiro)\b/i.test(lowerCustIncoming)) {
      extractedPillarPayment = 'à vista'
    } else if (
      /\b(?:financiad[ao]|financiamento|financiar|carta\s+de\s+cr[eé]dito|fgts|banco|caixa)\b/i.test(
        lowerCustIncoming,
      )
    ) {
      extractedPillarPayment = 'financiado'
    } else if (
      /\b(?:parcelad[ao]|parcelamento|parcelar|direto\s+com\s+a\s+construtora|entrada\s*\+\s*parcelas)\b/i.test(
        lowerCustIncoming,
      )
    ) {
      extractedPillarPayment = 'parcelado'
    }

    // Objetivo: "morar", "investir"
    let extractedPillarObjective = ''
    if (
      /\b(?:investir|investimento|rentabilidade|revenda|renda|airbnb|loca[cç][aã]o)\b/i.test(
        lowerCustIncoming,
      )
    ) {
      extractedPillarObjective = 'investir'
    } else if (
      /\b(?:morar|moradia|minha\s+fam[ií]lia|minha\s+resor|resid[eê]ncia)\b/i.test(
        lowerCustIncoming,
      )
    ) {
      extractedPillarObjective = 'morar'
    }

    // Carregar e fazer merge no lead_profile_json do customer
    try {
      let currentProfileJson = {}
      try {
        const rawProfileJson = customer.get('lead_profile_json')
        if (rawProfileJson) {
          if (typeof rawProfileJson === 'string') {
            try {
              currentProfileJson = JSON.parse(rawProfileJson)
            } catch (_) {
              currentProfileJson = {}
            }
          } else if (typeof rawProfileJson === 'object') {
            try {
              currentProfileJson = JSON.parse(JSON.stringify(rawProfileJson))
            } catch (_) {
              currentProfileJson = {}
            }
          }
        }
      } catch (_) {
        currentProfileJson = {}
      }

      // Se lead_profile_json vier como Array ou nulo/não-objeto, recriar como objeto ({})
      if (
        !currentProfileJson ||
        Array.isArray(currentProfileJson) ||
        typeof currentProfileJson !== 'object'
      ) {
        currentProfileJson = {}
      }

      let profileJsonChanged = false
      if (
        extractedPillarPriceRange &&
        currentProfileJson.price_range !== extractedPillarPriceRange
      ) {
        currentProfileJson.price_range = extractedPillarPriceRange
        profileJsonChanged = true
      }
      if (extractedPillarPayment && currentProfileJson.payment_method !== extractedPillarPayment) {
        currentProfileJson.payment_method = extractedPillarPayment
        profileJsonChanged = true
      }
      if (extractedPillarObjective && currentProfileJson.objective !== extractedPillarObjective) {
        currentProfileJson.objective = extractedPillarObjective
        profileJsonChanged = true
      }

      if (profileJsonChanged) {
        try {
          customer.set('lead_profile_json', currentProfileJson)
          $app.saveNoValidate(customer)
          console.log(
            `[AI_REPLY] [PILAR_C] lead_profile_json atualizado para customer=${customerId}: ${JSON.stringify(currentProfileJson)}`,
          )
        } catch (profErr) {
          console.warn(`[AI_REPLY] [PILAR_C] Erro ao salvar lead_profile_json: ${String(profErr)}`)
        }
      }
    } catch (mergeErr) {
      console.warn(
        `[AI_REPLY] [PILAR_C] Erro seguro no bloco lead_profile_json: ${String(mergeErr)}`,
      )
    }

    // (b) Pivô na rejeição:
    // "não é isso que procuro" / "não é isso" / "outro"
    const isRejectionPivot =
      /\b(?:n[aã]o\s+[ée]\s+isso(?:\s+que\s+(?:eu\s+)?procuro)?|n[aã]o\s+e\s+isso(?:\s+que\s+(?:eu\s+)?procuro)?|outro(?:\s+im[oó]vel|\s+tipo|\s+bairro|\s+lan[cç]amento)?|outra\s+op[cç][aã]o|n[aã]o\s+gostei(?:\s+desse|\s+deste|\s+dessa)?|n[aã]o\s+me\s+agradou|procuro\s+outro|quero\s+outro)\b/i.test(
        lowerCustIncoming,
      )

    let currentRejectionCount = 0
    try {
      currentRejectionCount = customer.getInt('rejection_count') || 0
    } catch (_) {}

    if (isRejectionPivot) {
      currentRejectionCount++
      try {
        customer.set('rejection_count', currentRejectionCount)
        customer.set('last_rejection_reason', custIncomingMsg.substring(0, 200))
        $app.saveNoValidate(customer)
        console.log(
          `[AI_REPLY] [PILAR_C] Pivô na rejeição acionado para customer=${customerId}. rejection_count=${currentRejectionCount}`,
        )
      } catch (rejErr) {
        console.warn(`[AI_REPLY] [PILAR_C] Erro ao registrar rejeição: ${String(rejErr)}`)
      }
    }

    // (c) Guarda de recusa:
    // "não obrigada" / "já sei" / "vou pensar"
    const isPoliteRefusal =
      /\b(?:n[aã]o\s+obrigad[ao]|n[aã]o\,\s*obrigad[ao]|j[aá]\s+sei|vou\s+pensar|deixa\s+pra\s+depois|depois\s+eu\s+vejo|qualquer\s+coisa\s+te\s+chamo|no\s+momento\s+n[aã]o)\b/i.test(
        lowerCustIncoming,
      )

    if (isPoliteRefusal) {
      try {
        const tomorrowIso = new Date(now.getTime() + 24 * 3600 * 1000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19)
        customer.set('persistence_status', 'aguardando_momento')
        customer.set('follow_up_step', 'd1')
        customer.set('next_follow_up_at', tomorrowIso)
        $app.saveNoValidate(customer)
        console.log(
          `[AI_REPLY] [PILAR_C] Guarda de recusa gravada: persistence_status='aguardando_momento', follow_up_step='d1', next_follow_up_at=${tomorrowIso}`,
        )
      } catch (refErr) {
        console.warn(`[AI_REPLY] [PILAR_C] Erro ao gravar guarda de recusa: ${String(refErr)}`)
      }
    }

    // (1.b) Limitação de blocos de contexto para evitar erro 413
    const safeIndicesContextText =
      (indicesContextText || '').length > 1200
        ? (indicesContextText || '').substring(0, 1200) + '\n... [memo truncado a 1200 caracteres]'
        : indicesContextText || ''
    const safeCombinedContextText =
      (combinedContextText || '').length > 1500
        ? (combinedContextText || '').substring(0, 1500) +
          '\n... [contexto RAG truncado a 1500 caracteres]'
        : combinedContextText || ''
    const safePropertyContext =
      (propertyContext || '').length > 1200
        ? (propertyContext || '').substring(0, 1200) + '\n... [catálogo truncado a 1200 caracteres]'
        : propertyContext || ''

    // O comportamento da Bia é regido EXCLUSIVAMENTE pela diretriz soberana ativa (TEXTO ÚNICO DA BIA - v2.0)
    // Mantém no systemPrompt apenas: dados dos imóveis (propertyContext), resumo de dados coletados (collectedDataSummary),
    // índices de mercado/memos (indicesContextText) e a persona soberana ativa (biaLearningsText).
    const systemPrompt = `Você é ${aiName}, da BRF Imóveis (www.brfimoveis.com.br).

DIRETRIZ MESTRA E SOBERANA DE ATENDIMENTO:
${biaLearningsText}
${personaInstructions}

${safePropertyContext}

${collectedDataSummary}

${safeIndicesContextText ? `DADOS DE MERCADO E VALORIZAÇÃO:\n${safeIndicesContextText}\n` : ''}

CONTEXTO RECUPERADO:
${safeCombinedContextText || '(Nenhum contexto adicional na base)'}`

    messages.push({ role: 'system', content: systemPrompt })

    // (1.a) Limitar o histórico enviado a no máximo 10 mensagens, truncando antigas a ~300 chars e removendo vazias/duplicadas
    if (historyRecords && historyRecords.length > 0) {
      const sanitizedHistory = []
      const seenContents = {}
      historyRecords.forEach((msg) => {
        const msgSender = msg.getString('sender')
        if (msgSender === 'system') return
        const role = msgSender === 'ai' || msgSender === 'agent' ? 'assistant' : 'user'
        if (msg.id !== incomingMsgId) {
          const rawContent = (msg.getString('content') || '').trim()
          if (!rawContent) return
          // Anti-duplicação simples
          const contentKey = `${role}:${rawContent}`
          if (seenContents[contentKey]) return
          seenContents[contentKey] = true
          sanitizedHistory.push({ role: role, content: rawContent })
        }
      })

      // Pegar no máximo 10 mensagens mais recentes do histórico
      const maxHistoryCount = 10
      const recentSlice = sanitizedHistory.slice(-maxHistoryCount)
      recentSlice.forEach((hItem, hIdx) => {
        let content = hItem.content
        // Truncar mensagens antigas (todas exceto as 2 mais recentes) a ~300 caracteres
        if (hIdx < recentSlice.length - 2 && content.length > 300) {
          content = content.substring(0, 300) + '...'
        }
        messages.push({ role: hItem.role, content: content })
      })
    }

    messages.push({ role: 'user', content: customerMessage })

    console.log(`[AI_REPLY] Calling $ai.chat (model=fast) with ${messages.length} messages...`)

    let responseText = ''
    let detectedStatus = ''
    let detectedPhase = ''
    let detectedHandover = ''
    let detectedProfile = ''

    try {
      const chatRes = $ai.chat({
        model: 'fast',
        messages: messages,
      })
      if (chatRes && chatRes.choices && chatRes.choices[0] && chatRes.choices[0].message) {
        responseText = (chatRes.choices[0].message.content || '').trim()
        console.log(
          `[AI_REPLY] $ai.chat response received (len=${responseText.length}): "${responseText.substring(0, 80)}..."`,
        )
      } else {
        console.warn(`[AI_REPLY] $ai.chat returned unexpected shape: ${JSON.stringify(chatRes)}`)
      }
    } catch (err) {
      const errStr = String(err)
      console.error(`[AI_REPLY] Skip AI Chat exception: ${errStr}`)

      // (1.c) Retry automático com payload mínimo se for erro 413 / Too Large
      const is413OrTooLarge =
        errStr.includes('413') ||
        /too\s*large/i.test(errStr) ||
        /entity\s*too\s*large/i.test(errStr)
      if (is413OrTooLarge) {
        console.warn('[AI_REPLY] Gateway 413 detectado! Tentando retry com payload mínimo...')
        try {
          const minimalSystemPrompt = `Você é ${aiName}, da BRF Imóveis.
DIRETRIZ SOBERANA:
${biaLearningsText}

${safePropertyContext}`

          const minimalMessages = [
            { role: 'system', content: minimalSystemPrompt },
            { role: 'user', content: customerMessage },
          ]
          const retryRes = $ai.chat({
            model: 'fast',
            messages: minimalMessages,
          })
          if (retryRes && retryRes.choices && retryRes.choices[0] && retryRes.choices[0].message) {
            responseText = (retryRes.choices[0].message.content || '').trim()
            console.log(
              `[AI_REPLY] $ai.chat 413-retry SUCCESS (len=${responseText.length}): "${responseText.substring(0, 80)}..."`,
            )
          }
        } catch (retryErr) {
          console.error(`[AI_REPLY] 413-retry também falhou: ${String(retryErr)}`)
        }
      }

      if (!responseText) {
        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const aiErrLog = new Record(logsCol)
          aiErrLog.set('user_id', userId || '')
          aiErrLog.set('type', 'whatsapp_ai_reply_error')
          aiErrLog.set('message', 'Erro ao chamar $ai.chat')
          aiErrLog.set('details', errStr)
          aiErrLog.set('payload', JSON.stringify({ customer_id: customerId, error: errStr }))
          $app.saveNoValidate(aiErrLog)
        } catch (_) {}
      }
    }

    if (!responseText) {
      const safeGreeting = buildTemporalGreeting(displayName, brHour)
      responseText = `${safeGreeting} Que bom ter você aqui na BRF Imóveis. Vi seu interesse e quero te ajudar a encontrar o imóvel ideal. Podemos falar sobre o que você procura?`
      console.log(`[AI_REPLY] Using safe fallback response (len=${responseText.length})`)
    }

    // Hard Anti-Repetition & Canned Response Overhaul (handles all Unicode hyphens U+2010..U+2015, non-breaking spaces, punctuation, accents)
    function isCannedValuesSentence(txt) {
      if (!txt) return false
      // Normalize hyphens and dashes (including U+2010..U+2015, non-breaking hyphen U+2011) to standard '-'
      // Also normalize non-breaking spaces (\u00A0, \u202F) to normal space
      const normalized = txt
        .toLowerCase()
        .replace(/[\u2010-\u2015\u2212\uFE63\uFF0D]/g, '-')
        .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
        .replace(/\s+/g, ' ')

      return (
        normalized.includes('vou te passar os valores') ||
        normalized.includes('passar os valores agora mesmo') ||
        normalized.includes('passar os valores agora') ||
        (normalized.includes('custo-beneficio') && normalized.includes('alem do valor')) ||
        (normalized.includes('custo-benefício') && normalized.includes('além do valor')) ||
        (normalized.includes('custobeneficio') && normalized.includes('alem do valor')) ||
        (normalized.includes('melhor custo') && normalized.includes('alem do valor')) ||
        (normalized.includes('melhor custo') && normalized.includes('além do valor')) ||
        (normalized.includes('melhor custo') &&
          normalized.includes('o que é mais importante para você além do valor')) ||
        (normalized.includes('unidade com o melhor') && normalized.includes('além do valor')) ||
        (normalized.includes('unidade com o melhor') && normalized.includes('alem do valor')) ||
        (normalized.includes('unidade com o melhor custo') && normalized.includes('perfil'))
      )
    }

    // Function to thoroughly clean internal LLM / supervisor / prompt artifacts
    function sanitizeAiResponse(raw) {
      if (!raw) return ''
      let clean = raw.trim()

      // 1. Remove supervisor delimiters: "Reescrita corrigida --- [conteúdo]" or "*** ---"
      // Split on sequences of hyphens/em-dashes (2 or more)
      if (/[-—–]{2,}/.test(clean)) {
        const parts = clean.split(/\s*[-—–]{2,}\s*/)
        if (parts.length > 1) {
          // If first part has supervisor markers, take remainder
          if (
            /aprovado|reescrita|mensagem|corrigida|supervisor|avalia|cadência|cadencia/i.test(
              parts[0],
            )
          ) {
            clean = parts.slice(1).join(' ').trim()
          }
        }
      }

      // 2. Aggressive regex removal of leading review / rewrite / approval prefixes
      // Matches e.g.: "**Reescrita corrigida**", "*Reescrita*", "APROVADO:", "Reescrita:", "Mensagem corrigida:", etc.
      const leadingArtifacts = [
        /^(\*\*|\*|#+|\s)*APROVADO(\*\*|\*|#+|\s)*\s*[-–—:]*\s*/i,
        /^(\*\*|\*|#+|\s)*REPROVADO(\*\*|\*|#+|\s)*\s*[-–—:]*\s*/i,
        /^(\*\*|\*|#+|\s)*Reescrita(\s+corrigida|\s+sugerida)?(\*\*|\*|#+|\s)*\s*[-–—:]*\s*/i,
        /^(\*\*|\*|#+|\s)*Mensagem\s*(corrigida|reescrita|ajustada)(\*\*|\*|#+|\s)*\s*[-–—:]*\s*/i,
        /^(\*\*|\*|#+|\s)*Resposta\s*(da\s*IA|sugerida|corrigida)?(\*\*|\*|#+|\s)*\s*[-–—:]*\s*/i,
        /^(\*\*|\*|#+|\s)*Versão\s*(corrigida|final)(\*\*|\*|#+|\s)*\s*[-–—:]*\s*/i,
        /^A\s*mensagem\s*foi\s*reescrita\s*para.*?:?\s*(\n+|$)/i,
        /^Aqui\s*(está|vai)\s*a\s*(mensagem|resposta)\s*(corrigida|reescrita|ajustada):?\s*(\n+|$)/i,
      ]

      let changed = true
      while (changed) {
        changed = false
        for (const pattern of leadingArtifacts) {
          if (pattern.test(clean)) {
            clean = clean.replace(pattern, '').trim()
            changed = true
          }
        }
        // Also strip any residual leading separators like "---", "–-", "—"
        if (/^[-—–\s*#]+$/.test(clean)) {
          clean = ''
          break
        }
        if (/^[-—–]+\s*/.test(clean)) {
          clean = clean.replace(/^[-—–]+\s*/, '').trim()
          changed = true
        }
      }

      // 3. Remove lines that are purely supervisor commentary
      const lines = clean.split('\n')
      const filteredLines = []
      for (const line of lines) {
        const trimmed = line.trim()
        if (
          /^(\*\*|\*)?(APROVADO|REPROVADO|Reescrita corrigida|Mensagem corrigida|Versão corrigida)(\*\*|\*)?$/i.test(
            trimmed,
          ) ||
          /^(\*\*|\*)?Cadência\s*\d+/i.test(trimmed) ||
          /A mensagem foi reescrita para obedecer/i.test(trimmed) ||
          /^[-—–=]{2,}$/.test(trimmed)
        ) {
          continue
        }
        filteredLines.push(line)
      }
      clean = filteredLines.join('\n').trim()

      return clean
    }

    // Intercept canned phrase if generated by primary model before Mother AI
    if (isCannedValuesSentence(responseText)) {
      console.warn(
        '[AI_REPLY] Primary model generated canned phrase, triggering fallback generation early.',
      )
      const earlyFallback = generateCatalogFallbackMessage(matchedProps)
      if (earlyFallback && earlyFallback.trim()) {
        responseText = earlyFallback
      }
    }

    // Intercept false negative if model says requested launches/properties are not in catalog when matchedProps actually has them!
    const claimsCatalogUnavailable =
      /não estão disponíveis no (?:nosso )?cat[aá]logo|n[aã]o constam? no cat[aá]logo|n[aã]o temos ess(?:es|e|a) (?:empreendimentos?|im[oó]ve(?:l|is)|opç[aã]o|opçõ?es)? no cat[aá]logo|ainda n[aã]o est[aã]o? dispon[ií]ve(?:l|is)|nenhum desses empreendimentos constam|infelizmente n[aã]o (?:temos|possu[ií]mos|encontrei|consta)/i.test(
        responseText,
      )
    if (claimsCatalogUnavailable && Array.isArray(matchedProps) && matchedProps.length > 0) {
      console.warn(
        '[AI_REPLY] Model falsely claimed properties are not in catalog even though matchedProps found matching units! Triggering consultative presentation fallback.',
      )
      const primaryProp = matchedProps[0]
      const pTitle = (primaryProp.getString('title') || '').trim()
      const pCode = (primaryProp.getString('code') || '').trim()
      const pNeigh = (primaryProp.getString('neighborhood') || '').trim()
      const pCity = (primaryProp.getString('city') || '').trim()
      const pPrice = (primaryProp.getString('price_formatted') || '').trim()
      const pUrl = (primaryProp.getString('url') || '').trim()
      const locStr = [pNeigh, pCity].filter(Boolean).join(', ')

      let correctedCatalogMsg = `Temos sim essa opção no nosso portfólio oficial! `
      correctedCatalogMsg += `Sobre o imóvel ${pCode ? `*${pCode}*` : ''}${pTitle ? ` (${pTitle})` : ''}`
      if (locStr) correctedCatalogMsg += ` em ${locStr}`
      if (pPrice) correctedCatalogMsg += `, ele está disponível por *${pPrice}*`
      correctedCatalogMsg += `.`
      if (pUrl) correctedCatalogMsg += ` Você pode conferir os detalhes aqui: ${pUrl}`
      correctedCatalogMsg += `\n\nPosso te ajudar com alguma informação específica dele ou gostaria de agendar uma visita?`
      responseText = correctedCatalogMsg.trim()
    }

    // Função para detectar se um texto é parecer/relatório de avaliação interna em vez de mensagem ao cliente
    function isInternalEvaluationText(txt) {
      if (!txt || typeof txt !== 'string') return false
      const lower = txt.toLowerCase()

      // Marcadores explícitos de avaliação/parecer de conformidade
      if (
        lower.includes('avaliação de conformidade') ||
        lower.includes('avaliacao de conformidade') ||
        lower.includes('motivos da não aprovação') ||
        lower.includes('motivos da nao aprovacao') ||
        lower.includes('motivos de não aprovação') ||
        lower.includes('motivos de reprovação') ||
        lower.includes('motivo da reprovação') ||
        lower.includes('não approvado') ||
        lower.includes('nao approvado') ||
        lower.includes('não aprovado') ||
        lower.includes('nao aprovado') ||
        lower.includes('não aprovada') ||
        lower.includes('nao aprovada') ||
        lower.includes('reprovado') ||
        lower.includes('reprovada')
      ) {
        // Se contiver marcadores em formato de relatório ou análise técnica
        if (
          lower.includes('conformidade') ||
          lower.includes('motivos') ||
          lower.includes('saudação temporal ausente') ||
          lower.includes('identificação padrão') ||
          lower.includes('regra de não inventar') ||
          lower.includes('não contém a identificação') ||
          lower.includes('violando a regra') ||
          lower.includes('infringindo a regra') ||
          lower.includes('não obedece') ||
          lower.includes('critérios') ||
          lower.includes('parecer') ||
          /^\s*(\*\*|\*|#+|\s)*(não aprovad[ao]|reprovad[ao])/i.test(txt)
        ) {
          return true
        }
      }

      // Marcadores com padrão estruturado de avaliação (ex: "1. Saudação...", "2. Identificação...")
      if (
        /(\bavalia[cç][aã]o\b|\bparecer\b|\bconformidade\b)/i.test(txt) &&
        /(\bn[aã]o\s+aprovad[ao]\b|\breprovad[ao]\b)/i.test(txt)
      ) {
        return true
      }

      // Se começar diretamente com "Não aprovada – a mensagem..." ou similar
      if (/^\s*(\*\*|\*)?n[aã]o\s+aprovad[ao]\s*[-–—:]/i.test(txt)) {
        return true
      }

      return false
    }

    // REGRAS DE MÁQUINA 3 & 6:
    // Higienizar tags internas ([HANDOVER], [STATUS], etc.) ANTES da avaliação da Mãe IA
    const earlyHandoverMatch = responseText.match(/\[HANDOVER:\s*(.*?)\]/i)
    if (earlyHandoverMatch && earlyHandoverMatch[1]) {
      detectedHandover = earlyHandoverMatch[1].trim()
    }
    responseText = responseText.replace(/\[HANDOVER:[^\]]*\]/gi, '').trim()
    responseText = responseText.replace(/\[STATUS:\s*.*?\]/gi, '').trim()
    responseText = responseText.replace(/\[PHASE:\s*.*?\]/gi, '').trim()
    responseText = responseText.replace(/\[PERMUTA\]/gi, '').trim()
    responseText = sanitizeAiResponse(responseText)

    // Optional Mother AI supervisor validation & Regeneration Flow
    if (motherAiInstructions && responseText.length > 0) {
      try {
        const clientFirstName = (displayName || '').split(/\s+/)[0] || ''

        // REGRA DE MÁQUINA 1: Mãe IA valida preço e dados estritamente contra o dossiê do imóvel em foco
        let focusPropValidationInfo = ''
        if (targetSpecificProp) {
          focusPropValidationInfo = `\n[IMÓVEL EM FOCO]: Código ${targetSpecificProp.getString('code')}, Título "${targetSpecificProp.getString('title')}", Valor ${targetSpecificProp.getString('price_formatted')}, Localização: ${targetSpecificProp.getString('neighborhood')}, ${targetSpecificProp.getString('city')}. Link: ${targetSpecificProp.getString('url')}.\nAVALIE O PREÇO E DADOS CONTRA ESTE IMÓVEL EM FOCO — NUNCA CONTRA TABELAS DE OUTROS LANÇAMENTOS!\n`
        } else if (matchedLaunch) {
          focusPropValidationInfo = `\n[LANÇAMENTO EM FOCO]: ${matchedLaunch.getString('name')} (${matchedLaunch.getString('enterprise_name')}). AVALIE PREÇO E DADOS CONTRA O DOSSIÊ DESTE LANÇAMENTO ESPECÍFICO — NUNCA CONTRA OUTROS LANÇAMENTOS!\n`
        }

        const evalPrompt = `Você é a IA Mãe, supervisora da BRF Imóveis. Avalie a resposta da Bia sob a CONSTITUIÇÃO DA BIA v2.0:
Critérios essenciais e regras obrigatórias de avaliação:
${focusPropValidationInfo}
1. VALIDAÇÃO DE PREÇO E DADOS: Valide sempre e exclusivamente contra o dossiê e cadastro do imóvel/lançamento em foco acima! NUNCA compare com tabela de outro lançamento nem com Vistage global quando o foco for outro imóvel.
2. PEDIDO DE VISITA É FECHAMENTO: A Bia tratar pedido de visita como fechamento e vitória é CORRETO e OBRIGATÓRIO (Art. 3 item 6 da Constituição v2.0). É expressamente PROIBIDO reprovar a Bia por confirmar visita/fechamento!
3. Saudação e Apresentação: Exigir saudação temporal (Bom dia/Boa tarde/Boa noite) e apresentação "Bia, da BRF Imóveis" APENAS na primeiríssima mensagem da Bia (hoursSinceLastAiMsg >= 24 ou primeira interação: ${isFirstAiMessageOrAfter24h ? 'SIM, É PRIMEIRA MENSAGEM' : 'NÃO, É DIÁLOGO EM ANDAMENTO'}). Se a conversa já está no MEIO do diálogo (interação contínua, hoursSinceLastAiMsg < 24), é PROIBIDO reprovar por ausência de saudação ou por falta de apresentação "Bia, da BRF Imóveis". Diálogo contínuo DEVE ir direto ao ponto!
4. Identificação padrão: "Bia, da BRF Imóveis" se ela for se apresentar na 1ª mensagem.
5. Se o lead perguntou sobre um imóvel específico, aprovar a resposta focada no imóvel.
6. Se o lead disse que é para "investimento" ou "investidor", NUNCA exigir re-pergunta de "morar ou investir".
7. NOME DO CLIENTE: O nome do cliente atual é "${displayName}" (primeiro nome: "${clientFirstName}"). Saudar ou chamar o cliente pelo próprio nome é OBRIGATÓRIO e CORRETO.
8. INTELIGÊNCIA DE MERCADO E FINANCIAMENTO IMOBILIÁRIO:
   a) Estatísticas de valor do m² e rentabilidade imobiliária devem ter origem estrita no memo oficial de mercado.
   b) Condições de financiamento imobiliário (percentual de entrada mínima, comprometimento de renda até 30%, taxas vigentes por banco, prazo e regras Caixa/bancos privados) devem ter origem estrita no memo de financiamento do dia.
   c) Reprovar qualquer taxa ou percentual de financiamento bancário citado pela Bia que contradiga ou não exista no memo oficial de financiamento do dia.
9. Reprovar APENAS alucinação de imóveis/links fora do catálogo, números de mercado ou financiamento sem origem nos memos, questionários acumulados com 3+ perguntas ou invenção grosseira de dados.

FORMATO ESTRITO DA RESPOSTA:
- Se a mensagem estiver em conformidade e aprovada, responda EXATAMENTE e APENAS a palavra: APROVADO
- Se a mensagem NÃO estiver aprovada, responda no formato:
REPROVADO
Motivos: <descreva sucintamente em 1 a 2 linhas o que corrigir>`

        const validationRes = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: evalPrompt },
            { role: 'user', content: `Mensagem candidata da Bia:\n"""\n${responseText}\n"""` },
          ],
        })

        if (
          validationRes &&
          validationRes.choices &&
          validationRes.choices[0] &&
          validationRes.choices[0].message
        ) {
          let motherFeedback = (validationRes.choices[0].message.content || '').trim()
          console.log(
            `[AI_REPLY] Mother AI check raw feedback: "${motherFeedback.substring(0, 100)}..."`,
          )

          let isApproved =
            motherFeedback === 'APROVADO' ||
            /^(\*\*|\*)?APROVADO(\*\*|\*)?$/i.test(motherFeedback) ||
            motherFeedback.toLowerCase().startsWith('aprovado')

          // GUARDA 1 — CONFUSÃO CLIENTE / CORRETOR / USO DO NOME DO CLIENTE OU MAURO:
          // Se o motivo da reprovação mencionar confusão entre cliente e corretor, citar o corretor Mauro ou uso legítimo do nome do cliente, ANULAR reprovação!
          if (!isApproved) {
            const lowerFb = motherFeedback.toLowerCase()
            const hasClientBrokerConfusion =
              lowerFb.includes('corretor') ||
              lowerFb.includes('mauro') ||
              lowerFb.includes('confund') ||
              lowerFb.includes('nome do cliente') ||
              lowerFb.includes('chamar pelo nome') ||
              (clientFirstName && lowerFb.includes(clientFirstName.toLowerCase()))

            const isHardViolation =
              lowerFb.includes('alucin') ||
              lowerFb.includes('fora do catálogo') ||
              lowerFb.includes('fora do catalogo') ||
              lowerFb.includes('link inválido') ||
              lowerFb.includes('link invalido')

            if (hasClientBrokerConfusion && !isHardViolation) {
              console.log(
                `[AI_REPLY] IA Mãe reprovou por suposta confusao corretor/cliente ou uso de nome ("${motherFeedback.substring(0, 80)}..."). Anulando reprovacao (isApproved=true) e enviando.`,
              )
              isApproved = true
            }
          }

          // GUARDA 2 — ANTI-REPROVAÇÃO FALSA NO MEIO DO DIÁLOGO:
          // Se a conversa já está em andamento (!isFirstAiMessageOrAfter24h) e o motivo da reprovação contiver falta de saudação ou apresentação/identificação "Bia, da BRF Imóveis",
          // anular definitivamente a reprovação por falta de saudação/apresentação (só vale na primeira mensagem).
          if (!isApproved && !isFirstAiMessageOrAfter24h) {
            const lowerFb = motherFeedback.toLowerCase()
            const hasGreetingOrIntroComplaint =
              lowerFb.includes('saudação') ||
              lowerFb.includes('saudacao') ||
              lowerFb.includes('identificação') ||
              lowerFb.includes('identificacao') ||
              lowerFb.includes('apresentação') ||
              lowerFb.includes('apresentacao') ||
              lowerFb.includes('se apresentar') ||
              lowerFb.includes('bia, da brf') ||
              lowerFb.includes('brf imóveis') ||
              lowerFb.includes('bom dia') ||
              lowerFb.includes('boa tarde') ||
              lowerFb.includes('boa noite')

            const isHardViolation =
              lowerFb.includes('alucin') ||
              lowerFb.includes('fora do catálogo') ||
              lowerFb.includes('fora do catalogo') ||
              lowerFb.includes('link inválido') ||
              lowerFb.includes('link invalido')

            if (hasGreetingOrIntroComplaint && !isHardViolation) {
              console.log(
                `[AI_REPLY] IA Mãe reprovou por saudação/identificação no meio do diálogo contínuo. Anulando reprovação definitivamente (isApproved=true) e mantendo resposta da Bia.`,
              )
              isApproved = true
            }
          }

          if (!isApproved) {
            console.warn(`[AI_REPLY] Mother AI REJECTED message. Reason: ${motherFeedback}`)
            // NUNCA enviar o texto de avaliação/reprovação!
            // REGENERAR a mensagem da Bia com base nos motivos apontados
            let regenInstructions = motherFeedback
              .replace(/^(\*\*|\*)?REPROVADO(\*\*|\*)?\s*/i, '')
              .trim()
            if (!regenInstructions) {
              regenInstructions =
                'Use a identificação "Bia, da BRF Imóveis" (se for se apresentar), mantenha continuidade sem saudações repetidas e faça apenas uma pergunta por vez sem inventar imóveis.'
            }

            try {
              const regenMessages = messages.slice(0)
              regenMessages.push({
                role: 'assistant',
                content: responseText,
              })
              regenMessages.push({
                role: 'user',
                content: `[SUPERVISÃO INTERNA - CORREÇÃO OBRIGATÓRIA]: A mensagem anterior precisa de correção pelos seguintes motivos: ${regenInstructions}.
Gere agora a resposta FINAL definitiva da Bia para o WhatsApp do cliente corrigindo esses pontos.
IMPORTANTE: envie EXCLUSIVAMENTE a mensagem para o cliente (em tom caloroso, consultivo, 2 a 4 linhas, apenas uma pergunta por vez). NUNCA inclua pareceres, notas, cabeçalhos ou comentários de avaliação.`,
              })

              const regenRes = $ai.chat({
                model: 'fast',
                messages: regenMessages,
              })

              if (
                regenRes &&
                regenRes.choices &&
                regenRes.choices[0] &&
                regenRes.choices[0].message
              ) {
                let regeneratedText = (regenRes.choices[0].message.content || '').trim()
                regeneratedText = sanitizeAiResponse(regeneratedText)

                if (
                  regeneratedText &&
                  !isInternalEvaluationText(regeneratedText) &&
                  !isCannedValuesSentence(regeneratedText)
                ) {
                  console.log(
                    `[AI_REPLY] Successfully regenerated corrected message (len=${regeneratedText.length})`,
                  )
                  responseText = regeneratedText
                } else {
                  console.warn(
                    `[AI_REPLY] Regenerated text was invalid or contained evaluation markers.`,
                  )
                  if (detectedSpecificPropertyQuery) {
                    if (matchedProps && matchedProps.length > 0) {
                      const tp = matchedProps[0]
                      responseText = `Sobre o imóvel ${tp.getString('code')} (${tp.getString('title')}): ele está disponível por ${tp.getString('price_formatted')}. Confira os detalhes: ${tp.getString('url')}. Como posso te ajudar com ele?`
                    } else {
                      responseText = `Recebi sua solicitação sobre esse imóvel! Estou verificando os detalhes dele junto ao Mauro e já te retorno com as informações completas.`
                    }
                  } else {
                    const catFb = generateCatalogFallbackMessage(matchedProps)
                    if (catFb) responseText = catFb
                  }
                }
              }
            } catch (regenErr) {
              console.error(
                `[AI_REPLY] Failed to regenerate message after rejection: ${String(regenErr)}`,
              )
            }
          }
        }
      } catch (err) {
        console.warn(`[AI_REPLY] Mother AI validation non-fatal error: ${String(err)}`)
      }
    }

    // Strict validation of properties mentioned in AI response against properties collection
    function validateAndSanitizePropertiesInOutput(text) {
      if (!text) return { sanitizedText: '', removedBlocks: [], hadHallucinatedProperty: false }

      let activeCatalogProps = []
      try {
        activeCatalogProps = $app.findRecordsByFilter(
          'properties',
          'is_active = true',
          'price',
          100,
          0,
        )
      } catch (e) {
        console.warn(`[AI_PROPERTY_VALIDATION] Failed to load catalog: ${String(e)}`)
      }

      const activeCodesMap = {}
      const activeUrlsMap = {}
      const activeUrlNumbersMap = {}
      const activeCodesList = []

      const addActiveCode = (c) => {
        if (c && !activeCodesMap[c]) {
          activeCodesMap[c] = true
          activeCodesList.push(c)
        }
      }

      for (let pIdx = 0; pIdx < activeCatalogProps.length; pIdx++) {
        const p = activeCatalogProps[pIdx]
        const c = (p.getString('code') || '').trim().toUpperCase()
        if (c) {
          addActiveCode(c)
          addActiveCode(c.replace(/\s+/g, ''))
          addActiveCode(c.replace(/[-_\s]+/g, ''))
          // Extrai dígitos numéricos do código (ex: AP-344 -> 344)
          const cNum = c.replace(/\D/g, '')
          if (cNum) {
            activeUrlNumbersMap[cNum] = true
            addActiveCode(cNum)
            // Permite variações de prefixos no mesmo número (ex: LM344, AP344)
            addActiveCode(`LM${cNum}`)
            addActiveCode(`AP${cNum}`)
            addActiveCode(`LM-${cNum}`)
            addActiveCode(`AP-${cNum}`)
          }
        }
        const u = (p.getString('url') || '').trim().toLowerCase()
        if (u) {
          activeUrlsMap[u] = true
          const numMatch = u.match(/brfimoveis\.com\.br\/(\d+)/i)
          if (numMatch) {
            activeUrlNumbersMap[numMatch[1]] = true
            addActiveCode(numMatch[1])
            addActiveCode(`AP${numMatch[1]}`)
            addActiveCode(`LM${numMatch[1]}`)
            addActiveCode(`AP-${numMatch[1]}`)
            addActiveCode(`LM-${numMatch[1]}`)
          }
        }
      }
      // Split text into blocks / paragraphs (separated by double newlines or list items / tables)
      // Check each block: does it cite a property code or a brfimoveis link?
      const rawBlocks = text.split(/\n\s*\n/)
      const validBlocks = []
      const removedBlocks = []
      let hadHallucinatedProperty = false

      for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
        const block = rawBlocks[bIdx]
        const trimmedBlock = block.trim()
        if (!trimmedBlock) continue

        // Extract any brfimoveis.com.br or external URLs in this block
        const urlMatches = trimmedBlock.match(/https?:\/\/[^\s\)\>\"\'\`]+/gi) || []
        let hasInvalidUrl = false
        if (urlMatches.length > 0) {
          for (let uIdx = 0; uIdx < urlMatches.length; uIdx++) {
            const rawUrl = urlMatches[uIdx]
            const cleanUrl = rawUrl.toLowerCase().replace(/[\.,;:!\?]+$/, '')

            // ALLOWLIST: Legitimate non-property links (YouTube channel BRF, WhatsApp, social networks)
            const isAllowlistedUrl =
              cleanUrl.includes('youtube.com/channel/uca2jsoitvtf8vkgwg65yh_g') ||
              cleanUrl.includes('youtube.com/@maurofenglerbrf') ||
              cleanUrl.includes('youtube.com/@brfimoveis') ||
              cleanUrl.includes('youtube.com/@brfimoveiseirelime') ||
              cleanUrl.includes('youtube.com/channel/') ||
              cleanUrl.includes('youtube.com/c/') ||
              cleanUrl.includes('youtube.com/@') ||
              cleanUrl.includes('youtube.com/watch') ||
              cleanUrl.includes('youtube.com/embed') ||
              cleanUrl.includes('youtu.be/') ||
              cleanUrl.includes('wa.me/') ||
              cleanUrl.includes('api.whatsapp.com/') ||
              cleanUrl.includes('instagram.com/mauro.brfimoveis') ||
              cleanUrl.includes('instagram.com/brfimoveis')

            if (isAllowlistedUrl) {
              continue
            }

            // Only check domain brfimoveis.com.br for catalog property validation
            if (cleanUrl.includes('brfimoveis.com.br')) {
              // Check if it matches an active property url or valid static page
              const isCatalogStaticPage =
                cleanUrl.includes('/imoveis') ||
                cleanUrl.includes('/venda') ||
                cleanUrl.endsWith('brfimoveis.com.br') ||
                cleanUrl.endsWith('brfimoveis.com.br/')
              const numMatch = cleanUrl.match(/brfimoveis\.com\.br\/(\d+)/i)
              if (numMatch) {
                const urlNum = numMatch[1]
                if (!activeUrlNumbersMap[urlNum]) {
                  hasInvalidUrl = true
                  console.warn(
                    `[AI_PROPERTY_VALIDATION] Invalid/Hallucinated property URL detected: ${rawUrl}`,
                  )
                  break
                }
              } else if (!isCatalogStaticPage && !activeUrlsMap[cleanUrl]) {
                hasInvalidUrl = true
                console.warn(
                  `[AI_PROPERTY_VALIDATION] Non-existent specific URL detected: ${rawUrl}`,
                )
                break
              }
            } else {
              // Other untrusted unknown domains - flag as invalid url
              hasInvalidUrl = true
              console.warn(`[AI_PROPERTY_VALIDATION] Unrecognized external URL detected: ${rawUrl}`)
              break
            }
          }
        }

        // Extract property code patterns: e.g. AB 101, AP 343, AP343, CS331, LM326, TR338, ARU341, BRF-101
        // Look for typical property identifiers like "**AB 101**", "Código: AP-320", "📍 AP343", "*AP 343*"
        let hasInvalidCode = false
        const realPrefixes = ['LM', 'AP', 'CS', 'TR', 'ARU', 'BRF', 'COB']
        const blacklistWordsMap = {
          TEM: true,
          COM: true,
          SÃO: true,
          SAO: true,
          ATE: true,
          ATÉ: true,
          POR: true,
          VALOR: true,
          LOTE: true,
          APTO: true,
          SALA: true,
          CASA: true,
          FAIXA: true,
          TOTAL: true,
          DE: true,
          EM: true,
          SEM: true,
          SOB: true,
          PRA: true,
          PARA: true,
          MAS: true,
          MAIS: true,
          OU: true,
          E: true,
        }

        const codeRegex =
          /(?:(#|código|cod|cód\.?|ref\.?)\s*[*_`]*([A-Z]{2,4}\s*[-_]?\s*\d{2,4})|(?:\b)([A-Z]{2,4}\s*[-_]?\s*\d{2,4}))(?:\s*([a-z²\d]+))?[*_`]*/gi
        let matchResult
        while ((matchResult = codeRegex.exec(trimmedBlock)) !== null) {
          const prefixTrigger = matchResult[1] || '' // '#', 'código', 'ref', etc.
          const rawCandidate = matchResult[2] || matchResult[3] || ''
          const followingWord = (matchResult[4] || '').toLowerCase()

          if (!rawCandidate) continue

          const prefixLetters = rawCandidate.replace(/[^A-Za-z]/g, '').toUpperCase()
          const digitsOnly = rawCandidate.replace(/\D/g, '')

          // (b) Blacklist de palavras comuns pt-BR (ex: "TEM 82", "COM 3", "ATE 500")
          if (blacklistWordsMap[prefixLetters]) {
            continue
          }

          // (c) Descartar matches seguidos de unidade de medida (ex: "82 m²", "82 m2", "metros", "dorms", "suítes")
          if (
            followingWord === 'm²' ||
            followingWord === 'm2' ||
            followingWord === 'metros' ||
            followingWord === 'metro' ||
            followingWord === 'dorm' ||
            followingWord === 'dorms' ||
            followingWord === 'dormitórios' ||
            followingWord === 'dormitorios' ||
            followingWord === 'quartos' ||
            followingWord === 'quarto' ||
            followingWord === 'suíte' ||
            followingWord === 'suite' ||
            followingWord === 'suítes' ||
            followingWord === 'suites' ||
            followingWord === 'vagas' ||
            followingWord === 'vaga'
          ) {
            continue
          }

          // (a) Match sem prefixo trigger ('#', 'código', 'ref') só conta se o prefixo é um prefixo REAL do catálogo
          const hasExplicitTrigger = !!prefixTrigger
          const isRealPrefix = realPrefixes.indexOf(prefixLetters) !== -1
          if (!hasExplicitTrigger && !isRealPrefix) {
            // Palavra genérica não precedida de código/# e sem prefixo de catálogo conhecido -> não é código de imóvel
            continue
          }

          const extracted = rawCandidate.toUpperCase().trim()
          const normExtracted = extracted.replace(/\s+/g, '').replace(/[-_]/g, '')

          // Exclude generic numbers or dates
          if (
            normExtracted.length >= 3 &&
            !normExtracted.startsWith('R$') &&
            !normExtracted.startsWith('BR101')
          ) {
            // Check if this code belongs to active properties
            let existsInCatalog = false
            for (let acIdx = 0; acIdx < activeCodesList.length; acIdx++) {
              const ac = activeCodesList[acIdx]
              if (
                ac === extracted ||
                ac === normExtracted ||
                normExtracted.includes(ac) ||
                ac.includes(normExtracted)
              ) {
                existsInCatalog = true
                break
              }
            }
            if (!existsInCatalog) {
              // Extra check: maybe it's just mentioning BR-101 highway
              if (/BR[-\s]?101/i.test(extracted)) {
                continue
              }
              hasInvalidCode = true
              console.warn(
                `[AI_PROPERTY_VALIDATION] Invalid/Hallucinated property code detected: ${extracted} in block: "${trimmedBlock.substring(0, 60)}"`,
              )
              break
            }
          }
        }

        if (hasInvalidUrl || hasInvalidCode) {
          hadHallucinatedProperty = true
          removedBlocks.push(trimmedBlock)
          console.log(
            `[AI_PROPERTY_VALIDATION] Removing hallucinated property block: "${trimmedBlock.substring(0, 100)}..."`,
          )
        } else {
          validBlocks.push(trimmedBlock)
        }
      }

      const sanitizedText = validBlocks.join('\n\n').trim()
      return { sanitizedText, removedBlocks, hadHallucinatedProperty }
    }

    responseText = sanitizeAiResponse(responseText)

    // Run hard property validation on the generated response
    const validationResult = validateAndSanitizePropertiesInOutput(responseText)
    if (validationResult.hadHallucinatedProperty) {
      console.warn(
        `[AI_PROPERTY_VALIDATION] Hallucinated content detected! Removed ${validationResult.removedBlocks.length} block(s).`,
      )
      responseText = validationResult.sanitizedText

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const valLog = new Record(logsCol)
        valLog.set('user_id', userId || '')
        valLog.set('type', 'ai_property_validation')
        valLog.set(
          'message',
          `IA alucinou imóvel/link fora do catálogo. ${validationResult.removedBlocks.length} bloco(s) removido(s) antes do envio.`,
        )
        valLog.set(
          'details',
          JSON.stringify({
            removed_blocks: validationResult.removedBlocks,
            customer_id: customerId,
          }),
        )
        valLog.set(
          'payload',
          JSON.stringify({
            removed_count: validationResult.removedBlocks.length,
            preview_removed: validationResult.removedBlocks.map((b) => b.substring(0, 120)),
          }),
        )
        $app.saveNoValidate(valLog)
      } catch (logErr) {
        console.warn(`[AI_PROPERTY_VALIDATION] Log write failed: ${String(logErr)}`)
      }
    }

    // Extract business tags from response
    let detectedPriceRange = ''
    let detectedNeighborhood = ''
    let detectedUrgency = 0

    const statusMatch = responseText.match(/\[STATUS:\s*(.*?)\]/i)
    if (statusMatch && statusMatch[1]) {
      detectedStatus = statusMatch[1].trim()
      responseText = responseText.replace(/\[STATUS:\s*.*?\]/gi, '').trim()
    }

    const phaseMatch = responseText.match(/\[PHASE:\s*(.*?)\]/i)
    if (phaseMatch && phaseMatch[1]) {
      detectedPhase = phaseMatch[1].trim()
      responseText = responseText.replace(/\[PHASE:\s*.*?\]/gi, '').trim()
    }

    const handoverMatch = responseText.match(/\[HANDOVER:\s*(.*?)\]/i)
    if (handoverMatch && handoverMatch[1]) {
      detectedHandover = handoverMatch[1].trim()
      responseText = responseText.replace(/\[HANDOVER:[^\]]*\]/gi, '').trim()
    }

    const profileMatch = responseText.match(/\[PROFILE:\s*(.*?)\]/i)
    if (profileMatch && profileMatch[1]) {
      detectedProfile = profileMatch[1].trim()
      responseText = responseText.replace(/\[PROFILE:\s*.*?\]/gi, '').trim()
    }

    const priceRangeMatch = responseText.match(/\[PRICE_RANGE:\s*(.*?)\]/i)
    if (priceRangeMatch && priceRangeMatch[1]) {
      detectedPriceRange = priceRangeMatch[1].trim()
      responseText = responseText.replace(/\[PRICE_RANGE:\s*.*?\]/gi, '').trim()
    }

    const neighborhoodMatch = responseText.match(/\[NEIGHBORHOOD:\s*(.*?)\]/i)
    if (neighborhoodMatch && neighborhoodMatch[1]) {
      detectedNeighborhood = neighborhoodMatch[1].trim()
      responseText = responseText.replace(/\[NEIGHBORHOOD:\s*.*?\]/gi, '').trim()
    }

    const urgencyMatch = responseText.match(/\[URGENCY:\s*(\d+)\]/i)
    if (urgencyMatch && urgencyMatch[1]) {
      const uNum = parseInt(urgencyMatch[1], 10)
      if (!isNaN(uNum) && uNum >= 1 && uNum <= 5) {
        detectedUrgency = uNum
      }
      responseText = responseText.replace(/\[URGENCY:\s*.*?\]/gi, '').trim()
    }

    let detectedPermuta = false
    if (responseText.includes('[PERMUTA]')) {
      detectedPermuta = true
      responseText = responseText.replace(/\[PERMUTA\]/gi, '').trim()
    }

    responseText = responseText.replace(/^[\[\(].*?[\]\)]\s*/gm, '').trim()
    responseText = responseText.replace(/(\(Aplicando.*?\))|(\[Aplicando.*?\])/gi, '').trim()
    responseText = responseText.replace(/(\(Com base.*?\))|(\[Com base.*?\])/gi, '').trim()

    if (displayName) {
      responseText = responseText.replace(/\[Nome\]/gi, displayName)
      responseText = responseText.replace(/\{Nome\}/gi, displayName)
    } else {
      responseText = responseText.replace(/,\s*\[Nome\]/gi, '')
      responseText = responseText.replace(/\[Nome\]/gi, '')
      responseText = responseText.replace(/,\s*\{Nome\}/gi, '')
      responseText = responseText.replace(/\{Nome\}/gi, '')
    }

    responseText = sanitizeAiResponse(responseText)

    // Check recent AI messages sent to this customer
    let recentAiMessages = []
    try {
      const recentAiRecords = $app.findRecordsByFilter(
        'conversations',
        `customer_id = '${customerId}' && sender = 'ai'`,
        '-created',
        5,
        0,
      )
      recentAiMessages = recentAiRecords.map((r) => (r.getString('content') || '').trim())
    } catch (_) {}

    let isTooSimilar = false
    const normResp = responseText
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')

    if (recentAiMessages.length > 0) {
      const lastAiMsg = recentAiMessages[0]
      const normLast = lastAiMsg.toLowerCase().replace(/[^\w\s]/gi, '')

      // Check if identical or canned
      if (
        normResp === normLast ||
        (normResp.length > 30 && normLast.includes(normResp)) ||
        isCannedValuesSentence(responseText)
      ) {
        isTooSimilar = true
      }
    }

    const cannedDetected = isCannedValuesSentence(responseText)

    // Fallback function to generate consultative real estate presentation from properties collection
    function generateCatalogFallbackMessage(propsCandidateList) {
      let activeProps = []

      // 1. Check passed candidates or outer matchedProps safely
      const candidates =
        Array.isArray(propsCandidateList) && propsCandidateList.length > 0
          ? propsCandidateList
          : typeof matchedProps !== 'undefined' &&
              Array.isArray(matchedProps) &&
              matchedProps.length > 0
            ? matchedProps
            : []

      if (candidates.length > 0) {
        activeProps = candidates.filter((p) => {
          try {
            return (
              p &&
              (p.get('is_active') === true ||
                (typeof p.getBool === 'function' ? p.getBool('is_active') : p.get('is_active')) ===
                  true)
            )
          } catch (_) {
            return true
          }
        })
      }

      // 2. If candidates list is empty or had no active items, query the catalog directly
      if (activeProps.length === 0) {
        try {
          let filterParts = ['is_active = true']
          if (typeof extractedMaxPrice === 'number' && extractedMaxPrice > 0) {
            filterParts.push(`price <= ${extractedMaxPrice}`)
          }
          if (typeof extractedBedrooms === 'number' && extractedBedrooms > 0) {
            filterParts.push(`bedrooms >= ${extractedBedrooms}`)
          }
          if (typeof matchedLocFilter === 'string' && matchedLocFilter) {
            filterParts.push(`(${matchedLocFilter})`)
          }

          if (filterParts.length > 1) {
            activeProps = $app.findRecordsByFilter(
              'properties',
              filterParts.join(' && '),
              'price',
              3,
              0,
            )
          }

          if (
            activeProps.length === 0 &&
            typeof matchedLocFilter === 'string' &&
            matchedLocFilter &&
            (extractedMaxPrice > 0 || extractedBedrooms > 0)
          ) {
            let relaxed = ['is_active = true']
            if (extractedMaxPrice > 0) relaxed.push(`price <= ${extractedMaxPrice}`)
            if (extractedBedrooms > 0) relaxed.push(`bedrooms >= ${extractedBedrooms}`)
            activeProps = $app.findRecordsByFilter(
              'properties',
              relaxed.join(' && '),
              'price',
              3,
              0,
            )
          }

          if (activeProps.length === 0) {
            activeProps = $app.findRecordsByFilter('properties', 'is_active = true', 'price', 3, 0)
          }
        } catch (dbErr) {
          console.warn(`[AI_REPLY] Error querying properties for fallback: ${String(dbErr)}`)
        }
      }

      if (activeProps && activeProps.length > 0) {
        const topProp = activeProps[0]
        const pTitle = (topProp.getString('title') || '').trim()
        const pCity = (topProp.getString('city') || '').trim()
        const pNeigh = (topProp.getString('neighborhood') || '').trim()
        const pBeds = topProp.getInt('bedrooms')
        const pSuites = topProp.getInt('suites')
        const loc = [pNeigh, pCity].filter(Boolean).join(', ')

        let greeting = buildTemporalGreeting(displayName, brHour) + ' '
        let consultMsg = `${greeting}Temos uma excelente oportunidade que se encaixa muito bem no que você procura: o *${pTitle}*`
        if (loc) consultMsg += ` em ${loc}`
        if (pBeds > 0) {
          consultMsg += `, com ${pBeds} dormitório${pBeds > 1 ? 's' : ''}${pSuites > 0 ? ` (${pSuites} suíte${pSuites > 1 ? 's' : ''})` : ''}`
        }
        // Se a forma de pagamento já for conhecida (ex: à vista), não perguntar de novo!
        if (collectedLeadData && collectedLeadData.payment) {
          consultMsg += `.\n\nQuer que eu te envie as fotos e a tabela de valores dessa opção?`
        } else {
          consultMsg += `.\n\nVocê pretende adquirir à vista ou vai utilizar financiamento bancário? Quer que eu te mande as fotos e a tabela de valores?`
        }
        return consultMsg
      }

      const greeting = buildTemporalGreeting(displayName, brHour) + ' '
      if (collectedLeadData && collectedLeadData.payment) {
        return `${greeting}Temos excelentes opções na região que atendem ao seu perfil. Gostaria de receber fotos e detalhes das unidades disponíveis?`
      }
      return `${greeting}Temos excelentes opções na região que atendem ao seu perfil. Você pretende fazer a compra à vista ou vai financiar? Posso te apresentar as melhores unidades.`
    }

    // Check if after sanitation the response became empty or had hallucinated properties
    const needsCatalogFallback =
      !responseText.trim() || (validationResult.hadHallucinatedProperty && responseText.length < 30)

    // REGRA DE NEGÓCIO DE FOCO ABSOLUTO NO IMÓVEL DO LEAD & DESENCAIXE / BUSCA LIVRE (CORREÇÕES A, B, C, D):
    if (cannedDetected || isTooSimilar || needsCatalogFallback) {
      if (isMismatchDetected) {
        console.log(
          `[AI_REPLY] Desencaixe implícito ativo no fallback: pedindo confirmação sem empurrar imóvel.`,
        )
        responseText = `Peço desculpas pela confusão! Você poderia me confirmar o código (ex: #ARU341, #AP343) ou o link do imóvel que você gostaria de ver? Assim localizo exatamente a opção correta para você.`
      } else if (hasFreeSearchIntent && matchedProps.length === 0) {
        console.log(
          `[AI_REPLY] Busca livre sem match no fallback: informando transparência sem empurrar lançamentos.`,
        )
        responseText = `No momento não localizei imóveis disponíveis com essas características exatas na região solicitada. Você aceitaria opções em regiões próximas, ou prefere que eu verifique na nossa carteira de parceiros?`
      } else if (detectedSpecificPropertyQuery) {
        console.log(
          `[AI_REPLY] Specific property query detected for customer ${customerId}. Enforcing strict focus on requested property. Suppressing generic launch fallback.`,
        )
        const greeting = buildTemporalGreeting(displayName, brHour) + ' '
        if (matchedProps && matchedProps.length > 0) {
          const targetProp = matchedProps[0]
          const pTitle = (targetProp.getString('title') || '').trim()
          const pCode = (targetProp.getString('code') || '').trim()
          const pPrice = (targetProp.getString('price_formatted') || '').trim()
          const pNeigh = (targetProp.getString('neighborhood') || '').trim()
          const pCity = (targetProp.getString('city') || '').trim()
          const pBeds = targetProp.getInt('bedrooms')
          const pUrl = (targetProp.getString('url') || '').trim()

          let msg = `${greeting}Com certeza! Sobre o imóvel ${pCode ? `*${pCode}*` : ''}${pTitle ? ` (${pTitle})` : ''}`
          if (pNeigh || pCity) {
            msg += ` localizado em ${[pNeigh, pCity].filter(Boolean).join(', ')}`
          }
          if (pPrice) {
            msg += `, ele está disponível pelo valor de *${pPrice}*`
          }
          if (pBeds > 0) {
            msg += ` e conta com ${pBeds} dormitório${pBeds > 1 ? 's' : ''}`
          }
          msg += `.\n\n`
          if (pUrl) {
            msg += `Você pode conferir as fotos e a ficha completa aqui: ${pUrl}\n\n`
          }
          msg += `Quer que eu tire alguma dúvida específica sobre ele ou prefere agendar uma visita?`
          responseText = msg
        } else {
          // Imóvel citado NÃO foi encontrado na base
          responseText = `${greeting}Recebi sua solicitação sobre esse imóvel! Estou verificando os detalhes e a disponibilidade atualizada dele junto ao Mauro e já te retorno com as informações completas. Um instante, por favor!`
        }
      } else {
        console.log(
          `[AI_REPLY] Overriding with real catalog fallback for customer ${customerId} (canned=${cannedDetected}, similar=${isTooSimilar}, needsFallback=${needsCatalogFallback}).`,
        )
        try {
          const catalogMsg = generateCatalogFallbackMessage(matchedProps)
          if (catalogMsg && catalogMsg.trim()) {
            responseText = catalogMsg
          }
        } catch (fbErr) {
          console.error(`[AI_REPLY] generateCatalogFallbackMessage error: ${String(fbErr)}`)
          try {
            const logsCol = $app.findCollectionByNameOrId('system_logs')
            const fbErrLog = new Record(logsCol)
            fbErrLog.set('user_id', userId || '')
            fbErrLog.set('type', 'whatsapp_ai_reply_error')
            fbErrLog.set(
              'message',
              `Erro no generateCatalogFallbackMessage: ${fbErr.message || String(fbErr)}`,
            )
            fbErrLog.set('details', String(fbErr.stack || fbErr))
            fbErrLog.set(
              'payload',
              JSON.stringify({ customer_id: customerId, error: String(fbErr) }),
            )
            $app.saveNoValidate(fbErrLog)
          } catch (_) {}
        }
      }
    }

    // FINAL DEFENSIVE BARRIER — PREVENT INTERNAL EVALUATION / SUPERVISOR LEAKS
    // Checagem rigorosa antes de salvar e enviar: se contiver marcadores de avaliação interna,
    // descarta, gera log em system_logs (ai_self_check_blocked) e substitui por mensagem segura da Bia.
    if (isInternalEvaluationText(responseText)) {
      console.error(
        `[AI_REPLY] [DEFENSIVE BARRIER] Blocked internal evaluation text from leaking to customer ${customerId}! Preview: "${responseText.substring(0, 140)}"`,
      )

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const blockLog = new Record(logsCol)
        blockLog.set('user_id', userId || '')
        blockLog.set('type', 'ai_self_check_blocked')
        blockLog.set(
          'message',
          'Barreira defensiva abortou vazamento de avaliação de conformidade interna da IA para o cliente',
        )
        blockLog.set(
          'details',
          JSON.stringify({
            customer_id: customerId,
            blocked_text_full: responseText,
            blocked_preview: responseText.substring(0, 300),
          }),
        )
        blockLog.set(
          'payload',
          JSON.stringify({
            customer_id: customerId,
            preview: responseText.substring(0, 150),
          }),
        )
        $app.saveNoValidate(blockLog)
      } catch (logBlockErr) {
        console.warn(`[AI_REPLY] Error recording ai_self_check_blocked log: ${String(logBlockErr)}`)
      }

      // Substituição por fallback seguro: saudação temporal + identificação padrão "Bia, da BRF Imóveis" + pedido de perdão curto e continuidade
      if (isFirstAiMessageOrAfter24h) {
        const safeSalutation = buildTemporalGreeting(displayName, brHour)
        responseText = `${safeSalutation} Bia, da BRF Imóveis aqui. Peço desculpas pela mensagem anterior! Estou aqui para te ajudar a encontrar o imóvel ideal. Podemos continuar nossa conversa?`
      } else {
        responseText = `Peço desculpas pela mensagem anterior! Estou aqui para te ajudar a encontrar o imóvel ideal na BRF Imóveis. Podemos continuar nossa conversa?`
      }
    }

    // SANITIZAÇÃO WHATSAPP NA FUNÇÃO DE SAÍDA:
    // 1. Remove [HANDOVER: ...]
    // 2. **negrito** -> *negrito* (asterisco simples)
    // 3. headers ### removidos
    // 4. tabelas markdown -> linhas com "• campo — valor"
    // 5. colapsar 3+ quebras de linha em no máximo 2
    // 6. limitar ~900-950 chars com quebra amigável
    function formatWhatsAppOutput(txt) {
      if (!txt) return ''
      let formatted = txt

      // Remove handover tags e termos de transbordo
      formatted = formatted.replace(/\[HANDOVER:[^\]]*\]/gi, '').trim()
      formatted = formatted.replace(/\btransbordo\b/gi, 'atendimento especializado')
      formatted = formatted.replace(/\btrasbordo\b/gi, 'atendimento especializado')

      // Remove headers markdown (###, ##, #)
      formatted = formatted.replace(/^#{1,6}\s*(.*?)$/gm, '$1')

      // Converte tabelas markdown em linhas com bullet "• campo — valor"
      // Detecta bloco de tabela com | ... | ... |
      const lines = formatted.split('\n')
      const newLines = []
      let tableHeader = []
      let inTable = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith('|') && line.endsWith('|')) {
          const cells = line
            .slice(1, -1)
            .split('|')
            .map(function (c) {
              return c.trim()
            })

          // Linha separadora |---|---|
          if (
            cells.every(function (c) {
              return /^[-:\s]+$/.test(c)
            })
          ) {
            inTable = true
            continue
          }

          if (!inTable) {
            tableHeader = cells
            inTable = true
          } else {
            // Linha de dados: associa ao header correspondente
            const rowPairs = []
            for (let c = 0; c < cells.length; c++) {
              const hName = tableHeader[c] || `Item ${c + 1}`
              const val = cells[c]
              if (val) {
                rowPairs.push(`${hName}: ${val}`)
              }
            }
            if (rowPairs.length > 0) {
              newLines.push(`• ${rowPairs.join(' — ')}`)
            }
          }
        } else {
          inTable = false
          tableHeader = []
          newLines.push(lines[i])
        }
      }
      formatted = newLines.join('\n')

      // Converte **negrito** em *negrito* (WhatsApp usa asterisco simples para negrito)
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '*$1*')

      // Colapsa 3 ou mais quebras de linha em no máximo 2
      formatted = formatted.replace(/\n{3,}/g, '\n\n')

      // Limitar a ~900-950 chars com quebra amigável no final de frase ou parágrafo
      if (formatted.length > 950) {
        let cutPoint = formatted.lastIndexOf('\n\n', 950)
        if (cutPoint < 650) {
          cutPoint = formatted.lastIndexOf('. ', 950)
        }
        if (cutPoint < 650) {
          cutPoint = formatted.lastIndexOf('! ', 950)
        }
        if (cutPoint < 650) {
          cutPoint = formatted.lastIndexOf('? ', 950)
        }
        if (cutPoint > 500) {
          formatted = formatted.substring(0, cutPoint + 1).trim()
        } else {
          formatted = formatted.substring(0, 950).trim() + '...'
        }
      }

      return formatted.trim()
    }

    // FINAL UNCONDITIONAL SANITIZATION & CANNED INTERCEPTION
    // Guarantee that no supervisor metadata, headers, or canned sentences can slip through to WhatsApp
    responseText = sanitizeAiResponse(responseText)
    responseText = formatWhatsAppOutput(responseText)
    if (isCannedValuesSentence(responseText)) {
      console.warn('[AI_REPLY] Final check detected canned sentence')
      if (isMismatchDetected) {
        responseText = `Peço desculpas pela confusão! Você poderia me confirmar o código (ex: #ARU341, #AP343) ou o link do imóvel que você gostaria de ver? Assim localizo exatamente o que você procura.`
      } else if (hasFreeSearchIntent && matchedProps.length === 0) {
        responseText = `No momento não localizei imóveis disponíveis com essas características exatas na região solicitada. Você aceitaria opções em regiões próximas, ou prefere que eu verifique na nossa carteira de parceiros?`
      } else if (detectedSpecificPropertyQuery) {
        if (matchedProps && matchedProps.length > 0) {
          const targetProp = matchedProps[0]
          const pTitle = (targetProp.getString('title') || '').trim()
          const pCode = (targetProp.getString('code') || '').trim()
          const pPrice = (targetProp.getString('price_formatted') || '').trim()
          const pUrl = (targetProp.getString('url') || '').trim()
          responseText = `Sobre o imóvel ${pCode ? `*${pCode}*` : ''}${pTitle ? ` (${pTitle})` : ''}: ele está disponível por *${pPrice}*. Confira os detalhes em: ${pUrl}. Posso tirar alguma dúvida específica para você?`
        } else {
          responseText = `Recebi sua solicitação sobre esse imóvel! Estou verificando os detalhes dele junto ao Mauro e já te retorno com as informações completas.`
        }
      } else {
        responseText = generateCatalogFallbackMessage(matchedProps)
      }
      responseText = sanitizeAiResponse(responseText)
    }

    // Secondary defensive re-check on sanitized text
    if (isInternalEvaluationText(responseText)) {
      if (isFirstAiMessageOrAfter24h) {
        const safeSalutation = buildTemporalGreeting(displayName, brHour)
        responseText = `${safeSalutation} Bia, da BRF Imóveis. Como posso te ajudar na sua busca hoje?`
      } else {
        responseText = `Como posso te ajudar na sua busca hoje na BRF Imóveis?`
      }
    }
    responseText = formatWhatsAppOutput(responseText)

    // Duplicate message final guard
    let isDuplicate = false
    try {
      const currentLastMsgs = $app.findRecordsByFilter(
        'conversations',
        `customer_id = '${customerId}'`,
        '-created',
        1,
        0,
      )

      if (currentLastMsgs.length > 0) {
        const lastMsg = currentLastMsgs[0]
        if (lastMsg.id !== incomingMsgId && lastMsg.getString('sender') === 'ai') {
          const lastContent = (lastMsg.getString('content') || '').trim().toLowerCase()
          if (lastContent === responseText.trim().toLowerCase()) {
            isDuplicate = true
          }
        }
      }
    } catch (_) {}

    if (isDuplicate) {
      console.log(
        `[AI_REPLY] Duplicate response detected for customer ${customerId}, skipping send.`,
      )
      return e.next()
    }

    let sendAudio = false
    let sendVideo = false
    if (responseText.includes('[AUDIO]')) {
      sendAudio = true
      responseText = responseText.replace(/\[AUDIO\]/gi, '').trim()
    }
    if (responseText.includes('[VIDEO]')) {
      sendVideo = true
      responseText = responseText.replace(/\[VIDEO\]/gi, '').trim()
    }

    // Garantir saudação condicional: apenas na 1ª mensagem da IA ou quando hoursSinceLastAiMsg >= 24
    function ensureGreetingAtBeginning(txt, name, hour) {
      if (!txt) return buildTemporalGreeting(name, hour)
      var trimmed = txt.trim()
      var targetGreeting = buildTemporalGreeting(name, hour)
      var salutationWord = getTemporalGreetingWord(hour)

      // Regex para identificar se já começa com saudação temporal (com ou sem nome/pontuação)
      var greetingStartRegex = new RegExp(
        '^(?:\\*\\*)?(?:' + salutationWord + '|Olá|Ola|Oi)\\b[^\\n.!?]*[.!?,]?\\s*',
        'i',
      )

      if (greetingStartRegex.test(trimmed)) {
        // Já tem alguma saudação no início: substituir pela saudação padrão temporal + nome
        var rest = trimmed.replace(greetingStartRegex, '').trim()
        return rest ? targetGreeting + ' ' + rest : targetGreeting
      }

      // Não tem saudação: prefixar
      return targetGreeting + ' ' + trimmed
    }

    function removeLeadingGreeting(txt) {
      if (!txt) return ''
      var trimmed = txt.trim()
      var greetingRegex =
        /^(?:\*\*)?(?:Bom dia|Boa tarde|Boa noite|Olá|Ola|Oi)\b[^\\n.!?]*[.!?,]?\s*/i
      return trimmed.replace(greetingRegex, '').trim()
    }

    // Se o cliente enviou áudio/voz de qualquer formato no WhatsApp, responder com áudio (voz)
    const isCustomerVoice =
      customerMessage.startsWith('[Áudio do cliente]') ||
      customerMessage.startsWith('[Áudio transcrevido]') ||
      customerMessage.startsWith('[Áudio Recebido') ||
      incomingText.startsWith('[Áudio do cliente]') ||
      incomingText.startsWith('[Áudio transcrevido]') ||
      incomingText.startsWith('[Áudio Recebido')

    // Se a transcrição do áudio falhou, responder com pedido educado para escrever
    if (
      customerMessage.includes('[Áudio Recebido - não foi possível transcrever]') ||
      incomingText.includes('[Áudio Recebido - não foi possível transcrever]')
    ) {
      const audioFallbackGreeting = isFirstAiMessageOrAfter24h
        ? buildTemporalGreeting(displayName, brHour) + ' '
        : ''
      responseText = `${audioFallbackGreeting}Não consegui ouvir o seu áudio com clareza por aqui. Você poderia escrever por mensagem de texto ou mandar novamente? Assim consigo te atender perfeitamente!`
    } else if (isFirstAiMessageOrAfter24h) {
      // 1ª mensagem ou após 24h: assegurar saudação no início
      responseText = ensureGreetingAtBeginning(responseText, displayName, brHour)
    } else {
      // Meio do diálogo contínuo (<24h): remover saudações redundantes do início
      const cleanedGreeting = removeLeadingGreeting(responseText)
      if (cleanedGreeting) {
        responseText = cleanedGreeting
      }
    }

    if (isCustomerVoice && !sendAudio) {
      sendAudio = true
    }

    // Save reply to conversations table
    try {
      const reply = new Record($app.findCollectionByNameOrId('conversations'))
      reply.set('user_id', userId || '')
      reply.set('customer_id', customerId)
      reply.set('sender', 'ai')
      reply.set('content', responseText)
      reply.set('channel', conversationChannel)
      $app.save(reply)
      console.log(`[AI_REPLY] Saved AI conversation record for customer=${customerId}`)
    } catch (saveConvErr) {
      console.error(`[AI_REPLY] Failed to save conversation record: ${String(saveConvErr)}`)
    }

    // Update customer CRM status / stage
    try {
      const custToUpdate = $app.findRecordById('customers', customerId)
      const custStatusLower = (custToUpdate.getString('status') || '').toLowerCase()

      let targetStatus = ''
      const validStatuses = [
        'Captura + Identificação',
        'Validação no CRM',
        'Contato Personalizado',
        'Mapeamento de Perfil',
        'Nutrição Automática',
        'Agendamento de Visita',
        'Pré-Visita',
        'Pós-Visita',
        'Proposta e Negociação',
        'Fechamento e Pós-Venda',
        'Novo',
        'lead',
        'contact',
        'Qualificação',
        'Engajamento',
        'Demo Realiz.',
        'Visita',
        'Proposta',
        'Fechamento',
        'closed',
      ]

      if (detectedStatus && validStatuses.includes(detectedStatus)) {
        targetStatus = detectedStatus
      } else if (
        custStatusLower === 'novo' ||
        custStatusLower === 'lead novo' ||
        custStatusLower === 'base de clientes/novo lyd' ||
        custStatusLower === ''
      ) {
        targetStatus = 'Captura + Identificação'
      }

      let crmUpdated = false
      if (targetStatus && targetStatus !== custStatusLower) {
        custToUpdate.set('status', targetStatus)
        crmUpdated = true
      }

      const validPhases = ['Lead', 'Atendimento', 'Visita', 'Proposta', 'Fechamento']
      let targetPhase = ''
      if (detectedPhase && validPhases.includes(detectedPhase)) {
        targetPhase = detectedPhase
      } else if (targetStatus === 'Fechamento') {
        targetPhase = 'Fechamento'
      }

      if (targetPhase && custToUpdate.getString('phase') !== targetPhase) {
        custToUpdate.set('phase', targetPhase)
        crmUpdated = true
      }

      if (detectedPermuta) {
        const currentNotes = custToUpdate.getString('notes') || ''
        if (!currentNotes.includes('[INTERESSE EM PERMUTA]')) {
          custToUpdate.set('notes', `[INTERESSE EM PERMUTA] ${currentNotes}`.trim())
          crmUpdated = true
          detectedHandover = detectedHandover || 'Mauro'
        }
      }

      if (detectedProfile) {
        const validProfiles = ['Investidor', 'Morador', 'Primeiro Imóvel', 'Veranista']
        if (validProfiles.includes(detectedProfile)) {
          custToUpdate.set('lead_profile', detectedProfile)
          crmUpdated = true
        }
      }

      if (detectedPriceRange) {
        custToUpdate.set('price_range', detectedPriceRange)
        crmUpdated = true
      }

      if (detectedNeighborhood) {
        custToUpdate.set('neighborhood', detectedNeighborhood)
        crmUpdated = true
      }

      if (detectedUrgency > 0) {
        custToUpdate.set('urgency', detectedUrgency)
        crmUpdated = true
      }

      if (detectedHandover) {
        let custTags = custToUpdate.get('tags')
        if (!Array.isArray(custTags)) custTags = []
        if (!custTags.includes('ai_paused')) {
          custTags.push('ai_paused')
          custToUpdate.set('tags', custTags)
          crmUpdated = true
        }
      }

      if (crmUpdated) {
        $app.saveNoValidate(custToUpdate)
        console.log(
          `[AI_REPLY] CRM updated for customer=${customerId} (status=${targetStatus || 'unchanged'})`,
        )
      }
    } catch (crmErr) {
      console.warn(`[AI_REPLY] CRM status update non-fatal error: ${String(crmErr)}`)
    }

    // Resolve WhatsApp Meta credentials
    let metaToken = userRecord ? userRecord.getString('meta_whatsapp_access_token') : ''
    let metaPhoneId = userRecord ? userRecord.getString('meta_whatsapp_phone_number_id') : ''

    if (!metaToken || !metaPhoneId) {
      try {
        const usersWithMeta = $app.findRecordsByFilter(
          'users',
          "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
          '-created',
          1,
          0,
        )
        if (usersWithMeta.length > 0) {
          metaToken = usersWithMeta[0].getString('meta_whatsapp_access_token')
          metaPhoneId = usersWithMeta[0].getString('meta_whatsapp_phone_number_id')
        }
      } catch (_) {}
    }

    let cleanPhone = customerPhone.replace(/\D/g, '')
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone
    }

    // CORREÇÃO 1 — DEDUP POR CONTEÚDO NORMALIZADO (SUBSTITUINDO O DEDUP TEMPORAL DE 45s)
    // Normalizar texto (trim + colapsar espaços/quebras repetidas) e comparar com a última mensagem 'ai'
    // REALMENTE ENVIADA ao WhatsApp registrada nos logs da Meta (status=200/ok=true).
    // Bloquear APENAS se o conteúdo for idêntico. Mensagens regeneradas ou corrigidas DEVEM SEMPRE ser enviadas!
    function normalizeMsgContent(txt) {
      if (!txt) return ''
      return String(txt).replace(/\s+/g, ' ').trim().toLowerCase()
    }

    const normalizedCurrentResponse = normalizeMsgContent(responseText)
    let isContentIdenticalToLastSent = false
    let lastSentPreviewLogged = ''

    try {
      const recentAiLogs = $app.findRecordsByFilter(
        'system_logs',
        `type = 'whatsapp_ai_send' && payload ~ '${customerId}'`,
        '-created',
        5,
        0,
      )

      for (let lIdx = 0; lIdx < recentAiLogs.length; lIdx++) {
        const logItem = recentAiLogs[lIdx]
        const detailsStr = logItem.getString('details') || ''
        let isRealMetaOk = false
        try {
          const det = JSON.parse(detailsStr)
          if (det && det.statusCode >= 200 && det.statusCode < 300) {
            isRealMetaOk = true
          }
        } catch (_) {}

        if (!isRealMetaOk) {
          const msgStr = logItem.getString('message') || ''
          if (msgStr.includes('sucesso')) {
            isRealMetaOk = true
          }
        }

        if (isRealMetaOk) {
          const payloadStr = logItem.getString('payload') || ''
          let sentText = ''
          try {
            const pObj = JSON.parse(payloadStr)
            sentText = pObj.preview || pObj.full_text || ''
          } catch (_) {}

          if (sentText) {
            const normalizedSent = normalizeMsgContent(sentText)
            lastSentPreviewLogged = sentText.substring(0, 60)
            // Se o texto normalizado for idêntico ao já enviado ou prefixo exato caso o preview tenha sido truncado
            if (
              normalizedSent === normalizedCurrentResponse ||
              (normalizedSent.length >= 80 && normalizedCurrentResponse.startsWith(normalizedSent))
            ) {
              isContentIdenticalToLastSent = true
              break
            }
          }
        }
      }
    } catch (dedupErr) {
      console.warn(`[AI_REPLY] Erro não fatal no check de dedup de conteúdo: ${String(dedupErr)}`)
    }

    if (isContentIdenticalToLastSent) {
      console.log(
        `[AI_REPLY] DEDUP DE CONTEÚDO ATIVADO: resposta idêntica à última já enviada via WhatsApp para lead ${customerId} (preview="${lastSentPreviewLogged}"). Bloqueando envio duplicado.`,
      )
      return e.next()
    }

    // Send WhatsApp reply via Meta Cloud API v21.0
    if ((conversationChannel === 'whatsapp' || !conversationChannel) && metaToken && metaPhoneId) {
      console.log(
        `[AI_REPLY] Sending WhatsApp to Meta Graph API v21.0 (phone_id=${metaPhoneId}, to=${cleanPhone})...`,
      )

      const sendRes = callMetaWithRetry(
        `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`,
        'POST',
        { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
        JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: responseText },
        }),
      )

      const isOk = sendRes && sendRes.statusCode >= 200 && sendRes.statusCode < 300
      console.log(
        `[AI_REPLY] Meta WhatsApp send result: status=${sendRes ? sendRes.statusCode : 'none'} ok=${isOk}`,
      )

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRec = new Record(logsCol)
        logRec.set('user_id', userId || '')
        logRec.set('type', 'whatsapp_ai_send')
        logRec.set(
          'message',
          isOk
            ? `Resposta da IA enviada com sucesso para ${cleanPhone}`
            : `Falha ao enviar resposta da IA para ${cleanPhone} (status=${sendRes ? sendRes.statusCode : 'none'})`,
        )
        logRec.set(
          'details',
          JSON.stringify({
            statusCode: sendRes ? sendRes.statusCode : 0,
            response: sendRes ? sendRes.json || sendRes.body : null,
            phone_id: metaPhoneId,
            to: cleanPhone,
          }),
        )
        logRec.set(
          'payload',
          JSON.stringify({
            preview: responseText.substring(0, 120),
            full_text: responseText,
            customer_id: customerId,
          }),
        )
        $app.saveNoValidate(logRec)
      } catch (logErr) {
        console.warn(`[AI_REPLY] Failed to log whatsapp_ai_send: ${String(logErr)}`)
      }

      // Audio (optional)
      if (sendAudio) {
        const openAiKey = $os.getenv('OPENAI_API_KEY')
        if (openAiKey) {
          try {
            const ttsRes = callMetaWithRetry(
              'https://api.openai.com/v1/audio/speech',
              'POST',
              { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
              JSON.stringify({
                model: 'tts-1',
                input: responseText || 'Olá',
                voice: userRecord ? userRecord.getString('ai_voice_id') || 'nova' : 'nova',
              }),
            )

            if (ttsRes && ttsRes.statusCode === 200 && ttsRes.body) {
              const boundary = '----Boundary' + $security.randomString(16)
              const headerStr = `--${boundary}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.ogg"\r\nContent-Type: audio/ogg\r\n\r\n`
              const footerStr = `\r\n--${boundary}--\r\n`

              const headerBytes = new Uint8Array(headerStr.length)
              for (let i = 0; i < headerStr.length; i++) headerBytes[i] = headerStr.charCodeAt(i)
              const footerBytes = new Uint8Array(footerStr.length)
              for (let i = 0; i < footerStr.length; i++) footerBytes[i] = footerStr.charCodeAt(i)

              const bodyBytes = new Uint8Array(
                headerBytes.length + ttsRes.body.length + footerBytes.length,
              )
              bodyBytes.set(headerBytes, 0)
              bodyBytes.set(ttsRes.body, headerBytes.length)
              bodyBytes.set(footerBytes, headerBytes.length + ttsRes.body.length)

              const mediaRes = callMetaWithRetry(
                `https://graph.facebook.com/v21.0/${metaPhoneId}/media`,
                'POST',
                {
                  Authorization: `Bearer ${metaToken}`,
                  'Content-Type': `multipart/form-data; boundary=${boundary}`,
                },
                bodyBytes.buffer,
              )

              if (mediaRes && mediaRes.statusCode === 200 && mediaRes.json && mediaRes.json.id) {
                callMetaWithRetry(
                  `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`,
                  'POST',
                  { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
                  JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: cleanPhone,
                    type: 'audio',
                    audio: { id: mediaRes.json.id },
                  }),
                )
              }
            }
          } catch (audioErr) {
            console.warn(`[AI_REPLY] Audio TTS/Upload failed (non-fatal): ${String(audioErr)}`)
          }
        }
      }
    } else if (conversationChannel === 'whatsapp' && (!metaToken || !metaPhoneId)) {
      console.warn(
        `[AI_REPLY] WhatsApp send skipped: missing metaToken or metaPhoneId (token=${!!metaToken}, phoneId=${metaPhoneId})`,
      )
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const warnLog = new Record(logsCol)
        warnLog.set('user_id', userId || '')
        warnLog.set('type', 'whatsapp_ai_reply_error')
        warnLog.set('message', 'Credenciais Meta WhatsApp ausentes no usuário')
        warnLog.set('details', `metaToken=${!!metaToken}, metaPhoneId=${metaPhoneId}`)
        $app.saveNoValidate(warnLog)
      } catch (_) {}
    }

    // Messenger channel
    if (conversationChannel === 'messenger' && responseText) {
      try {
        const messengerNotes = customer.getString('notes') || ''
        const psidMatch = messengerNotes.match(/Messenger PSID:\s*(\S+)/)
        const psid = psidMatch ? psidMatch[1] : ''
        const pageToken = userRecord
          ? userRecord.getString('meta_page_access_token') ||
            userRecord.getString('meta_instagram_page_token') ||
            ''
          : ''
        if (psid && pageToken) {
          callMetaWithRetry(
            'https://graph.facebook.com/v22.0/me/messages',
            'POST',
            { Authorization: 'Bearer ' + pageToken, 'Content-Type': 'application/json' },
            JSON.stringify({ recipient: { id: psid }, message: { text: responseText } }),
          )
        }
      } catch (mErr) {
        console.warn(`[AI_REPLY] Messenger send error (non-fatal): ${String(mErr)}`)
      }
    }

    // Instagram channel
    if (conversationChannel === 'instagram' && responseText) {
      try {
        const igNotes = customer.getString('notes') || ''
        const igSenderIdMatch = igNotes.match(/IG Sender ID:\s*(\S+)/)
        const igSenderId = igSenderIdMatch ? igSenderIdMatch[1] : ''
        const igToken = userRecord
          ? userRecord.getString('meta_instagram_page_token') ||
            userRecord.getString('meta_capi_token') ||
            ''
          : ''
        const igBusinessId = userRecord
          ? userRecord.getString('meta_instagram_business_id') || ''
          : ''
        if (igSenderId && igToken) {
          callMetaWithRetry(
            'https://graph.facebook.com/v22.0/' + (igBusinessId || 'me') + '/messages',
            'POST',
            { Authorization: 'Bearer ' + igToken, 'Content-Type': 'application/json' },
            JSON.stringify({ recipient: { id: igSenderId }, message: { text: responseText } }),
          )
        }
      } catch (igErr) {
        console.warn(`[AI_REPLY] Instagram send error (non-fatal): ${String(igErr)}`)
      }
    }

    // Handover notification
    if (detectedHandover) {
      try {
        const summaryText = `*🚨 Transbordo de Lead 🚨*\n*Lead:* ${customer.getString('name')} (${customer.getString('phone')})\n*Destino:* ${detectedHandover}\n*Mensagem:* ${responseText.substring(0, 120)}`
        const agentPhone = detectedHandover.toLowerCase().includes('mauro')
          ? '554899728050'
          : '5548991958012'

        if (metaToken && metaPhoneId) {
          callMetaWithRetry(
            `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`,
            'POST',
            { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
            JSON.stringify({
              messaging_product: 'whatsapp',
              to: agentPhone,
              type: 'text',
              text: { body: summaryText },
            }),
          )
        }
      } catch (handoverErr) {
        console.warn(`[AI_REPLY] Handover notification error (non-fatal): ${String(handoverErr)}`)
      }
    }

    // ======================================================================
    // CONSTITUIÇÃO DA BIA v2.0 - ART. 6: ANÁLISE DE CRÉDITO & CONSENTIMENTO
    // ======================================================================
    try {
      const lowerCust = (customerMessage || '').toLowerCase()
      const lowerResp = (responseText || '').toLowerCase()
      let currentCreditStatus = customer.getString('credit_analysis_status') || 'nao_oferecido'

      // Idempotência estrita: se já foi enviado, NUNCA disparar novamente nem regredir status
      if (currentCreditStatus === 'enviado') {
        console.log(
          `[CREDIT_FLOW] Cliente ${customerId} já possui status 'enviado'. Idempotência mantida, nenhum reenvio.`,
        )
      } else {
        // 1. Detectar se a Bia acabou de oferecer a análise para a Neuci nesta resposta
        const respOffersCredit =
          lowerResp.includes('neuci') ||
          lowerResp.includes('posso encaminhar você para a minha agente neuci') ||
          lowerResp.includes('encaminhar você para a minha agente neuci') ||
          lowerResp.includes('encaminhar para a neuci') ||
          (lowerResp.includes('análise de crédito') &&
            (lowerResp.includes('neuci') ||
              lowerResp.includes('agente') ||
              lowerResp.includes('posso encaminhar') ||
              lowerResp.includes('posso te encaminhar')))

        if (respOffersCredit && currentCreditStatus !== 'oferecido') {
          customer.set('credit_analysis_status', 'oferecido')
          customer.set('credit_analysis_offered_at', new Date().toISOString())
          $app.saveNoValidate(customer)
          currentCreditStatus = 'oferecido'
          console.log(
            `[CREDIT_FLOW] Análise de crédito oferecida ao cliente ${customerId} (status -> oferecido)`,
          )
        }

        // 2. Se o status é oferecido, verificar consentimento ou recusa expressa do cliente
        if (currentCreditStatus === 'oferecido') {
          // Consentimento explícito: sim, pode encaminhar, claro, por favor, quero, pode sim, etc.
          const isConsent =
            /\b(sim|com certeza|pode|pode sim|claro|por favor|quero|aceito|concordo|encaminha|manda|pode mandar|pode encaminhar|ok|perfeito|pode ser|gostaria|autorizo|faz favor)\b/i.test(
              lowerCust,
            )
          // Recusa explícita: não, deixa pra lá, agora não, prefiro não, etc.
          const isRefusal =
            /\b(n[aã]o|depois|agora n[aã]o|ainda n[aã]o|n[aã]o precisa|deixa|deixa pra l[aá]|prefiro n[aã]o|dispens|n[aã]o quero)\b/i.test(
              lowerCust,
            )

          if (isConsent && !isRefusal) {
            console.log(
              `[CREDIT_FLOW] Consentimento CONFIRMADO pelo cliente ${customerId}! Iniciando disparo SIMULTÂNEO Neuci + Mauro...`,
            )

            // Resolução de dados do imóvel em foco
            let propCode = ''
            let propUrl = ''
            if (targetSpecificProp) {
              propCode = (targetSpecificProp.getString('code') || '').trim()
              propUrl = (targetSpecificProp.getString('url') || '').trim()
            } else if (matchedLaunch) {
              propCode = (
                matchedLaunch.getString('enterprise_name') ||
                matchedLaunch.getString('name') ||
                ''
              ).trim()
              propUrl = (
                matchedLaunch.getString('website_url') ||
                matchedLaunch.getString('url') ||
                ''
              ).trim()
            } else if (matchedProps && matchedProps.length > 0) {
              propCode = (matchedProps[0].getString('code') || '').trim()
              propUrl = (matchedProps[0].getString('url') || '').trim()
            }

            // Fallback de URL canônica do imóvel no portal oficial brfimoveis.com.br
            if (!propUrl && propCode) {
              const cleanCode = propCode.replace(/\s+/g, '').toLowerCase()
              propUrl = `https://brfimoveis.com.br/imovel/${cleanCode}`
            }
            if (!propUrl) {
              propUrl = 'https://brfimoveis.com.br'
            }

            // Resolução do nome do cliente
            const clientCustName =
              customer.getString('name') ||
              customer.getString('first_name') ||
              displayName ||
              'Cliente'

            // Resolução do telefone do cliente (formatado para fácil contato direto)
            const clientPhoneRaw = customer.getString('phone') || ''

            const msgNeuci = `cliente ${clientCustName} pretende uma análise de crédito para comprar o imóvel ${propCode || 'em foco'}\nLink: ${propUrl}\nTelefone do cliente: ${clientPhoneRaw}`
            const msgMauro = `cliente ${clientCustName} foi solicitado análise de crédito para o imóvel ${propCode || 'em foco'}\nLink: ${propUrl}\nTelefone do cliente: ${clientPhoneRaw}`

            // Números oficiais: Neuci (48) 99902-0349 -> 5548999020349 / Mauro (48) 99972-8050 -> 5548999728050
            const phoneNeuci = '5548999020349'
            const phoneMauro = '5548999728050'

            let neuciSuccess = false
            let mauroSuccess = false
            let dispatchErrorDetails = []

            if (metaToken && metaPhoneId) {
              // 1. WhatsApp para Neuci
              try {
                const resNeuci = callMetaWithRetry(
                  `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`,
                  'POST',
                  { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
                  JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phoneNeuci,
                    type: 'text',
                    text: { body: msgNeuci },
                  }),
                )
                if (resNeuci && resNeuci.statusCode >= 200 && resNeuci.statusCode < 300) {
                  neuciSuccess = true
                  console.log(
                    `[CREDIT_FLOW] WhatsApp enviado com sucesso para Neuci (${phoneNeuci}).`,
                  )
                } else {
                  const bStr = resNeuci ? String.fromCharCode.apply(null, resNeuci.body || []) : ''
                  dispatchErrorDetails.push(
                    `Neuci status ${resNeuci ? resNeuci.statusCode : 'null'}: ${bStr}`,
                  )
                }
              } catch (neuciErr) {
                console.warn(`[CREDIT_FLOW] Exceção ao notificar Neuci: ${String(neuciErr)}`)
                dispatchErrorDetails.push(`Neuci err: ${String(neuciErr)}`)
              }

              // 2. WhatsApp simultâneo para Mauro
              try {
                const resMauro = callMetaWithRetry(
                  `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`,
                  'POST',
                  { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
                  JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phoneMauro,
                    type: 'text',
                    text: { body: msgMauro },
                  }),
                )
                if (resMauro && resMauro.statusCode >= 200 && resMauro.statusCode < 300) {
                  mauroSuccess = true
                  console.log(
                    `[CREDIT_FLOW] WhatsApp enviado com sucesso para Mauro (${phoneMauro}).`,
                  )
                } else {
                  const bStr = resMauro ? String.fromCharCode.apply(null, resMauro.body || []) : ''
                  dispatchErrorDetails.push(
                    `Mauro status ${resMauro ? resMauro.statusCode : 'null'}: ${bStr}`,
                  )
                }
              } catch (mauroErr) {
                console.warn(`[CREDIT_FLOW] Exceção ao notificar Mauro: ${String(mauroErr)}`)
                dispatchErrorDetails.push(`Mauro err: ${String(mauroErr)}`)
              }
            } else {
              dispatchErrorDetails.push('Meta credentials ausentes no momento do envio.')
            }

            // Registrar tentativa / log do fluxo de análise de crédito
            try {
              const logsCol = $app.findCollectionByNameOrId('system_logs')
              const creditLog = new Record(logsCol)
              creditLog.set('user_id', userId || '')
              creditLog.set(
                'type',
                neuciSuccess && mauroSuccess
                  ? 'credit_analysis_sent'
                  : 'credit_analysis_dispatch_attempt',
              )
              creditLog.set(
                'message',
                neuciSuccess && mauroSuccess
                  ? `Consentimento confirmado: Análise de crédito encaminhada simultaneamente à Neuci (${phoneNeuci}) e Mauro (${phoneMauro}) para imóvel ${propCode || 'em foco'}`
                  : `Consentimento confirmado para cliente ${clientCustName}, mas envio degradado/parcial: ${dispatchErrorDetails.join(' | ')}`,
              )
              creditLog.set(
                'payload',
                JSON.stringify({
                  customer_id: customerId,
                  customer_name: clientCustName,
                  customer_phone: clientPhoneRaw,
                  property_code: propCode,
                  property_url: propUrl,
                  neuci_success: neuciSuccess,
                  mauro_success: mauroSuccess,
                  errors: dispatchErrorDetails,
                }),
              )
              $app.saveNoValidate(creditLog)
            } catch (logErr) {
              console.warn(
                `[CREDIT_FLOW] Falha ao registrar system_log de análise: ${String(logErr)}`,
              )
            }

            // Atualização coerente do status do cliente:
            // O consentimento foi dado e registrado com timestamp
            customer.set('credit_analysis_consented_at', new Date().toISOString())
            customer.set('credit_analysis_status', 'enviado')
            $app.saveNoValidate(customer)
            console.log(
              `[CREDIT_FLOW] Cliente ${customerId} atualizado com status='enviado' e credit_analysis_consented_at gravado.`,
            )
          } else if (isRefusal) {
            customer.set('credit_analysis_status', 'recusado')
            $app.saveNoValidate(customer)
            console.log(
              `[CREDIT_FLOW] Cliente ${customerId} recusou a análise de crédito expressamente. Nenhum disparo executado.`,
            )
          } else {
            console.log(
              `[CREDIT_FLOW] Cliente ${customerId} com análise oferecida não expressou consentimento explícito. Nenhum disparo efetuado.`,
            )
          }
        }
      }
    } catch (creditFlowErr) {
      console.warn(`[CREDIT_FLOW] Erro no fluxo de análise de crédito: ${String(creditFlowErr)}`)
    }

    console.log(`[AI_REPLY] Completed processing for customer=${customerId}`)
  } catch (err) {
    console.error(`[AI_REPLY] Top-level error for customer ${customerId}: ${String(err)}`)
    let topLevelErrorDetails = String(err.stack || err)
    let topLevelErrorMessage = err.message || String(err)
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const errLog = new Record(logsCol)
      errLog.set('user_id', userId || '')
      errLog.set('type', 'whatsapp_ai_reply_error')
      errLog.set(
        'message',
        `Erro geral no processamento de resposta da IA: ${topLevelErrorMessage}`,
      )
      errLog.set('details', topLevelErrorDetails)
      errLog.set(
        'payload',
        JSON.stringify({ customer_id: customerId, error: topLevelErrorMessage }),
      )
      $app.saveNoValidate(errLog)
    } catch (_) {}

    // Resilient fallback: JAMAIS reiniciar a conversa nem trocar de imóvel
    try {
      if (customerId && (conversationChannel === 'whatsapp' || !conversationChannel)) {
        console.log(
          `[AI_REPLY] Top-level catch attempting resilient focus fallback for ${customerId}...`,
        )
        let emergencyReply = ''

        try {
          // Cálculo autônomo de horário e saudação (sem depender de variáveis/funções externas)
          var fbHour = new Date(Date.now() - 3 * 3600 * 1000).getUTCHours()
          var fbSalutation = fbHour < 12 ? 'Bom dia' : fbHour < 18 ? 'Boa tarde' : 'Boa noite'

          var custDisplayName = ''
          try {
            var custRec = $app.findRecordById('customers', customerId)
            var cName = (custRec.getString('first_name') || custRec.getString('name') || '').trim()
            if (cName && !cName.includes('+') && !/^\d+$/.test(cName)) {
              custDisplayName = cName.split(' ')[0]
            }
          } catch (_) {}

          var emGreeting = custDisplayName
            ? fbSalutation + ', ' + custDisplayName + '! '
            : fbSalutation + '! '

          // Obter histórico de mensagens recentes da IA para não repetir a mesma mensagem em sequência
          var recentAiTexts = []
          try {
            var lastAiConvs = $app.findRecordsByFilter(
              'conversations',
              "customer_id = '" + customerId + "' && sender = 'ai'",
              '-created',
              4,
              0,
            )
            for (var aiIdx = 0; aiIdx < lastAiConvs.length; aiIdx++) {
              var cTxt = (lastAiConvs[aiIdx].getString('content') || '').trim().toLowerCase()
              if (cTxt) recentAiTexts.push(cTxt)
            }
          } catch (_) {}

          // Determinar se já houve interação recente para não saudar repetidamente em diálogo contínuo
          var isConversationOngoing = recentAiTexts.length > 0
          var effectiveGreeting = isConversationOngoing ? '' : emGreeting

          // REGRA CRÍTICA: Manter continuidade do imóvel em foco sem nunca reiniciar a conversa nem citar outro imóvel
          // Não usar propInFocus se o lead não pediu imóvel específico e matchedProps foi preenchido por catálogo genérico
          var realTargetProp = null
          if (targetSpecificProp) {
            realTargetProp = targetSpecificProp
          } else if (
            typeof detectedSpecificPropertyQuery !== 'undefined' &&
            detectedSpecificPropertyQuery &&
            matchedProps &&
            matchedProps.length > 0
          ) {
            realTargetProp = matchedProps[0]
          }

          if (realTargetProp) {
            var propInFocus = realTargetProp
            var pCode = (propInFocus.getString('code') || '').trim()
            var pTitle = (propInFocus.getString('title') || '').trim()
            var pPrice = (propInFocus.getString('price_formatted') || '').trim()
            var pUrl = (propInFocus.getString('url') || '').trim()
            var propId = pCode ? '*' + pCode + '*' : pTitle ? '*' + pTitle + '*' : 'em foco'

            var variations = [
              effectiveGreeting +
                'Com certeza! Em relação ao imóvel ' +
                propId +
                (pPrice ? ' (valor de ' + pPrice + ')' : '') +
                ', estou separando o material completo e as plantas para você.\n\nVocê prefere receber por aqui no WhatsApp ou deseja agendar uma visita com o Mauro no local?' +
                (pUrl ? '\nFicha detalhada: ' + pUrl : ''),

              effectiveGreeting +
                'Perfeito! Já estou levantando as informações atualizadas do imóvel ' +
                propId +
                (pPrice ? ' (anunciado por ' + pPrice + ')' : '') +
                '.\n\nQuer que eu tire alguma dúvida específica sobre a planta ou localização?' +
                (pUrl ? '\nLink oficial: ' + pUrl : ''),

              effectiveGreeting +
                'Excelente escolha! O imóvel ' +
                propId +
                (pPrice ? ' (' + pPrice + ')' : '') +
                ' é uma excelente oportunidade. Estou organizando o espelho de disponibilidade e os diferenciais dele para te passar.\n\nVocê prefere tirar dúvidas por aqui ou deseja agendar uma visita no local?' +
                (pUrl ? '\nConfira aqui: ' + pUrl : ''),

              effectiveGreeting +
                'Recebido! Estou conferindo os detalhes do imóvel ' +
                propId +
                ' para te atender da melhor forma.\n\nPosso te enviar o material completo por aqui?' +
                (pUrl ? '\nDetalhes: ' + pUrl : ''),
            ]

            // Seleciona uma variação que ainda não foi enviada recentemente
            emergencyReply = variations[0]
            for (var vIdx = 0; vIdx < variations.length; vIdx++) {
              var candNorm = variations[vIdx].trim().toLowerCase()
              var alreadySent = false
              for (var rIdx = 0; rIdx < recentAiTexts.length; rIdx++) {
                if (
                  recentAiTexts[rIdx] === candNorm ||
                  recentAiTexts[rIdx].indexOf(candNorm.substring(0, 40)) !== -1
                ) {
                  alreadySent = true
                  break
                }
              }
              if (!alreadySent) {
                emergencyReply = variations[vIdx]
                break
              }
            }
          } else if (
            typeof detectedSpecificPropertyQuery !== 'undefined' &&
            detectedSpecificPropertyQuery
          ) {
            var specVariations = [
              effectiveGreeting +
                'Recebi sua solicitação sobre esse imóvel! Estou verificando os detalhes atualizados junto ao Mauro e já te envio as informações completas por aqui.',
              effectiveGreeting +
                'Já estou localizando a ficha e disponibilidade desse imóvel junto à nossa equipe. Em instantes te passo tudo por aqui!',
              effectiveGreeting +
                'Perfeito! Estou consultando o espelho atualizado deste imóvel com o Mauro e retorno em seguida com os dados completos.',
            ]
            emergencyReply = specVariations[0]
            for (var svIdx = 0; svIdx < specVariations.length; svIdx++) {
              var sCandNorm = specVariations[svIdx].trim().toLowerCase()
              var sAlreadySent = false
              for (var srIdx = 0; srIdx < recentAiTexts.length; srIdx++) {
                if (recentAiTexts[srIdx] === sCandNorm) {
                  sAlreadySent = true
                  break
                }
              }
              if (!sAlreadySent) {
                emergencyReply = specVariations[svIdx]
                break
              }
            }
          } else if (typeof hasFreeSearchIntent !== 'undefined' && hasFreeSearchIntent) {
            var freeSearchVariations = [
              effectiveGreeting +
                'Recebi sua solicitação de busca! Estou consultando a carteira da BRF Imóveis e nossos parceiros para localizar opções nesse perfil. Em instantes te trago o retorno.',
              effectiveGreeting +
                'Já iniciei o levantamento das opções compatíveis na região solicitada junto ao Mauro. Assim que mapear as unidades disponíveis te envio por aqui.',
            ]
            emergencyReply = freeSearchVariations[0]
          } else {
            var genVariations = [
              effectiveGreeting +
                'Recebi sua mensagem! Estou organizando as informações detalhadas para você. Em instantes já te trago o retorno completo.',
              effectiveGreeting +
                'Tudo certo! Já registrei sua solicitação e estou separando as melhores opções para você. Um momento, por favor!',
              effectiveGreeting +
                'Obrigada pelo contato! Estou consultando os dados necessários para te responder com precisão. Já te envio o retorno!',
            ]
            emergencyReply = genVariations[0]
            for (var gvIdx = 0; gvIdx < genVariations.length; gvIdx++) {
              var gCandNorm = genVariations[gvIdx].trim().toLowerCase()
              var gAlreadySent = false
              for (var grIdx = 0; grIdx < recentAiTexts.length; grIdx++) {
                if (recentAiTexts[grIdx] === gCandNorm) {
                  gAlreadySent = true
                  break
                }
              }
              if (!gAlreadySent) {
                emergencyReply = genVariations[gvIdx]
                break
              }
            }
          }

          // Gravação da mensagem em conversations (try/catch interno)
          try {
            var convCol = $app.findCollectionByNameOrId('conversations')
            var rec = new Record(convCol)
            rec.set('user_id', userId || '')
            rec.set('customer_id', customerId)
            rec.set('sender', 'ai')
            rec.set('content', emergencyReply)
            rec.set('channel', conversationChannel || 'whatsapp')
            $app.save(rec)
          } catch (convSaveErr) {
            console.warn(
              '[AI_REPLY] Emergency fallback conversation save error: ' + String(convSaveErr),
            )
          }

          // Resolução de credenciais WhatsApp e envio via WhatsApp (try/catch interno)
          try {
            var emMetaToken = ''
            var emPhoneId = ''
            try {
              var usersWithMeta = $app.findRecordsByFilter(
                'users',
                "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
                '-created',
                1,
                0,
              )
              if (usersWithMeta.length > 0) {
                emMetaToken = usersWithMeta[0].getString('meta_whatsapp_access_token')
                emPhoneId = usersWithMeta[0].getString('meta_whatsapp_phone_number_id')
              }
            } catch (_) {}

            var emCustomerPhone = ''
            try {
              var cRec = $app.findRecordById('customers', customerId)
              emCustomerPhone = cRec.getString('phone') || ''
            } catch (_) {}

            var emCleanPhone = emCustomerPhone.replace(/\D/g, '')
            if (emCleanPhone.length === 10 || emCleanPhone.length === 11) {
              emCleanPhone = '55' + emCleanPhone
            }

            if (emMetaToken && emPhoneId && emCleanPhone) {
              // CORREÇÃO 1 (FALLBACK): Dedup por conteúdo normalizado também no fallback de emergência
              var normEmReply = (emergencyReply || '').replace(/\s+/g, ' ').trim().toLowerCase()
              var isEmIdentical = false
              var lastEmSentPreview = ''
              try {
                var recentEmLogs = $app.findRecordsByFilter(
                  'system_logs',
                  "type = 'whatsapp_ai_send' && payload ~ '" + customerId + "'",
                  '-created',
                  3,
                  0,
                )
                for (var emLIdx = 0; emLIdx < recentEmLogs.length; emLIdx++) {
                  var emItem = recentEmLogs[emLIdx]
                  var emPayStr = emItem.getString('payload') || ''
                  var emSentTxt = ''
                  try {
                    var emPObj = JSON.parse(emPayStr)
                    emSentTxt = emPObj.preview || emPObj.full_text || ''
                  } catch (_) {}
                  if (emSentTxt) {
                    var normPrev = emSentTxt.replace(/\s+/g, ' ').trim().toLowerCase()
                    if (
                      normPrev === normEmReply ||
                      (normPrev.length >= 80 && normEmReply.indexOf(normPrev) === 0)
                    ) {
                      isEmIdentical = true
                      lastEmSentPreview = emSentTxt.substring(0, 60)
                      break
                    }
                  }
                }
              } catch (_) {}

              if (isEmIdentical) {
                console.log(
                  '[AI_REPLY] Emergency fallback cancelado por DEDUP DE CONTEÚDO idêntico (preview="' +
                    lastEmSentPreview +
                    '").',
                )
              } else {
                var emSendRes = callMetaWithRetry(
                  'https://graph.facebook.com/v21.0/' + emPhoneId + '/messages',
                  'POST',
                  { Authorization: 'Bearer ' + emMetaToken, 'Content-Type': 'application/json' },
                  JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: emCleanPhone,
                    type: 'text',
                    text: { body: emergencyReply },
                  }),
                )
                var emIsOk = emSendRes && emSendRes.statusCode >= 200 && emSendRes.statusCode < 300
                console.log(
                  '[AI_REPLY] Emergency fallback sent to ' + emCleanPhone + ' ok=' + emIsOk,
                )

                try {
                  var logsColFb = $app.findCollectionByNameOrId('system_logs')
                  var logRecFb = new Record(logsColFb)
                  logRecFb.set('user_id', userId || '')
                  logRecFb.set('type', 'whatsapp_ai_send')
                  logRecFb.set(
                    'message',
                    emIsOk
                      ? 'Resposta de fallback enviada com sucesso para ' + emCleanPhone
                      : 'Falha ao enviar resposta de fallback para ' + emCleanPhone,
                  )
                  logRecFb.set(
                    'details',
                    JSON.stringify({
                      statusCode: emSendRes ? emSendRes.statusCode : 0,
                      response: emSendRes ? emSendRes.json || emSendRes.body : null,
                      phone_id: emPhoneId,
                      to: emCleanPhone,
                    }),
                  )
                  logRecFb.set(
                    'payload',
                    JSON.stringify({
                      preview: emergencyReply.substring(0, 120),
                      full_text: emergencyReply,
                      customer_id: customerId,
                      is_emergency_fallback: true,
                    }),
                  )
                  $app.saveNoValidate(logRecFb)
                } catch (_) {}
              }
            }
          } catch (waSendErr) {
            console.warn('[AI_REPLY] Emergency fallback WhatsApp send error: ' + String(waSendErr))
          }
        } catch (innerFbErr) {
          console.error('[AI_REPLY] Internal emergency fallback error: ' + String(innerFbErr))
        }
      }
    } catch (emergencyErr) {
      console.error(`[AI_REPLY] Fatal: emergency fallback failed too: ${String(emergencyErr)}`)
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const failLog = new Record(logsCol)
        failLog.set('user_id', userId || '')
        failLog.set('type', 'whatsapp_ai_emergency_fail')
        failLog.set(
          'message',
          `Falha crítica no fallback de emergência: ${emergencyErr.message || String(emergencyErr)}`,
        )
        failLog.set('details', String(emergencyErr.stack || emergencyErr))
        failLog.set('payload', JSON.stringify({ customer_id: customerId }))
        $app.saveNoValidate(failLog)
      } catch (_) {}
    }
  } finally {
    // Liberação INCONDICIONAL no finally (não depende apenas de acquiredLock por concorrência)
    // com fallback SQL direto caso o update via API/Record falhe
    try {
      const cust = $app.findRecordById('customers', customerId)
      let rawTags = cust.get('tags')
      let currentTags = []
      if (Array.isArray(rawTags)) {
        currentTags = rawTags.filter((t) => typeof t === 'string')
      } else if (typeof rawTags === 'string') {
        try {
          const p = JSON.parse(rawTags)
          if (Array.isArray(p)) currentTags = p.filter((t) => typeof t === 'string')
        } catch (_) {}
      }
      const hasLockTag = currentTags.some(
        (t) => t === 'ai_processing' || t.startsWith('ai_processing:'),
      )
      if (hasLockTag) {
        cust.set(
          'tags',
          currentTags.filter((t) => t !== 'ai_processing' && !t.startsWith('ai_processing:')),
        )
        $app.saveNoValidate(cust)
        console.log(`[AI_REPLY] Lock released cleanly for customer=${customerId}`)
      }
    } catch (cleanLockErr) {
      console.error(
        `[AI_REPLY] Error releasing lock for customer ${customerId}: ${String(cleanLockErr)}`,
      )
      // Fallback: direct SQL update to guarantee lock is released even if record model fails
      try {
        $app
          .db()
          .newQuery(
            "UPDATE customers SET tags = (SELECT json_group_array(value) FROM json_each(customers.tags) WHERE value NOT LIKE 'ai_processing%') WHERE id = {:id}",
          )
          .bind({ id: customerId })
          .execute()
        console.log(`[AI_REPLY] Lock released via SQL fallback for customer=${customerId}`)
      } catch (sqlErr) {
        console.error(
          `[AI_REPLY] SQL lock release fallback failed for ${customerId}: ${String(sqlErr)}`,
        )
      }
    }
  }

  return e.next()
}, 'conversations')
