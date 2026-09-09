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
  const customerId = e.record.getString('customer_id')
  const conversationChannel = e.record.getString('channel') || 'whatsapp'
  const incomingMsgId = e.record.id
  let userId = e.record.getString('user_id')

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

    // Lock acquisition with 120s TTL
    try {
      $app.runInTransaction((txApp) => {
        const customer = txApp.findRecordById('customers', customerId)
        let rawTags = customer.get('tags')
        let tags = []
        if (Array.isArray(rawTags)) {
          tags = rawTags.filter((t) => typeof t === 'string')
        }

        const now = new Date().getTime()
        const lockPrefix = 'ai_processing:'
        let activeLock = false

        for (const t of tags) {
          if (t.startsWith(lockPrefix)) {
            const lockTimeStr = t.substring(lockPrefix.length)
            const lockTime = parseInt(lockTimeStr, 10)
            if (!isNaN(lockTime) && now - lockTime < 120000) {
              activeLock = true
              break
            }
          }
        }

        if (activeLock) {
          throw new Error('LOCKED')
        }

        const newTags = tags.filter((t) => t !== 'ai_processing' && !t.startsWith('ai_processing:'))
        newTags.push(`ai_processing:${now}`)
        customer.set('tags', newTags)
        txApp.save(customer)
        acquiredLock = true
      })
    } catch (err) {
      if (err.message === 'LOCKED') {
        console.log(
          `[AI_REPLY] Customer ${customerId} already has active ai_processing lock, skipping.`,
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

    const now = new Date()
    const customer = $app.findRecordById('customers', customerId)
    let rawCustomerTags = customer.get('tags')
    let tags = []
    if (Array.isArray(rawCustomerTags)) {
      tags = rawCustomerTags.filter((t) => typeof t === 'string')
    }
    const customerPhone = customer.getString('phone') || ''
    const customerSource = customer.getString('source') || ''
    const customerName = (customer.getString('name') || '').trim()
    const customerFirstName = (customer.getString('first_name') || '').trim()
    const displayName =
      customerFirstName ||
      (customerName && !customerName.includes('+') && !/^\d+$/.test(customerName)
        ? customerName.split(' ')[0]
        : '')

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

    const brTime = new Date(now.getTime() - 3 * 3600 * 1000)
    const dayOfWeek = brTime.getUTCDay()
    const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = daysMap[dayOfWeek]

    let hoursStr = brTime.getUTCHours().toString()
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

    // Cooldown per customer (min 5 seconds anti-flood)
    try {
      const customerLastAiMsgs = $app.findRecordsByFilter(
        'conversations',
        `customer_id = '${customerId}' && sender = 'ai'`,
        '-created',
        1,
        0,
      )
      if (customerLastAiMsgs.length > 0) {
        const lastAiDate = new Date(customerLastAiMsgs[0].getString('created'))
        const minCooldownMs = 5000
        if (now.getTime() - lastAiDate.getTime() < minCooldownMs) {
          console.log(`[AI_REPLY] Anti-flood cooldown active (<5s) for customer ${customerId}`)
          return e.next()
        }
      }
    } catch (err) {
      console.warn(`[AI_REPLY] Anti-flood check error (non-fatal): ${String(err)}`)
    }

    if (tags.includes('ai_paused')) {
      console.log(`[AI_REPLY] AI paused for customer ${customerId}`)
      return e.next()
    }

    const aiName = userRecord ? userRecord.getString('ai_name') || 'Bia' : 'Bia'
    const biaInstructions = userRecord ? userRecord.getString('bia_instructions') : ''
    const motherAiInstructions = userRecord ? userRecord.getString('ai_instructions') : ''

    // Clean persona and mother instructions from canned loop phrase
    const cleanInstructionText = (txt) => {
      if (!txt) return ''
      return txt
        .replace(/3\.\s*Gestão de Interrupções:.*?\(Retorno à Cadência 2\)\./gi, '')
        .replace(/1\.\s*GESTÃO DE INTERRUPÇÕES\s*—.*?sem confrontar o cliente\./gi, '')
        .replace(
          /responda EXATAMENTE:\s*"Com certeza, vou te passar os valores agora mesmo.*?"/gi,
          'apresente os imóveis e valores do catálogo imediatamente com os links oficiais.',
        )
        .replace(
          /responda:\s*"Com certeza, vou te passar os valores agora mesmo.*?"/gi,
          'apresente os imóveis e valores do catálogo imediatamente com os links oficiais.',
        )
    }

    const personaInstructions = cleanInstructionText(
      biaInstructions.trim()
        ? biaInstructions
        : motherAiInstructions ||
            'Você é a Bia, assistente virtual de vendas imobiliárias da BRF Imóveis. Seja prestativa, educada, empática e conduza o cliente para a compra ou permuta de imóveis.',
    )
    const cleanMotherAiInstructions = cleanInstructionText(motherAiInstructions)

    const customerMessage = e.record.getString('content') || ''
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
        const cInst = c.getString('ai_instructions')
        let cSteps = ''
        const stepsData = c.get('steps')
        if (stepsData) cSteps = JSON.stringify(stepsData)

        activeCadenceText = `\n\n### CADÊNCIA ATUAL (${cTitle}):\nProcedimento: ${cContent}\nDiretriz Específica: ${cInst}`
        if (cSteps) activeCadenceText += `\nPassos Estruturados (JSON): ${cSteps}`
      }
    } catch (err) {
      console.warn(`[AI_REPLY] Cadence lookup non-fatal error: ${String(err)}`)
    }

    const strictGuidelines = `
### REGRAS OBRIGATÓRIAS (SIGA ESTRITAMENTE):
1. FOCO EXCLUSIVO EM VENDA/PERMUTA: Nós NUNCA trabalhamos com aluguel ou locação. Toda e qualquer referência a aluguel deve ser cortada. Se o cliente falar sobre aluguel, encerre o assunto informando que trabalhamos apenas com Venda e Permuta.
2. IDENTIFICAÇÃO OBRIGATÓRIA (PASSO 1): Se o cliente acabou de chegar e o imóvel de interesse não está claro, sua PRIMEIRA ação e prioridade absoluta deve ser descobrir qual é o imóvel. Diga: "Vi que você se interessou por um imóvel nosso! Me diz qual deles chamou sua atenção?"
3. VALIDAÇÃO NO CRM: Se ele falar de urgência, preço ou bairro, conduza a conversa para obter esses dados claramente.
4. HANDOFF PARA HUMANO: Se o cliente pedir um "corretor", "humano", ou perguntar algo que você não sabe, responda: "Entendi sua dúvida. Vou te transferir agora para o Mauro, nosso especialista: https://wa.me/5548992098050" e não adicione mais nada.`

    activeCadenceText += `\n\n${strictGuidelines}`

    // Embeddings & RAG (defensive)
    let contextChunks = []
    try {
      if (customerMessage.trim()) {
        const res = $ai.embed({ input: customerMessage })
        if (res && res.data && res.data[0] && res.data[0].embedding) {
          const queryEmbedding = res.data[0].embedding
          const pbaseURL = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'

          const ragRes = $http.send({
            url: pbaseURL + '/backend/v1/rag-search',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer internal-rag-token-123',
            },
            body: JSON.stringify({ query: queryEmbedding, userId: userId }),
            timeout: 8,
          })

          if (ragRes && ragRes.statusCode === 200 && ragRes.json) {
            if (ragRes.json.knowledge_base) {
              ragRes.json.knowledge_base.forEach((item) => {
                if (item && item.content) {
                  contextChunks.push(`### Informação (${item.title || 'Geral'}):\n${item.content}`)
                }
              })
            }
            if (ragRes.json.cadences) {
              ragRes.json.cadences.forEach((item) => {
                if (item && item.content) {
                  contextChunks.push(
                    `### Procedimento de Venda (${item.title || 'Fluxo'}):\n${item.content}`,
                  )
                }
                if (item && item.ai_instructions) {
                  contextChunks.push(
                    `Diretriz Específica para este Procedimento:\n${item.ai_instructions}`,
                  )
                }
              })
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[AI_REPLY] Embedding/RAG search non-fatal error: ${String(err)}`)
    }

    let contextText = contextChunks.join('\n\n')
    if (activeCadenceText) {
      contextText += activeCadenceText
    }

    let historyRecords = []
    try {
      historyRecords = $app.findRecordsByFilter(
        'conversations',
        `customer_id = '${customerId}'`,
        '-created',
        10,
        0,
      )
      historyRecords.reverse()
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
        { key: 'ingleses', filter: "neighborhood ~ 'Ingleses'" },
        { key: 'jurere', filter: "neighborhood ~ 'Jurerê' || title ~ 'Jurerê'" },
        { key: 'jurerê', filter: "neighborhood ~ 'Jurerê' || title ~ 'Jurerê'" },
      ]

      let matchedLocFilter = ''
      for (const locItem of locationsMap) {
        if (combinedCustText.includes(locItem.key)) {
          matchedLocFilter = locItem.filter
          extractedLocation = locItem.key
          break
        }
      }

      let matchedProps = []

      // 1. Check if customer mentioned a specific property code (e.g. AP-320, AP343, AP308, LM326, 343)
      const codeRegexMatch = combinedCustText.match(
        /(ap[-\s]?\d+|lm[-\s]?\d+|tr[-\s]?\d+|aru[-\s]?\d+|cs[-\s]?\d+|\b\d{3}\b)/i,
      )
      if (codeRegexMatch) {
        const rawCode = codeRegexMatch[1].toUpperCase().replace(/\s+/g, '')
        const numOnly = rawCode.replace(/\D/g, '')

        let codeFilter = `is_active = true && (code ~ '${rawCode}' || url ~ '/${numOnly}/')`
        const codeResults = $app.findRecordsByFilter('properties', codeFilter, '-created', 3, 0)
        if (codeResults.length > 0) {
          matchedProps = codeResults
        }
      }

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
        let criteriaResults = $app.findRecordsByFilter('properties', criteriaFilter, 'price', 4, 0)

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
            4,
            0,
          )
        }

        if (criteriaResults.length > 0) {
          matchedProps = criteriaResults
        }
      }

      // 3. Fallback: if user asked for options or no match, load top active properties
      if (matchedProps.length === 0) {
        matchedProps = $app.findRecordsByFilter('properties', 'is_active = true', 'price', 4, 0)
      }

      if (matchedProps.length > 0) {
        propertyContext = '\n[CATÁLOGO DE IMÓVEIS REAIS - BRF IMÓVEIS (www.brfimoveis.com.br)]\n'
        propertyContext +=
          'ATENÇÃO: Abaixo estão os imóveis reais do banco de dados da imobiliária. Cada imóvel possui um LINK OFICIAL que DEVE ser enviado ao cliente:\n\n'

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
        '\n[CATÁLOGO DE IMÓVEIS]\nSite oficial: https://www.brfimoveis.com.br\nPara opções personalizadas e links diretos, consulte com Mauro: wa.me/5548992098050\n'
    }

    let filesContextText = ''
    if (userRecord) {
      try {
        const files = userRecord.get('ai_knowledge_files') || []
        if (Array.isArray(files) && files.length > 0) {
          const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
          files.forEach((f) => {
            if (typeof f === 'string' && (f.endsWith('.txt') || f.endsWith('.csv'))) {
              const fileUrl = `${pbUrl}/api/files/${userRecord.collectionId}/${userRecord.id}/${f}`
              try {
                const fRes = $http.send({ url: fileUrl, method: 'GET', timeout: 5 })
                if (fRes && fRes.statusCode === 200 && fRes.body) {
                  const str = String.fromCharCode.apply(null, fRes.body)
                  filesContextText += `\n--- Arquivo: ${f} ---\n${str}\n`
                }
              } catch (_) {}
            }
          })
        }
      } catch (_) {}
    }

    const combinedContextText = `${contextText}\n${filesContextText}`.trim()

    const messages = []
    const clientContext = displayName
      ? `\n[DADOS DO CLIENTE]\nNome do cliente: ${displayName} (nome completo: ${customerName})\n`
      : `\n[DADOS DO CLIENTE]\nCliente sem nome cadastrado ou número apenas. Seja cordial sem usar placeholders tipo [Nome].\n`

    const systemPrompt = `Você é ${aiName}, assistente virtual de vendas imobiliárias da BRF Imóveis (www.brfimoveis.com.br).
Sua identidade e instruções específicas (Persona):
${personaInstructions}

Instruções da IA Mãe (Base de Conhecimento Global):
${cleanMotherAiInstructions}
${clientContext}
${channelContext}
${propertyContext}

DIRETRIZES FUNDAMENTAIS E REGRAS DE ATENDIMENTO (BRF IMÓVEIS):
1. RESPOSTA DIRETA AO QUE FOI PEDIDO PRIMEIRO:
   - Se o cliente perguntou "quais imóveis até 500k?", "manda opções", "manda os links", "o que você tem?": RESPONDA IMEDIATAMENTE apresentando 2 a 3 imóveis reais da seção [CATÁLOGO DE IMÓVEIS REAIS].
   - É TOTALMENTE PROIBIDO responder com perguntas de qualificação como "o que é mais importante além do valor?" quando o cliente acabou de pedir imóveis ou links.
   - SEMPRE forneça os dados reais: Código, Bairro/Cidade, Valor, Quartos e o LINK OFICIAL DO SITE.

2. SEMPRE INCLUIR O LINK DO SITE DO IMÓVEL:
   - Toda vez que citar qualquer imóvel, inclua obrigatoriamente a URL oficial que consta no catálogo (ex: https://www.brfimoveis.com.br/343/imoveis/venda-apartamento-2-quartos-capoeiras-florianopolis-sc).
   - O cliente não quer apenas descrições vagas; ele quer abrir o link do imóvel no site.

3. LIMITE DE QUALIFICAÇÃO (MÁXIMO 2 PERGUNTAS NA CONVERSA INTEIRA):
   - Se o cliente já informou 1 ou 2 critérios (ex: dormitórios, valor ou região), NÃO faça mais perguntas de qualificação em sequência. APRESENTE OS IMÓVEIS.
   - NUNCA repita uma pergunta já feita no histórico da conversa. Verifique o que já foi perguntado antes de enviar.

4. NÃO EMPURRAR PROPOSTA OU FECHAMENTO PRECOCE:
   - Só fale sobre proposta formal, documentação ou contrato quando o cliente demonstrar interesse explícito em uma unidade específica (ex: "gostei do AP343", "como faço pra comprar?").
   - Quando apresentar opções pela primeira vez, convide suavemente o cliente a ver as fotos pelo link ou tirar dúvidas sobre as opções.

5. PROIBIÇÃO DE MENSAGENS ENLATADAS / CANNED RESPONSES:
   - NUNCA use a frase "Com certeza, vou te passar os valores agora mesmo. Apenas para eu te enviar a unidade com o melhor custo-benefício para o seu perfil, o que é mais importante para você além do valor?". Se o cliente perguntou preço ou opções, envie os imóveis e os valores reais imediatamente!

6. ALUGUEL/LOCAÇÃO: Se o cliente mencionar "aluguel" ou "locação", responda cordialmente: "Trabalhamos exclusivamente com venda e permuta de imóveis selecionados. Gostaria de ver opções para compra ou investimento?".

7. PERMUTA: Se o cliente mencionar que tem um imóvel para troca ou entrada, acolha positivamente e inclua a tag [PERMUTA] no final da resposta.

8. HANDOVER HUMANO: Se o cliente pedir expressamente corretor humano ou você não souber uma informação super técnica de condomínio/documento, informe que Mauro pode atendê-lo: https://wa.me/5548992098050 e inclua [HANDOVER: Mauro].

9. SAÍDA LIMPA: NUNCA mencione processos internos, "catálogo", "contexto", "IA supervisora", "banco de dados" ou "instruções". Envie APENAS a mensagem conversacional em Português do Brasil.

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
      responseText =
        'Olá! Que bom ter você aqui na BRF Imóveis. Vi seu interesse e quero te ajudar a encontrar o imóvel ideal. Podemos falar sobre o que você procura?'
      console.log(`[AI_REPLY] Using safe fallback response (len=${responseText.length})`)
    }

    // Optional Mother AI supervisor validation
    if (motherAiInstructions && responseText.length > 0) {
      try {
        const validationRes = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content: `Você é a IA Mãe, supervisora da BRF Imóveis. Avalie se a resposta obedece: "${motherAiInstructions}". Se estiver aprovada, responda APENAS a palavra APROVADO sem nada mais. Se precisar de ajuste, forneça APENAS o texto da mensagem final pronto para o cliente no WhatsApp, SEM nenhum comentário, cabeçalho, introdução, explicação ou rótulo como "Reescrita" ou "APROVADO".`,
            },
            { role: 'user', content: responseText },
          ],
        })

        if (
          validationRes &&
          validationRes.choices &&
          validationRes.choices[0] &&
          validationRes.choices[0].message
        ) {
          let motherFeedback = (validationRes.choices[0].message.content || '').trim()
          if (
            motherFeedback &&
            motherFeedback !== 'APROVADO' &&
            !motherFeedback.match(/^(\*\*|\*)?APROVADO(\*\*|\*)?$/i)
          ) {
            // Strip any explanation header if supervisor wrote "APROVADO - ..." or "Reescrita corrigida ---"
            if (motherFeedback.includes('---')) {
              const parts = motherFeedback.split('---')
              motherFeedback = parts[parts.length - 1].trim()
            }
            if (motherFeedback) {
              responseText = motherFeedback
              console.log(`[AI_REPLY] Mother AI refined the response (len=${responseText.length})`)
            }
          }
        }
      } catch (err) {
        console.warn(`[AI_REPLY] Mother AI validation non-fatal error: ${String(err)}`)
      }
    }

    // Function to thoroughly clean internal LLM / supervisor / prompt artifacts
    function sanitizeAiResponse(raw) {
      if (!raw) return ''
      let clean = raw

      // 1. Remove delimiter markers like --- or ***
      if (clean.includes('---')) {
        const parts = clean.split(/\n?---+\n?/)
        // If the first part contains review meta words, drop it
        if (
          /aprovado|reescrita|cadência|cadencia|mensagem foi reescrita|supervisor|avalia/i.test(
            parts[0],
          )
        ) {
          clean = parts.slice(1).join('\n\n').trim()
        }
      }

      // 2. Remove leading metadata prefixes / lines
      clean = clean.replace(/^(\*\*|\*)?APROVADO(\*\*|\*)?(\s*[-–—:]\s*.*?)?(\n+|$)/i, '')
      clean = clean.replace(
        /^(\*\*|\*)?Reescrita\s*(corrigida)?(\*\*|\*)?(\s*[-–—:]\s*.*?)?(\n+|$)/i,
        '',
      )
      clean = clean.replace(
        /^(\*\*|\*)?Mensagem\s*corrigida(\*\*|\*)?(\s*[-–—:]\s*.*?)?(\n+|$)/i,
        '',
      )
      clean = clean.replace(/^A\s*mensagem\s*foi\s*reescrita\s*para.*?:?\s*(\n+|$)/i, '')
      clean = clean.replace(
        /^Aqui\s*(está|vai)\s*a\s*(mensagem|resposta)\s*(corrigida|reescrita|ajustada):?\s*(\n+|$)/i,
        '',
      )
      clean = clean.replace(/^Resposta\s*(da\s*IA|sugerida)?:?\s*(\n+|$)/i, '')

      // 3. Remove lines that are purely supervisor commentary
      const lines = clean.split('\n')
      const filteredLines = []
      for (const line of lines) {
        const trimmed = line.trim()
        if (
          /^(\*\*|\*)?(APROVADO|Reescrita corrigida|Mensagem corrigida)(\*\*|\*)?$/i.test(
            trimmed,
          ) ||
          /^(\*\*|\*)?Cadência\s*\d+/i.test(trimmed) ||
          /A mensagem foi reescrita para obedecer/i.test(trimmed) ||
          /^---+$/.test(trimmed)
        ) {
          continue
        }
        filteredLines.push(line)
      }
      clean = filteredLines.join('\n').trim()

      return clean
    }

    responseText = sanitizeAiResponse(responseText)

    // Extract business tags from response
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
      responseText = responseText.replace(/\[HANDOVER:\s*.*?\]/gi, '').trim()
    }

    const profileMatch = responseText.match(/\[PROFILE:\s*(.*?)\]/i)
    if (profileMatch && profileMatch[1]) {
      detectedProfile = profileMatch[1].trim()
      responseText = responseText.replace(/\[PROFILE:\s*.*?\]/gi, '').trim()
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

    // Hard Anti-Repetition & Canned Response Overhaul
    const isCannedValuesSentence = (txt) => {
      if (!txt) return false
      const lower = txt.toLowerCase()
      return (
        lower.includes('vou te passar os valores agora mesmo') ||
        (lower.includes('custo‑benefício') && lower.includes('além do valor')) ||
        (lower.includes('custo-benefício') && lower.includes('além do valor')) ||
        (lower.includes('melhor custo') &&
          lower.includes('o que é mais importante para você além do valor'))
      )
    }

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

    // If response was repetitive or a canned qualification response while customer already gave filters or asked for options, replace with real catalog options!
    if (
      isTooSimilar ||
      (isRequestingOptions &&
        !responseText.includes('http') &&
        matchedProps &&
        matchedProps.length > 0)
    ) {
      console.log(
        `[AI_REPLY] Repetitive or canned response detected for customer ${customerId}. Overriding with real catalog options.`,
      )

      if (matchedProps && matchedProps.length > 0) {
        const topProps = matchedProps.slice(0, 3)
        let generatedCatalogReply = ''
        if (displayName) {
          generatedCatalogReply += `Oi, ${displayName}! `
        } else {
          generatedCatalogReply += `Olá! `
        }

        if (extractedMaxPrice > 0 || extractedBedrooms > 0) {
          generatedCatalogReply += `Separei aqui as melhores opções do nosso catálogo que se encaixam no que você procura`
          if (extractedBedrooms > 0) generatedCatalogReply += ` (${extractedBedrooms} dormitórios`
          if (extractedMaxPrice > 0)
            generatedCatalogReply += `, até R$ ${(extractedMaxPrice / 1000).toFixed(0)}k)`
          else if (extractedBedrooms > 0) generatedCatalogReply += `)`
          generatedCatalogReply += `:\n\n`
        } else {
          generatedCatalogReply += `Aqui estão excelentes opções do nosso catálogo no site:\n\n`
        }

        topProps.forEach((p, idx) => {
          const pCode = p.getString('code')
          const pTitle = p.getString('title')
          const pUrl = p.getString('url')
          const pCity = p.getString('city')
          const pNeigh = p.getString('neighborhood')
          const pPrice = p.getString('price_formatted')
          const pBeds = p.getInt('bedrooms')
          const pSuites = p.getInt('suites')

          generatedCatalogReply += `📍 *${pCode}* - ${pTitle}\n`
          generatedCatalogReply += `• Localização: ${pNeigh ? pNeigh + ', ' : ''}${pCity}\n`
          generatedCatalogReply += `• Valor: ${pPrice}\n`
          if (pBeds > 0) {
            generatedCatalogReply += `• Dormitórios: ${pBeds}${pSuites > 0 ? ` (${pSuites} suítes)` : ''}\n`
          }
          generatedCatalogReply += `• Link com fotos e detalhes: ${pUrl}\n\n`
        })

        generatedCatalogReply += `Dá uma olhada nos links! Qual dessas opções você achou mais interessante? Se quiser, posso agendar para você conhecer pessoalmente.`
        responseText = generatedCatalogReply
      } else {
        // Fallback without properties
        responseText = `Olá! Você pode conferir nosso catálogo completo de imóveis diretamente no site: https://www.brfimoveis.com.br/imoveis/venda. Se preferir um atendimento exclusivo com o corretor Mauro, ele atende no link: https://wa.me/5548992098050`
      }
    }

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
        $app.save(custToUpdate)
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
            preview: responseText.substring(0, 100),
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

              if (mediaRes && mediaRes.statusCode === 200 && mediaRes.json?.id) {
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
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const errLog = new Record(logsCol)
      errLog.set('user_id', userId || '')
      errLog.set('type', 'whatsapp_ai_reply_error')
      errLog.set(
        'message',
        `Erro geral no processamento de resposta da IA: ${err.message || String(err)}`,
      )
      errLog.set('details', String(err.stack || err))
      errLog.set('payload', JSON.stringify({ customer_id: customerId, error: String(err) }))
      $app.saveNoValidate(errLog)
    } catch (_) {}
  } finally {
    if (acquiredLock) {
      try {
        $app.runInTransaction((txApp) => {
          const cust = txApp.findRecordById('customers', customerId)
          let rawTags = cust.get('tags')
          let currentTags = []
          if (Array.isArray(rawTags)) {
            currentTags = rawTags.filter((t) => typeof t === 'string')
          }
          const hasLockTag = currentTags.some(
            (t) => t === 'ai_processing' || t.startsWith('ai_processing:'),
          )
          if (hasLockTag) {
            cust.set(
              'tags',
              currentTags.filter((t) => t !== 'ai_processing' && !t.startsWith('ai_processing:')),
            )
            txApp.save(cust)
            console.log(`[AI_REPLY] Lock released cleanly for customer=${customerId}`)
          }
        })
      } catch (cleanLockErr) {
        console.error(
          `[AI_REPLY] Error releasing lock for customer ${customerId}: ${String(cleanLockErr)}`,
        )
      }
    }
  }

  return e.next()
}, 'conversations')
