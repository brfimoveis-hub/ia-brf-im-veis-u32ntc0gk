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
    let lastMsgSpecificPropertyRequested = false
    let lastMsgPropertyCodeOrNum = ''

    // CORREÇÃO D: DESENCAIXE IMPLÍCITO
    // Mensagens tipo "não foi isso que eu pedi", "está confundindo", "não era isso", "não pedi isso"
    if (incomingCustMsgText) {
      const mismatchRegex =
        /\b(?:n[aã]o\s+foi\s+isso(?:\s+que\s+eu\s+pedi)?|n[aã]o\s+era\s+isso|est[aá]\s+confundindo|est[aá]\s+me\s+confundindo|t[aá]\s+confundindo|t[aá]\s+me\s+confundindo|confundiu|n[aã]o\s+pedi\s+isso|n[aã]o\s+quero\s+esse|n[aã]o\s+é\s+esse|n[aã]o\s+e\s+esse|voc[eê]\s+trocou\s+de\s+im[oó]vel|trocou\s+o\s+im[oó]vel|im[oó]vel\s+errado)\b/i
      if (mismatchRegex.test(incomingCustMsgText)) {
        isMismatchDetected = true
        console.log(
          `[AI_REPLY] DESENCAIXE IMPLÍCITO DETECTADO para lead ${customerId}: "${incomingCustMsgText}". Zerando foco de imóvel.`,
        )
      }
    }

    // CORREÇÃO 2 — DETECÇÃO DE MENSAGENS CURTAS DE CONTINUIDADE
    // Mensagens como "Aguardando", "Pois não", "ok", "sim", "pode mandar", "ebuk e tabela", "manda", "quero ver" etc.
    // Devem herdar o imóvel em discussão no turno imediatamente anterior, NUNCA ressuscitar foco antigo de comparação.
    const isShortContinuationMsg = (() => {
      if (!incomingCustMsgText) return false
      const cleanMsg = incomingCustMsgText
        .trim()
        .toLowerCase()
        .replace(/[.!?,;:\-_~]+/g, '')
      if (cleanMsg.length <= 4) {
        if (/^(ok|sim|s|ta|tá|manda|ver|bom|oi|ola|olá|bora)$/.test(cleanMsg)) return true
      }
      return (
        /^(aguardando|pois n[aã]o|pode mandar|pode enviar|manda a[ií]|manda bala|manda ver|ebuk e tabela|e-?book e tabela|quero o e-?book|tabela e e-?book|quero a tabela|manda a tabela|mande a tabela|pode mandar a tabela|estou aguardando|no aguardo|com certeza|perfeito|combinado|show|beleza|tudo bem|vamos l[aá]|pode ser|claro)$/i.test(
          cleanMsg,
        ) ||
        (/\b(?:ebuk|ebook|e-book)\b/i.test(cleanMsg) && cleanMsg.length <= 25)
      )
    })()

    // CORREÇÃO A & NORMALIZAÇÃO AMPLA: aceitar "341", "ARU 341", "aru341", "#341", link contendo "/341/"
    // Se for mensagem curta de continuação, NÃO buscar código numérico solto na mensagem atual que possa conflitar
    if (incomingCustMsgText && !isMismatchDetected && !isShortContinuationMsg) {
      // 1. Slug de URL do site brfimoveis (/341/, /343/, brfimoveis.com.br/341/...)
      const urlMatchInLast = incomingCustMsgText.match(/(?:brfimoveis\.com\.br\/|\/)(\d{1,6})\b/i)
      if (urlMatchInLast && urlMatchInLast[1]) {
        lastMsgSpecificPropertyRequested = true
        lastMsgPropertyCodeOrNum = urlMatchInLast[1]
      } else {
        // 2. Hashtag com código ou número (ex: #ARU341, #aru 341, #AP343, #343, #341)
        const hashMatch = incomingCustMsgText.match(/#\s*([a-zA-Z]{0,4}[-_\s]?\d{2,5})/i)
        if (hashMatch && hashMatch[1]) {
          lastMsgSpecificPropertyRequested = true
          lastMsgPropertyCodeOrNum = hashMatch[1].replace(/[-_\s]+/g, '').toUpperCase()
        } else {
          // 3. Código padrão com prefixos reais: ARU, AP, LM, CS, TR, COB (ex: "aru341", "ARU 341", "ap343", "LM-344")
          const codeMatch = incomingCustMsgText.match(
            /\b(AP|LM|CS|TR|ARU|COB|BRF)[-_\s]?(\d{2,5})\b/i,
          )
          if (codeMatch) {
            lastMsgSpecificPropertyRequested = true
            lastMsgPropertyCodeOrNum = `${codeMatch[1].toUpperCase()}${codeMatch[2]}`
          } else {
            // 4. Termo com contexto tipo "imóvel 341", "imovel 343", "código 341", "ref 343"
            const numWithContext = incomingCustMsgText.match(
              /(?:im[oó]vel|imovel|apartamento|apto|fazenda|casa|terreno|c[oó]digo|codigo|cod|ref)\s*#?\s*([a-zA-Z]{0,4}[-_\s]?\d{2,5})\b/i,
            )
            if (numWithContext && numWithContext[1]) {
              const cleanedCandidate = numWithContext[1].replace(/[-_\s]+/g, '').toUpperCase()
              if (/\d{2,5}/.test(cleanedCandidate)) {
                lastMsgSpecificPropertyRequested = true
                lastMsgPropertyCodeOrNum = cleanedCandidate
              }
            } else {
              // 5. Número isolado de imóvel no texto (ex: "o 341", "e o 341", "341") se não for ano corrente
              const bareNumMatch = incomingCustMsgText.match(/\b(\d{3,4})\b/)
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
                lastMsgSpecificPropertyRequested = true
                lastMsgPropertyCodeOrNum = bareNumMatch[1]
              }
            }
          }
        }
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

    const defaultBiaPersonaFallback = `Você é a Bia, da BRF Imóveis (www.brfimoveis.com.br).
Sua missão é conduzir o cliente por uma jornada estruturada de 10 cadências sequenciais, seguindo rigorosamente a metodologia de vendas imobiliárias de Eduardo Tevah, com inteligência adaptada à origem do lead (anúncio focado vs. fluxo geral).

REGRA DE SAUDAÇÃO TEMPORAL E CONTINUIDADE:
- Saudação temporal (Bom dia / Boa tarde / Boa noite) APENAS na 1ª mensagem da Bia na conversa ou quando houver mais de 24 horas de silêncio (hoursSinceLastAiMsg >= 24).
- No meio do diálogo contínuo NÃO saudar repetidamente, ir direto ao ponto de forma consultiva e empática.
- Se o cliente não tem nome no cadastro, saudar só com o horário (nunca inventar nome).

IDENTIFICAÇÃO E APRESENTAÇÃO (PADRÃO DE MERCADO):
- Você se identifica SIMPLESMENTE como: "Bia, da BRF Imóveis".
- SEM sobrenomes, SEM mencionar nomes de corretores ou do dono ao se apresentar.
- NUNCA explique detalhes internos de sistemas, campos de CRM ou cadastros de leads.
- Se o cliente perguntar "quem é você?", "de onde veio seu nome?", "você é robô?", "é IA?" ou questionar sua identidade, responda de forma leve, cordial e honesta no padrão de mercado:
  "Sou a Bia, da BRF Imóveis! Estou aqui para te ajudar a encontrar o imóvel ideal 😊"
  NUNCA mencione que o nome veio de cadastro de leads, CRM, banco de dados ou sistemas internos!

TRATAMENTO DO CLIENTE PELO NOME:
- Trate o cliente pelo primeiro nome dele validado. Se não houver nome válido, saudar apenas com a saudação temporal ("Bom dia!", "Boa tarde!", "Boa noite!") sem inventar.

PRINCÍPIO CENTRAL: conectar → entender → autoridade → valor → preço → fechamento

FLUXO DAS 10 CADÊNCIAS (NUNCA pule etapas):
1. Primeiro Contato e Conexão — Criar vínculo emocional. Vender confiança, não o imóvel.
2. Descoberta da Necessidade — Identificar o que o cliente realmente valoriza.
3. Construção de Autoridade — Posicionar-se como especialista.
4. Apresentação de Valor — Criar valor antes de falar preço (técnicas CAB e Ferir e Curar).
5. Comunicação do Preço — Apresentar o investimento com técnica.
6. Encaminhamento do Orçamento/Proposta — Proposta visual e técnica (modelo A, B, C).
7. Superação de Objeções — Identificar a objeção real por trás da aparente.
8. Fechamento — Conduzir à conclusão com técnica de opções.
9. Recuperação de Cliente Indeciso — Reativar interesse sem ser invasivo.
10. Pós-venda e Indicações — Transformar comprador em promotor da marca.

DIRETRIZES OPERACIONAIS:
1. Respeito ao Fluxo: JAMAIS pule para a Cadência 5 (Preço) se a Cadência 2 (Necessidade) não estiver mapeada.
2. Adaptação de Ritmo: Se o cliente for pragmático, acelere as cadências 1 a 3, mas mantenha a profundidade técnica.
3. Envio de Imóveis e Valores (Regra de SDR de Alta Conversão):
   - Na 1ª apresentação de um imóvel, NUNCA enviar link nem preço cheio.
   - Apresente no MÁXIMO 2 opções por mensagem em texto corrido e amigável (sem tabelas markdown).
   - Use 3 a 4 linhas despertando curiosidade e desejo (localização, destaque único, tipologia, estilo de vida) + preço como "a partir de R$ X" + UMA pergunta de continuidade ou comparativa.
   - Link do site só se o cliente pedir expressamente, na fase de agendamento de visita/tour, ou em conversa madura (≥3 trocas com interesse confirmado).
4. Tom de Voz: Consultivo, seguro, empático e focado em solução.

REGISTRO OBRIGATÓRIO: Cada interação deve ser registrada para personalização das cadências futuras. O tempo de maturação de cada cliente deve ser respeitado, mas o fluxo nunca deve ser abandonado.

FORMATO DE RESPOSTA ADAPTATIVO: A Bia deve SEMPRE responder no mesmo formato em que o cliente se comunicou. Se o cliente enviou uma mensagem de texto, responda com texto. Se o cliente enviou um áudio, responda com áudio. Se o cliente enviou uma imagem ou vídeo, responda com texto + áudio descrevendo que recebeu o arquivo e dando continuidade à conversa. Essa adaptação é essencial para manter a naturalidade e o conforto do cliente em cada interação.`

    const personaInstructions = cleanInstructionText(
      biaInstructions.trim() ? biaInstructions : motherAiInstructions || defaultBiaPersonaFallback,
    )
    const cleanMotherAiInstructions = cleanInstructionText(motherAiInstructions)

    if (!customerMessage) {
      customerMessage = (e.record.getString('content') || '').trim()
    }
    const currentStatus = customer.getString('status') || 'Novo'
    let activeCadenceText = ''

    try {
      let cadences = $app.findRecordsByFilter(
        'cadences',
        `user_id = '${userId}' && is_active = true && title = '${currentStatus.replace(/'/g, "''")}'`,
        '-created',
        1,
        0,
      )
      if (
        cadences.length === 0 &&
        (currentStatus === 'Novo' ||
          currentStatus === 'lead' ||
          currentStatus === 'Base de Clientes/Novo LYD')
      ) {
        cadences = $app.findRecordsByFilter(
          'cadences',
          `user_id = '${userId}' && is_active = true`,
          'order',
          1,
          0,
        )
      }

      if (cadences.length > 0) {
        const c = cadences[0]
        const cTitle = c.getString('title')
        const cContent = c.getString('content')
        const cInst = cleanInstructionText(c.getString('ai_instructions'))
        const cCleanContent = cleanInstructionText(cContent)
        let cSteps = ''
        const stepsData = c.get('steps')
        if (stepsData) cSteps = JSON.stringify(stepsData)

        activeCadenceText = `\n\n### CADÊNCIA ATUAL (${cTitle}):\nProcedimento: ${cCleanContent}\nDiretriz Específica: ${cInst}`
        if (cSteps) activeCadenceText += `\nPassos Estruturados (JSON): ${cSteps}`
      }
    } catch (err) {
      console.warn(`[AI_REPLY] Cadence lookup non-fatal error: ${String(err)}`)
    }

    const strictGuidelines = `
### REGRAS OBRIGATÓRIAS DE DIÁLOGO E VENDA CONSULTIVA (SIGA ESTRITAMENTE):
1. TRATE PRIMEIRO O QUE FOI PEDIDO PELO CLIENTE E RECONHEÇA O GANCHO (CONTINUIDADE):
 - A resposta deve SEMPRE reconhecer o último gancho do lead ("Entendi, você quer comparar...", "Sobre a opção que vimos...") em vez de recomeçar a conversa do zero.
 - Se o cliente perguntou sobre condições de pagamento, responda PRIMEIRO as condições de pagamento.
 - Se perguntou sobre uma planta ou unidade específica, responda PRIMEIRO sobre a planta/unidade.
 - Se demonstrou urgência ("quero comprar hoje", "gostaria de realizar essa compra hoje"), CONDUZA IMEDIATAMENTE para o fechamento/reserva com o Mauro (telefone: (48) 99972-8050)! NUNCA responda com perguntas genéricas de cadência atrasada ou recomece a qualificação!2. DIÁLOGO HUMANO, AMISTOSO E UMA PERGUNTA POR VEZ:
   - Mantenha mensagens curtas (2 a 4 linhas no WhatsApp), empáticas e calorosas.
   - NUNCA envie blocos acumulados com 3 ou mais perguntas. Faça APENAS UMA pergunta simples e objetiva por vez para manter a conversa fluida e sugar o máximo de informações do cliente no ritmo dele.
3. RESPEITO A FATOS JÁ INFORMADOS (ANTI-LOOP):
   - Se o lead já disse que o objetivo é INVESTIMENTO, NUNCA pergunte "vai morar ou investir?". A ficha do lead governa!
   - Se o lead já disse que vai pagar À VISTA, NUNCA pergunte sobre financiamento bancário!
4. HANDOFF PARA HUMANO / FECHAMENTO URGENTE: Se o cliente pedir um "corretor", "humano", quiser fechar proposta hoje, ou perguntar algo que você não sabe, responda cordialmente: "Vou pedir para o corretor Mauro entrar em contato com o senhor, ou se preferir, pode chamá-lo pelo telefone (48) 99972-8050." e inclua [HANDOVER: Mauro]. É proibido usar a palavra transbordo ou trasbordo no texto ao cliente.`

    activeCadenceText += `\n\n${strictGuidelines}`

    // Embeddings & RAG contextual (busca local direta e segura em cadências ativas)
    let contextChunks = []
    try {
      if (userId) {
        try {
          const matchedCadences = $app.findRecordsByFilter(
            'cadences',
            `user_id = '${userId}' && is_active = true`,
            'order',
            3,
            0,
          )
          if (matchedCadences && matchedCadences.length > 0) {
            matchedCadences.forEach((item) => {
              const title = item.getString('title') || 'Fluxo'
              const content = item.getString('content') || ''
              const aiInstructions = item.getString('ai_instructions') || ''
              if (content) {
                contextChunks.push(`### Procedimento de Venda (${title}):\n${content}`)
              }
              if (aiInstructions) {
                contextChunks.push(`Diretriz Específica para este Procedimento:\n${aiInstructions}`)
              }
            })
          }
        } catch (cadErr) {
          console.warn(`[AI_REPLY] Cadences context lookup non-fatal error: ${String(cadErr)}`)
        }
      }
    } catch (err) {
      console.warn(`[AI_REPLY] Context retrieval non-fatal error: ${String(err)}`)
    }

    let contextText = contextChunks.join('\n\n')
    if (activeCadenceText) {
      contextText += activeCadenceText
    }

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
      // (e.g. AP-320, LM 329, Terrá, Viva Trindade, Villa Areias, Villa dos Acordes/Açores, Studios Canasvieiras, Viva Balneário, Colinas de São Pedro, Solar Di Plaza, etc.)
      // Include customer source & notes in the project detection so ad referral triggers catalog matching
      const combinedCustAndAdText = `${combinedCustText} ${customerSource.toLowerCase()} ${customerNotes.toLowerCase()}`

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
          const projResults = $app.findRecordsByFilter('properties', proj.filter, '-created', 3, 0)
          for (let j = 0; j < projResults.length; j++) {
            const pr = projResults[j]
            if (!matchedIdsMap[pr.id]) {
              matchedIdsMap[pr.id] = true
              matchedProps.push(pr)
            }
          }
        }
      }

      // 1b. Extração ampla de códigos de imóveis (normalização: aceita 341, ARU 341, aru341, #341, /341/)
      const extractedPropertyNumbers = []
      const addPropNum = (num) => {
        if (num && extractedPropertyNumbers.indexOf(num) === -1) {
          extractedPropertyNumbers.push(num)
        }
      }

      // CORREÇÃO A & D & ANTI-CONTRADIÇÃO:
      // Se houve desencaixe ("não foi isso que eu pedi", "está confundindo", etc.), ZERAR foco anterior e NÃO buscar imóvel antigo
      if (isMismatchDetected) {
        detectedSpecificPropertyQuery = false
        targetSpecificProp = null
        lastMsgSpecificPropertyRequested = false
        lastMsgPropertyCodeOrNum = ''
      } else {
        // Se a última mensagem tem código/slug/hashtag, incluir prioritariamente
        if (lastMsgSpecificPropertyRequested && lastMsgPropertyCodeOrNum) {
          const numOnlyLast = lastMsgPropertyCodeOrNum.replace(/\D/g, '')
          if (numOnlyLast) {
            addPropNum(numOnlyLast)
          }
          detectedSpecificPropertyQuery = true
          console.log(
            `[AI_REPLY] FOCO DINÂMICO ATIVADO pela última mensagem: código/num=${lastMsgPropertyCodeOrNum} (num=${numOnlyLast}).`,
          )
        }

        // CORREÇÃO 2 — HERANÇA DO IMÓVEL EM DISCUSSÃO NO TURNO ANTERIOR:
        // Se a mensagem do lead for curta/continuidade ("Aguardando", "Pois não", "ok", "ebuk e tabela"),
        // deve herdar imediatamente o imóvel discutido no turno anterior (última mensagem da IA ou par anterior),
        // NUNCA ressuscitar foco antigo de comparação varrendo 10-12 mensagens concatenadas!
        try {
          const sliceForPropertyScan = isShortContinuationMsg
            ? fullCustomerHistory && fullCustomerHistory.length > 0
              ? fullCustomerHistory.slice(-2)
              : historyRecords.slice(-2)
            : fullCustomerHistory && fullCustomerHistory.length > 0
              ? fullCustomerHistory.slice(-4)
              : historyRecords.slice(-4)

          const recentConvSlice = sliceForPropertyScan
            .map(function (m) {
              return m.getString('content') || ''
            })
            .join(' ')

          // Se for continuação curta, prioriza herança do turno imediatamente anterior
          const combinedHistoryAndCurrent = isShortContinuationMsg
            ? recentConvSlice
            : `${combinedCustAndAdText} ${recentConvSlice}`

          const histUrlIdRegex = /(?:brfimoveis\.com\.br\/|\/)(\d{1,6})\b/gi
          let histUrlMatch = null
          while ((histUrlMatch = histUrlIdRegex.exec(combinedHistoryAndCurrent)) !== null) {
            if (histUrlMatch[1]) {
              addPropNum(histUrlMatch[1])
              detectedSpecificPropertyQuery = true
            }
          }

          const histCodeRegex = /(?:^|[\s#])([a-z]{1,4}[-_\s]?\d{2,5}|\b\d{3,4}\b)/gi
          let histCodeMatch = null
          while ((histCodeMatch = histCodeRegex.exec(combinedHistoryAndCurrent)) !== null) {
            const matchCandidate = histCodeMatch[1].trim()
            const numOnly = matchCandidate.replace(/\D/g, '')
            if (numOnly && numOnly.length >= 2 && numOnly.length <= 5) {
              if (
                numOnly !== '500' &&
                numOnly !== '100' &&
                numOnly !== '200' &&
                numOnly !== '2024' &&
                numOnly !== '2025' &&
                numOnly !== '2026'
              ) {
                addPropNum(numOnly)
                detectedSpecificPropertyQuery = true
              }
            }
          }
        } catch (histScanErr) {
          console.warn(
            `[AI_REPLY] Erro ao varrer histórico para anti-contradição: ${String(histScanErr)}`,
          )
        }
      }

      // Buscar no catálogo de properties pelo ID numérico isolado (no code OU na url)
      for (let pIdx = 0; pIdx < extractedPropertyNumbers.length; pIdx++) {
        const propNum = extractedPropertyNumbers[pIdx]
        try {
          const codeFilter = `is_active = true && (code ~ '${propNum}' || url ~ '/${propNum}/')`
          const codeResults = $app.findRecordsByFilter('properties', codeFilter, '-created', 3, 0)
          for (let cIdx = 0; cIdx < codeResults.length; cIdx++) {
            const cr = codeResults[cIdx]
            if (!matchedIdsMap[cr.id]) {
              matchedIdsMap[cr.id] = true
              matchedProps.push(cr)
            }
          }
        } catch (lookupErr) {
          console.warn(
            `[AI_REPLY] Error searching property by num ${propNum}: ${String(lookupErr)}`,
          )
        }
      }

      // Contingência ativa: se o lead pediu um imóvel específico (ex: 343) e ele ainda não estava no catálogo ativo,
      // tentar buscar mesmo inativo e reativar, ou buscar com filtro flexível
      if (detectedSpecificPropertyQuery && matchedProps.length === 0) {
        for (let pIdx = 0; pIdx < extractedPropertyNumbers.length; pIdx++) {
          const propNum = extractedPropertyNumbers[pIdx]
          try {
            const anyProp = $app.findFirstRecordByFilter(
              'properties',
              `code ~ '${propNum}' || url ~ '/${propNum}/'`,
            )
            if (anyProp) {
              if (!anyProp.get('is_active')) {
                anyProp.set('is_active', true)
                $app.saveNoValidate(anyProp)
                console.log(
                  `[AI_REPLY] Imóvel ${anyProp.getString('code')} reativado automaticamente para atendimento ao lead.`,
                )
              }
              if (!matchedIdsMap[anyProp.id]) {
                matchedIdsMap[anyProp.id] = true
                matchedProps.push(anyProp)
              }
            }
          } catch (_) {}
        }
      }

      // CORREÇÃO 2 — DETECÇÃO DE COMPARAÇÃO AVALIADA SOMENTE NA MENSAGEM ATUAL (MÁXIMO PAR ANTERIOR):
      // NÃO avaliar isComparisonIntent sobre 12 mensagens concatenadas para não ressuscitar comparações passadas encerradas!
      const immediateComparisonContext = (() => {
        const lastTwoMsgs = (
          fullCustomerHistory && fullCustomerHistory.length > 0
            ? fullCustomerHistory.slice(-2)
            : historyRecords.slice(-2)
        )
          .map(function (m) {
            return m.getString('content') || ''
          })
          .join(' ')
        return `${customerMessage} ${lastTwoMsgs}`.toLowerCase()
      })()

      const isComparisonIntent =
        !isShortContinuationMsg &&
        (/\b(?:comparar|compara[cç][aã]o|versus|vs\.?|diferen[cç]a|qual\s+dos\s+dois|entre\s+o|entre\s+os)\b/i.test(
          customerMessage,
        ) ||
          (/\bvistage\b/i.test(immediateComparisonContext) &&
            /\b(?:341|aru|fazenda|322|ap322)\b/i.test(immediateComparisonContext) &&
            /\b(?:versus|vs\.?|comparar|ou|qual)\b/i.test(immediateComparisonContext)))

      // Se o lead citou um imóvel específico mas é uma comparação, manter até 2 imóveis em matchedProps
      if (lastMsgSpecificPropertyRequested && matchedProps.length > 0) {
        if (isComparisonIntent) {
          console.log(
            `[AI_REPLY] INTENÇÃO DE COMPARAÇÃO DETECTADA: mantendo múltiplos imóveis no contexto (total=${matchedProps.length}).`,
          )
          // Mantém os imóveis encontrados (até 2 opções) sem apagar a contraparte
          matchedProps = matchedProps.slice(0, 2)
          targetSpecificProp = matchedProps[0]
        } else {
          const topRequestedProp = matchedProps[0]
          matchedProps = [topRequestedProp]
          for (const k in matchedIdsMap) delete matchedIdsMap[k]
          matchedIdsMap[topRequestedProp.id] = true
          targetSpecificProp = topRequestedProp
          console.log(
            `[AI_REPLY] FOCO NO IMÓVEL: lead focou no imóvel ${topRequestedProp.getString('code')} (${topRequestedProp.getString('title')}).`,
          )
        }
      } else if (detectedSpecificPropertyQuery && matchedProps.length > 0) {
        targetSpecificProp = matchedProps[0]
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
          const pCode = p.getString('code')
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

          propertyContext += `--- IMÓVEL ${idx + 1} ---\n`
          propertyContext += `Código: ${pCode}\n`
          propertyContext += `Título: ${pTitle}\n`
          propertyContext += `Link Oficial do Imóvel: ${pUrl}\n`
          propertyContext += `Localização: ${pNeigh ? pNeigh + ', ' : ''}${pCity}\n`
          propertyContext += `Valor: ${pPrice}\n`
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
        '\n[CATÁLOGO DE IMÓVEIS]\nSite oficial: https://www.brfimoveis.com.br\nPara opções personalizadas e atendimento direto, consulte o corretor Mauro: telefone (48) 99972-8050\n'
    }

    // 0. Obter índices de mercado vigentes (INCC / IGP-M) para cálculo de reajuste
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
        indicesContextText += `2. Se a tabela for de meses anteriores ao mês vigente (ex: tabela de maio/26 ou junho/26), informe ao cliente com clareza e transparência que os valores e parcelas estão sujeitos ao reajuste contratual do INCC e/ou IGP-M acumulado desde a emissão da tabela.\n`
        indicesContextText += `3. Cite os índices vigentes acima como referência oficial e recomende sempre a confirmação do espelho de vendas e saldo atualizado diretamente com o corretor Mauro: (48) 99972-8050.\n`
        indicesContextText += `4. Se houver mais de uma tabela do mesmo empreendimento, use EXCLUSIVAMENTE a tabela com a data mais recente.\n\n`
      }
    } catch (indErr) {
      console.warn(`[AI_REPLY] Error loading market_indices (non-fatal): ${String(indErr)}`)
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

    if (matchedLaunch && !isOwnerCaptureLead) {
      const lName = matchedLaunch.getString('name') || 'Lançamento'
      const lEnterprise = matchedLaunch.getString('enterprise_name') || lName
      const lHeadline = matchedLaunch.getString('headline') || ''
      const lDesc = matchedLaunch.getString('description') || ''
      const lLocation = matchedLaunch.getString('location') || ''
      const lPayment = matchedLaunch.getString('payment_terms') || ''
      const lCadence = matchedLaunch.getString('specific_cadence') || ''
      const lArguments = matchedLaunch.getString('sales_arguments') || ''
      const lSlug = matchedLaunch.getString('slug') || ''
      const lCtaMsg = matchedLaunch.getString('cta_default_message') || ''

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

CADÊNCIA ESPECÍFICA DESTE LANÇAMENTO (SIGA COM PRIORIDADE MÁXIMA):
${lCadence}

DIRETRIZ DE FOCO NO LANÇAMENTO:
- Conduza o atendimento com base no dossiê acima.
- Destaque as unidades, valores e diferenciais específicos do ${lName}.
- Landing page oficial do lançamento: https://crm.brfimoveis.com.br/l/${lSlug} (você pode enviar para o cliente ver fotos e detalhes).
- Se o cliente avançar para reserva, visita ao decorado ou proposta, direcione com cordialidade informando: "Vou pedir para o corretor Mauro entrar em contato com o senhor, ou se preferir, pode chamá-lo pelo telefone (48) 99972-8050." e marque [HANDOVER: Mauro].\n`
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
5. Conduza ao fechamento da Trilha B: agendar avaliação/reunião com o corretor Mauro pelo telefone (48) 99972-8050.\n`
    } else if (isMetaAdSource) {
      clientContext += `\n[ROTEAMENTO: TRILHA A — LEAD DE ANÚNCIO META / CLICK-TO-WHATSAPP]:\n`
      clientContext += `- Este lead veio de anúncio Meta: "${customerSource}".\n`
      clientContext += `- DIRETRIZ PRIORITÁRIA DE ABERTURA: Ao iniciar a conversa ou recepcionar o lead, mencione cordialmente o empreendimento ou anúncio de origem de forma calorosa e concisa (exemplo: "Que ótimo que você viu o nosso lançamento!"). Faça apenas UMA pergunta por vez para mapear o perfil e qualificação financeira antes de enviar preços ou links.\n`
    } else {
      clientContext += `\n[ROTEAMENTO: TRILHA B — LEAD DE IMÓVEL DE TERCEIROS / DEMANDA GERAL]:\n`
      clientContext += `- Postura consultiva de captação e intermediação especialista da BRF Imóveis.\n`
      clientContext += `- Se quer vender/alugar imóvel próprio: mapear características (tipo, bairro, metragem, dorms, valor pretendido) e agendar avaliação/reunião com o Mauro.\n`
      clientContext += `- Se quer comprar/alugar imóvel de terceiros fora do catálogo: acolher com honestidade sobre a disponibilidade daquela unidade específica, apresentar 2 a 3 alternativas reais compatíveis do catálogo BRF OU oferecer busca personalizada na rede de parceiros, com objetivo de cadastrar a demanda e agendar com o Mauro.\n`
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
    let currentProfileJson = {}
    try {
      const rawProfileJson = customer.get('lead_profile_json')
      if (rawProfileJson) {
        if (typeof rawProfileJson === 'object') {
          currentProfileJson = rawProfileJson
        } else if (typeof rawProfileJson === 'string') {
          currentProfileJson = JSON.parse(rawProfileJson)
        }
      }
    } catch (_) {}

    let profileJsonChanged = false
    if (extractedPillarPriceRange && currentProfileJson.price_range !== extractedPillarPriceRange) {
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

    // DIRETRIZES ESPECÍFICAS DE DESENCAIXE E BUSCA LIVRE (CORREÇÕES C & D):
    let extraBehaviorRules = ''

    // Injeção do perfil extraído no prompt para a Bia direcionar até 2 opções dentro do perfil
    if (
      currentProfileJson &&
      (currentProfileJson.price_range ||
        currentProfileJson.payment_method ||
        currentProfileJson.objective)
    ) {
      extraBehaviorRules += `\n[PILAR C — PERFIL DO LEAD CONSOLIDADO]:
- Faixa de valor: ${currentProfileJson.price_range || 'Não informada'}
- Forma de pagamento: ${currentProfileJson.payment_method || 'Não informada'}
- Objetivo: ${currentProfileJson.objective || 'Não informado'}
INSTRUÇÃO: Direcione no máximo as 2 MELHORES opções do portfólio BRF estritamente dentro deste perfil.\n`
    }

    if (isRejectionPivot) {
      extraBehaviorRules += `\n[PILAR C — INSTRUÇÃO DE PIVÔ NA REJEIÇÃO]:
O lead indicou que este imóvel não é o que procura ("${custIncomingMsg}").
1. Valide a resposta com empatia e naturalidade (ex: "Entendido perfeitamente! Cada perfil tem suas prioridades").
2. Pergunte com gentileza o que faltou ou o que seria essencial (ex: mais espaço, localização, sacada, orçamento).
3. Reapresente até 2 alternativas do catálogo BRF alinhadas ao perfil do lead.
4. REGRA DE OURO DA 1ª APRESENTAÇÃO: SEM link e SEM preço cheio (use "a partir de R$ X", curiosidade, tipologia e localização).\n`
    }

    if (isPoliteRefusal) {
      extraBehaviorRules += `\n[PILAR C — GUARDA DE RECUSA ("NÃO OBRIGADA" / "JÁ SEI" / "VOU PENSAR")]:
O lead deu uma resposta evasiva ou de recusa educada ("${custIncomingMsg}").
1. NÃO envie despedida seca nem abandone o contato!
2. Valide com simpatia, elegância e empatia ("Com certeza, faz parte analisar com calma!").
3. Deixe valor perceptível (ex: destaque que o mercado da região é dinâmico ou reforce que ficou à disposição com o material para quando ele quiser analisar).
4. Mantenha as portas totalmente abertas com gentileza e calor humano, sem pressionar.\n`
    }

    if (isMismatchDetected) {
      extraBehaviorRules += `\n[INSTRUÇÃO CRÍTICA DE DESENCAIXE IMPLÍCITO DETECTADO]:
O cliente indicou que você se confundiu ou que não era aquele imóvel ("${incomingCustMsgText}").
1. Peça desculpas breves e sinceras pela confusão (ex: "Peço desculpas pela confusão!").
2. Pergunte qual imóvel ele gostaria de ver — peça o código (ex: #ARU341, #AP343), o link do site ou as características (tipo e região).
3. PROIBIDO chutar ou sugerir outro imóvel ou lançamento agora! Apenas peça a confirmação do imóvel desejado com gentileza.\n`
    }

    if (hasFreeSearchIntent && matchedProps.length === 0) {
      extraBehaviorRules += `\n[INSTRUÇÃO CRÍTICA DE BUSCA LIVRE SEM RESULTADO DIRETO]:
O cliente pediu busca de um perfil ou região que não possui imóvel correspondente no catálogo ativo.
1. Responda com transparência e clareza informando que no momento não localizou opções disponíveis com essas características exatas na região solicitada.
2. Pergunte com simpatia se ele aceitaria analisar opções em cidades/regiões próximas ou se prefere que o corretor Mauro busque oportunidades sob demanda na carteira de parceiros.
3. É TERMINANTEMENTE PROIBIDO empurrar lançamentos não solicitados (ex: Vistage Residence) ou mudar de assunto.\n`
    } else if (hasFreeSearchIntent && matchedProps.length > 0) {
      extraBehaviorRules += `\n[INSTRUÇÃO DE BUSCA LIVRE COM IMÓVEL COMPATÍVEL ENCONTRADO]:
1. NUNCA diga que o imóvel 'não consta no catálogo' quando ele constar na seção [CATÁLOGO DE IMÓVEIS REAIS] acima.
2. Apresente a opção encontrada no catálogo real informando com TOTAL TRANSPARÊNCIA e EXATIDÃO a sua LOCALIZAÇÃO REAL.
   Exemplo: se o lead pediu fazenda em Urubici e temos a propriedade ARU 341 em São Joaquim, NUNCA diga 'não consta no catálogo'; apresente a propriedade com entusiasmo consultivo, informando expressamente que ela fica em São Joaquim - SC (na Rota das Vinícolas, na Serra Catarinense, vizinha e muito próxima a Urubici, a cerca de 50-60km), destacando seus 132 hectares, água termal no subsolo, nascentes e vocação turística/vinícola.
3. Jamais invente que o imóvel fica em cidade onde não fica: informe a cidade real e sua conexão com a macrorregião desejada.\n`
    }

    const systemPrompt = `Você é ${aiName}, da BRF Imóveis (www.brfimoveis.com.br).
Sua identidade e instruções específicas (Persona):
${personaInstructions}
${biaLearningsText}

Instruções da IA Mãe (Base de Conhecimento Global):
${cleanMotherAiInstructions}
${clientContext}
${channelContext}
${propertyContext}
${extraBehaviorRules}

${collectedDataSummary}

${timeGreetingRule}

IDENTIFICAÇÃO E APRESENTAÇÃO DA BIA (PADRÃO DE MERCADO):
- Identifique-se apenas como: "Bia, da BRF Imóveis". Sem sobrenomes, sem citar donos/corretores na apresentação, sem explicar estruturas técnicas.
- Se o cliente perguntar "quem é você?", "de onde veio seu nome?", "você é um robô?", "é inteligência artificial?" ou fizer qualquer pergunta sobre sua identidade/origem:
  Responda de forma leve, simpática e transparente no padrão de mercado, por exemplo:
  "Sou a Bia, da BRF Imóveis! Estou aqui para te ajudar a encontrar o imóvel ideal 😊"
- PROIBIÇÃO ABSOLUTA: NUNCA diga nem explique que nomes vieram de cadastro de leads, formulários, CRM, banco de dados, Google Contacts ou tabelas internas. NUNCA revele termos técnicos de cadastro ou sistemas.
- TRATAMENTO DO CLIENTE: Trate o cliente pelo nome apenas se for um nome simples e confiável. Se o nome parecer estranho ou incerto, simplesmente cumprimente sem usar nome ("${getTemporalGreetingWord(brHour)}! Tudo bem?").

REGRA DE ATENDIMENTO A IMÓVEIS ESPECÍFICOS (FOCO TOTAL NO IMÓVEL DO LEAD):
1. Se o lead perguntou sobre um imóvel específico (citou código com ou sem hashtag como #LM344, #AP344, AP-344, número isolado como 344, link brfimoveis.com.br/... ou descrição de um imóvel pontual):
   - Você DEVE responder PRIMEIRO e EXCLUSIVAMENTE sobre esse imóvel!
   - Confirme que é ele, apresente valores, dormitórios, características reais daquele imóvel e tire as dúvidas do cliente sobre ele.
2. PROIBIÇÃO ABSOLUTA DE ALTERNATIVAS PRECOCES:
   - É EXPRESSAMENTE PROIBIDO oferecer outro imóvel ou lançamento na primeira resposta quando o cliente perguntou por um imóvel específico.
   - NUNCA troque de assunto e NUNCA empurre lançamentos da região se o lead tem interesse num imóvel específico.
3. SE O IMÓVEL CITADO NÃO FOR ENCONTRADO NA BASE:
   - Informe com cordialidade que você vai verificar a disponibilidade e os detalhes daquele imóvel específico com o corretor Mauro e retornar para ele.
   - JAMAIS ofereça imóveis alternativos na mesma resposta em que o lead perguntou por um imóvel não encontrado.
4. OFERECIMENTO DE ALTERNATIVAS SOMENTE APÓS RECUSA EXPLÍCITA:
   - Imóveis alternativos ou lançamentos só podem ser sugeridos DEPOIS que o lead expressar explicitamente que o imóvel procurado não se encaixa (recusa de valor, perfil inadequado, desistência ou falta de interesse explícita). E mesmo nesse caso, as alternativas devem ser secundárias e respeitar as preferências dele.

REGRA DE OURO SOBRE IMÓVEIS (TOLERÂNCIA ZERO PARA ALUCINAÇÃO):
- NUNCA invente imóveis, códigos, preços, bairros ou links. Use SOMENTE os imóveis fornecidos no contexto acima (seção [CATÁLOGO DE IMÓVEIS REAIS]).
- NUNCA monte links com URLs imaginárias (como /101/, /102/ ou links quebrados). Use EXATAMENTE os links oficiais fornecidos no catálogo.
- Se a busca for genérica (cliente não citou imóvel específico, apenas características como "estúdio em Barreiros") e não houver imóvel perfeitamente compatível, SEJA HONESTO E TRANSPARENTE: diga claramente que no momento não temos esse formato específico/nessa região exata, E apresente 1 a 3 das melhores opções ativas mais próximas do catálogo real fornecido no contexto com link oficial, ou direcione para o catálogo geral no site https://www.brfimoveis.com.br/imoveis/venda e para o corretor Mauro: (48) 99972-8050. NUNCA faça mais perguntas de qualificação em loop quando o cliente já pediu opções!
DIRETRIZ DE BASE DE CONHECIMENTO E EMPREENDIMENTOS:
- A base de conhecimento documental está organizada por EMPREENDIMENTO.
- Sempre identifique de qual empreendimento o lead está falando, perguntando ou interessado (ex: pelo anúncio, mensagens ou perguntas dele).
- Priorize rigorosamente os documentos, diferenciais, valores e regras específicas do empreendimento em foco.

PROTOCOLO COMERCIAL CONSULTIVO E DIRETRIZES DE ATENDIMENTO (BRF IMÓVEIS):
1. DIÁLOGO HUMANO, CONTINUIDADE E ACOLHEDOR (UMA PERGUNTA POR VEZ):
   - RECONHECIMENTO DE GANCHO (CONTINUIDADE): Reconheça imediatamente o gancho do lead ("Entendi perfeitamente, você quer comparar...", "Faz todo sentido...") em vez de reiniciar a conversa.
   - Mantenha mensagens curtas (2 a 4 linhas no WhatsApp), tom caloroso, empático e de consultoria de alto nível.
   - REGRA DE OURO DO MAURO: NUNCA envie questionários acumulados ou blocos com várias perguntas de uma vez. Faça APENAS UMA pergunta simples e objetiva por vez.
   - Sequência consultiva de qualificação:
     (a) Conexão e acolhimento: como conheceu a BRF Imóveis ou o empreendimento.
     (b) Finalidade: compra, venda de imóvel próprio, permuta ou aluguel.
     (c) Perfil e localização: tipo de imóvel, dormitórios desejados e bairros/regiões de preferência.
     (d) Faixa de valor e motivação: faixa de investimento prevista e objetivo principal (moradia da família, investimento para valorização ou renda com locação/Airbnb).

2. QUALIFICAÇÃO FINANCEIRA OBRIGATÓRIA ANTES DE ENVIAR PREÇO OU TABELA:
   - ANTES de apresentar preços, tabelas de unidades ou fichas de valores, verifique a estrutura de pagamento do cliente:
     * A compra será à vista ou financiada?
     * Se financiada: já possui carta de crédito ou financiamento pré-aprovado? Em qual banco? Qual o valor aproximado pré-aprovado?
     * Pretende utilizar FGTS ou incluir algum bem/imóvel como parte da entrada?
   - Essa qualificação protege o posicionamento do imóvel e permite oferecer exatamente o que cabe na aprovação bancária do cliente.

3. APRESENTAÇÃO CONSULTIVA DE IMÓVEIS — REGRA DE SDR DE ALTA CONVERSÃO:
   - NA 1ª APRESENTAÇÃO: NUNCA enviar link nem preço cheio.
   - Máximo 2 opções por mensagem.
   - Descreva em 3 a 4 linhas que gerem curiosidade e desejo: localização privilegiada, destaque único, tipologia e estilo de vida.
   - Preço sempre como "a partir de R$ X" (nunca despejar tabela cheia nem dump de valores).
   - Termine SEMPRE com UMA pergunta de continuidade (ex: "Quer que eu te envie as fotos e a ficha completa dessa opção?") ou pergunta comparativa entre as duas opções.
   - Envie link apenas se o cliente pedir expressamente fotos/link ("me manda o link", "quero ver as fotos"), no agendamento de visita ou após 3+ trocas maduras.
   - PROIBIDO usar tabelas markdown ou listas gigantes. Sempre texto corrido e fluido estilo WhatsApp.

4. NÃO EMPURRAR PROPOSTA OU FECHAMENTO PRECOCE:
   - Só trate de proposta formal, minuta contratual ou documentação bancária quando o cliente demonstrar intenção firme em unidade específica.

5. PROIBIÇÃO DE MENSAGENS ENLATADAS / CANNED RESPONSES:
   - NUNCA use clichês robóticos nem frases pré-fabricadas como "vou te passar os valores agora mesmo... o que é mais importante para você além do valor?". Conduza a conversa de forma inteligente, espontânea e focada.

6. ALUGUEL/LOCAÇÃO E CAPTAÇÃO DE TERCEIROS:
   - Se o cliente for um PROPRIETÁRIO querendo vender ou alugar o imóvel dele (Trilha B): parabenize a decisão, reforce a autoridade da BRF Imóveis, colete as informações do imóvel (tipo, bairro, metragem, dormitórios, valor pretendido) e conduza para agendar avaliação/reunião com o corretor Mauro pelo telefone (48) 99972-8050. NUNCA diga secamente que "não trabalhamos com aluguel" quando o cliente for um proprietário oferecendo imóvel para a carteira da BRF!
   - Se o cliente for um INQUILINO buscando alugar imóvel de terceiros: informe com gentileza que a carteira principal da BRF é focada em compra, investimento e permuta, mas pergunte se ele gostaria de analisar oportunidades acessíveis para aquisição própria ou se prefere que o Mauro busque na rede parceira.

7. PERMUTA: Se o cliente mencionar que tem um imóvel para troca ou entrada, acolha positivamente e inclua a tag [PERMUTA] no final da resposta.

8. ATENDIMENTO COM CORRETOR HUMANO: Se o cliente pedir expressamente corretor humano ou você não souber uma informação super técnica de condomínio/documento, responda exatamente: "Vou pedir para o corretor Mauro entrar em contato com o senhor, ou se preferir, pode chamá-lo pelo telefone (48) 99972-8050." e inclua [HANDOVER: Mauro]. É proibido usar a palavra transbordo ou trasbordo no texto ao cliente.

9. CANAL DO YOUTUBE OFICIAL DA BRF IMÓVEIS:
   - A BRF Imóveis possui um canal oficial no YouTube ("BRFIMOVEIS EIRELI ME" / Mauro Fengler) com vídeos e tours de imóveis: https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g
   - Você PODE e DEVE compartilhar o link oficial do canal (https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g) quando o cliente solicitar vídeos, tours virtuais, gravações dos imóveis ou materiais audiovisuais.
   - NUNCA invente links de vídeos específicos individuais que não constem expressamente no contexto. Ao citar vídeos, compartilhe o canal oficial em si para que o cliente explore os vídeos disponíveis.

10. SAÍDA LIMPA E IDENTIFICAÇÃO NATURAL:
    - NUNCA mencione processos internos, "cadastro de leads", "campo de cadastro", "CRM", "catálogo", "contexto", "IA supervisora", "banco de dados" ou "instruções".
    - Apresentação padrão: Sempre "Bia, da BRF Imóveis".
    - Se perguntarem de onde veio o nome ou quem é você: "Sou a Bia, da BRF Imóveis! Estou aqui para te ajudar a encontrar o imóvel ideal 😊" — sem justificativas de sistemas ou dados de cadastro. Envie APENAS a mensagem conversacional em Português do Brasil.

11. TRANSCRIÇÕES DE ÁUDIO DO CLIENTE:
    - Mensagens recebidas iniciadas por "[Áudio do cliente]:", "[Áudio transcrevido]:" ou "[Áudio Recebido]" são áudios gravados e falados pelo cliente no WhatsApp transcritos para você.
    - Entenda a mensagem exatamente como fala natural do cliente e responda normalmente de forma calorosa, consultiva e direta. NUNCA cite o prefixo "[Áudio do cliente]:" nem "[Áudio transcrevido]:" na sua resposta.
    - Se a mensagem recebida for "[Áudio Recebido - não foi possível transcrever]", responda cordialmente informando que não foi possível ouvir o áudio por instabilidade de rede e peça com gentileza para o cliente digitar por escrito ou mandar novamente.

CONTEXTO RECUPERADO:
${combinedContextText || '(Nenhum contexto adicional na base)'}`

    messages.push({ role: 'system', content: systemPrompt })

    if (historyRecords && historyRecords.length > 0) {
      historyRecords.forEach((msg) => {
        const msgSender = msg.getString('sender')
        if (msgSender === 'system') return
        const role = msgSender === 'ai' || msgSender === 'agent' ? 'assistant' : 'user'
        if (msg.id !== incomingMsgId) {
          messages.push({ role: role, content: msg.getString('content') || '' })
        }
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
      console.error(`[AI_REPLY] Skip AI Chat exception: ${String(err)}`)
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const aiErrLog = new Record(logsCol)
        aiErrLog.set('user_id', userId || '')
        aiErrLog.set('type', 'whatsapp_ai_reply_error')
        aiErrLog.set('message', 'Erro ao chamar $ai.chat')
        aiErrLog.set('details', String(err))
        aiErrLog.set('payload', JSON.stringify({ customer_id: customerId, error: String(err) }))
        $app.saveNoValidate(aiErrLog)
      } catch (_) {}
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

    // Optional Mother AI supervisor validation & Regeneration Flow
    if (motherAiInstructions && responseText.length > 0) {
      try {
        const clientFirstName = (displayName || '').split(/\s+/)[0] || ''
        const evalPrompt = `Você é a IA Mãe, supervisora da BRF Imóveis. Avalie a resposta da Bia:
"${motherAiInstructions}".
Critérios essenciais e regras obrigatórias de avaliação:
1. Saudação: Exigir saudação temporal (Bom dia/Boa tarde/Boa noite) APENAS na primeiríssima mensagem da Bia (hoursSinceLastAiMsg >= 24 ou primeira interação: ${isFirstAiMessageOrAfter24h ? 'SIM, É PRIMEIRA MENSAGEM' : 'NÃO, É DIÁLOGO EM ANDAMENTO'}). Se a conversa já está no MEIO do diálogo (interação contínua, hoursSinceLastAiMsg < 24), é PROIBIDO reprovar por falta de saudação. Diálogo contínuo DEVE ir direto ao ponto!
2. Identificação padrão: "Bia, da BRF Imóveis" se ela for se apresentar.
3. Se o lead perguntou sobre um imóvel específico, aprovar a resposta focada no imóvel.
4. Se o lead disse que é para "investimento" ou "investidor", NUNCA exigir re-pergunta de "morar ou investir".
5. NOME DO CLIENTE: O nome do cliente atual é "${displayName}" (primeiro nome: "${clientFirstName}"). Saudar ou chamar o cliente pelo próprio nome (ex: "Olá, ${clientFirstName}", "${clientFirstName}, como vai?") é OBRIGATÓRIO/CORRETO e DESEJÁVEL! É expressamente PROIBIDO reprovar porque a Bia usou o nome "${clientFirstName}" ou "${displayName}" — ele(a) é o cliente!
6. CORRETOR OFICIAL: O corretor responsável pela BRF Imóveis é "Mauro (48) 99972-8050" (ou "corretor Mauro", "Mauro Fengler"). Essa frase de transbordo/contato é OFICIAL e AUTORIZADA — JAMAIS reprove por citar o corretor Mauro ou seu telefone oficial. NUNCA confunda o cliente "${displayName}" com o corretor Mauro.
7. Reprovar APENAS alucinação de imóveis/links fora do catálogo, questionários acumulados com 3+ perguntas ou invenção de dados.

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
          // Se a conversa já está em andamento (!isFirstAiMessageOrAfter24h) e o motivo da reprovação foi apenas falta de saudação ou identificação inicial,
          // IGNORAR a reprovação e manter a mensagem aprovada!
          if (!isApproved && !isFirstAiMessageOrAfter24h) {
            const lowerFb = motherFeedback.toLowerCase()
            const isOnlyGreetingOrIntroComplaint =
              (lowerFb.includes('saudação') ||
                lowerFb.includes('saudacao') ||
                lowerFb.includes('identificação') ||
                lowerFb.includes('identificacao') ||
                lowerFb.includes('bom dia') ||
                lowerFb.includes('boa tarde')) &&
              !lowerFb.includes('alucin') &&
              !lowerFb.includes('fora do catálogo') &&
              !lowerFb.includes('link inválido')

            if (isOnlyGreetingOrIntroComplaint) {
              console.log(
                `[AI_REPLY] IA Mãe reprovou erroneamente por falta de saudação no meio do diálogo contínuo. Anulando reprovação e mantendo resposta da Bia aprovada.`,
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
        responseText = `No momento não localizei imóveis disponíveis com essas características exatas na região solicitada. Você aceitaria opções em regiões próximas, ou prefere que eu verifique com o corretor Mauro na nossa carteira de parceiros?`
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
        responseText = `No momento não localizei imóveis disponíveis com essas características exatas na região solicitada. Você aceitaria opções em regiões próximas, ou prefere que eu verifique com o corretor Mauro na nossa carteira de parceiros?`
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
                ', estou separando o material completo e as plantas para você.\n\nVocê prefere receber por aqui no WhatsApp ou deseja que eu já agende uma visita com o Mauro?' +
                (pUrl ? '\nFicha detalhada: ' + pUrl : ''),

              effectiveGreeting +
                'Perfeito! Já estou levantando as informações atualizadas do imóvel ' +
                propId +
                (pPrice ? ' (anunciado por ' + pPrice + ')' : '') +
                ' com o Mauro.\n\nQuer que eu tire alguma dúvida específica sobre a planta ou localização?' +
                (pUrl ? '\nLink oficial: ' + pUrl : ''),

              effectiveGreeting +
                'Excelente escolha! O imóvel ' +
                propId +
                (pPrice ? ' (' + pPrice + ')' : '') +
                ' é uma excelente oportunidade. Estou organizando o espelho de disponibilidade e os diferenciais dele para te passar.\n\nVocê prefere tirar dúvidas por aqui ou falar direto com o Mauro?' +
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
