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
        txApp.saveNoValidate(customer)
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
    let matchedLocFilter = ''
    let matchedProps = []

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

REGRA DE OURO SOBRE IMÓVEIS (TOLERÂNCIA ZERO PARA ALUCINAÇÃO):
- NUNCA invente imóveis, códigos, preços, bairros ou links. Use SOMENTE os imóveis fornecidos no contexto acima (seção [CATÁLOGO DE IMÓVEIS REAIS]).
- NUNCA monte links com URLs imaginárias (como /101/, /102/ ou links quebrados). Use EXATAMENTE os links oficiais fornecidos no catálogo.
- Se não houver imóvel perfeitamente compatível com o pedido do cliente (ex: pediu estúdio ou bairro específico onde não temos ativo no momento), SEJA HONESTO E TRANSPARENTE: diga claramente que no momento não temos esse formato específico/nessa região exata, E IMEDIATAMENTE apresente 1 a 3 das melhores opções ativas mais próximas do catálogo real fornecido no contexto com link oficial, ou direcione para o catálogo geral no site https://www.brfimoveis.com.br/imoveis/venda e para o Mauro (wa.me/5548992098050). NUNCA faça mais perguntas de qualificação em loop quando o cliente já pediu opções!

DIRETRIZES FUNDAMENTAIS E REGRAS DE ATENDIMENTO (BRF IMÓVEIS):
1. RESPOSTA DIRETA AO QUE FOI PEDIDO PRIMEIRO:
   - Se o cliente perguntou "quais imóveis até 500k?", "manda opções", "manda os links", "o que você tem?", ou pediu regiões específicas: RESPONDA IMEDIATAMENTE apresentando 2 a 3 imóveis reais da seção [CATÁLOGO DE IMÓVEIS REAIS].
   - É TOTALMENTE PROIBIDO responder com perguntas de qualificação como "o que é mais importante além do valor?" ou enrolar quando o cliente pediu opções ou informações sobre imóveis.
   - SEMPRE forneça os dados reais dos imóveis do catálogo: Código, Bairro/Cidade, Valor, Quartos e o LINK OFICIAL DO SITE que está listado.

2. SEMPRE INCLUIR O LINK DO SITE DO IMÓVEL:
   - Toda vez que citar qualquer imóvel, inclua obrigatoriamente a URL oficial que consta no catálogo fornecido (ex: https://www.brfimoveis.com.br/343/imoveis/venda-apartamento-2-quartos-capoeiras-florianopolis-sc).
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

9. CANAL DO YOUTUBE OFICIAL DA BRF IMÓVEIS:
   - A BRF Imóveis possui um canal oficial no YouTube ("BRFIMOVEIS EIRELI ME" / Mauro Fengler) com vídeos e tours de imóveis: https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g
   - Você PODE e DEVE compartilhar o link oficial do canal (https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g) quando o cliente solicitar vídeos, tours virtuais, gravações dos imóveis ou materiais audiovisuais.
   - NUNCA invente links de vídeos específicos individuais que não constem expressamente no contexto. Ao citar vídeos, compartilhe o canal oficial em si para que o cliente explore os vídeos disponíveis.

10. SAÍDA LIMPA: NUNCA mencione processos internos, "catálogo", "contexto", "IA supervisora", "banco de dados" ou "instruções". Envie APENAS a mensagem conversacional em Português do Brasil.

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

    // Optional Mother AI supervisor validation
    if (motherAiInstructions && responseText.length > 0) {
      try {
        const validationRes = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content: `Você é a IA Mãe, supervisora da BRF Imóveis. Avalie se a resposta obedece: "${motherAiInstructions}". REGRA VITAL: NUNCA invente imóveis ou links. Use APENAS imóveis reais fornecidos no contexto. NUNCA reintroduza a pergunta enlatada "o que é mais importante além do valor". Se estiver aprovada, responda APENAS a palavra APROVADO sem nada mais. Se precisar de ajuste, forneça APENAS o texto da mensagem final pronto para o cliente no WhatsApp, SEM nenhum comentário, cabeçalho, introdução, explicação ou rótulo como "Reescrita" ou "APROVADO" ou travessões "---".`,
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
            // Sanitize Mother AI response immediately
            motherFeedback = sanitizeAiResponse(motherFeedback)
            if (motherFeedback) {
              // Ensure Mother AI did not reintroduce the canned values sentence
              if (!isCannedValuesSentence(motherFeedback)) {
                responseText = motherFeedback
                console.log(
                  `[AI_REPLY] Mother AI refined the response (len=${responseText.length})`,
                )
              } else {
                console.warn(
                  '[AI_REPLY] Mother AI attempted to reintroduce canned phrase, discarded.',
                )
              }
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

      const activeCodes = new Set()
      const activeUrls = new Set()
      const activeUrlNumbers = new Set()

      activeCatalogProps.forEach((p) => {
        const c = (p.getString('code') || '').trim().toUpperCase()
        if (c) {
          activeCodes.add(c)
          activeCodes.add(c.replace(/\s+/g, ''))
          activeCodes.add(c.replace(/[-_\s]+/g, ''))
        }
        const u = (p.getString('url') || '').trim().toLowerCase()
        if (u) {
          activeUrls.add(u)
          const numMatch = u.match(/brfimoveis\.com\.br\/(\d+)/i)
          if (numMatch) {
            activeUrlNumbers.add(numMatch[1])
          }
        }
      })

      // Split text into blocks / paragraphs (separated by double newlines or list items / tables)
      // Check each block: does it cite a property code or a brfimoveis link?
      const rawBlocks = text.split(/\n\s*\n/)
      const validBlocks = []
      const removedBlocks = []
      let hadHallucinatedProperty = false

      for (const block of rawBlocks) {
        const trimmedBlock = block.trim()
        if (!trimmedBlock) continue

        // Extract any brfimoveis.com.br or external URLs in this block
        const urlMatches = trimmedBlock.match(/https?:\/\/[^\s\)\>\"\'\`]+/gi) || []
        let hasInvalidUrl = false
        if (urlMatches.length > 0) {
          for (const rawUrl of urlMatches) {
            const cleanUrl = rawUrl.toLowerCase().replace(/[\.,;:!\?]+$/, '')

            // ALLOWLIST: Legitimate non-property links (YouTube channel BRF, WhatsApp, social networks)
            const isAllowlistedUrl =
              cleanUrl.includes('youtube.com/channel/uca2jsoitvtf8vkgwg65yh_g') ||
              cleanUrl.includes('youtube.com/@maurofenglerbrf') ||
              cleanUrl.includes('youtube.com/@brfimoveis') ||
              cleanUrl.includes('youtube.com/@brfimoveiseirelime') ||
              cleanUrl.includes('youtube.com/watch') ||
              cleanUrl.includes('youtu.be/') ||
              cleanUrl.includes('wa.me/') ||
              cleanUrl.includes('api.whatsapp.com/') ||
              cleanUrl.includes('instagram.com/mauro.brfimoveis')

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
                if (!activeUrlNumbers.has(urlNum)) {
                  hasInvalidUrl = true
                  console.warn(
                    `[AI_PROPERTY_VALIDATION] Invalid/Hallucinated property URL detected: ${rawUrl}`,
                  )
                  break
                }
              } else if (!isCatalogStaticPage && !activeUrls.has(cleanUrl)) {
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
        const codeMatches =
          trimmedBlock.match(
            /(?:código|cod|cód\.?|ref\.?|\b)\s*[*_`]*([A-Z]{2,4}\s*[-_]?\s*\d{2,4})[*_`]*/gi,
          ) || []
        for (const matchStr of codeMatches) {
          const extracted = matchStr
            .replace(/^(?:código|cod|cód\.?|ref\.?)\s*/i, '')
            .replace(/[*_`]/g, '')
            .trim()
            .toUpperCase()
          const normExtracted = extracted.replace(/\s+/g, '').replace(/[-_]/g, '')
          // Exclude generic numbers or dates
          if (
            normExtracted.length >= 3 &&
            !normExtracted.startsWith('R$') &&
            !normExtracted.startsWith('BR101')
          ) {
            // Check if this code belongs to active properties
            let existsInCatalog = false
            for (const ac of activeCodes) {
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

    // Fallback function to generate 2-3 real catalog properties from properties collection
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
            return p && (p.get('is_active') === true || p.getBool?.('is_active') === true)
          } catch (_) {
            return true
          }
        })
      }

      // 2. If candidates list is empty or had no active items, query the catalog directly
      if (activeProps.length === 0) {
        try {
          // If criteria were extracted, try to filter by price / bedrooms
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

          // Relax location if empty
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

          // Global fallback: any active properties
          if (activeProps.length === 0) {
            activeProps = $app.findRecordsByFilter('properties', 'is_active = true', 'price', 3, 0)
          }
        } catch (dbErr) {
          console.warn(`[AI_REPLY] Error querying properties for fallback: ${String(dbErr)}`)
        }
      }

      if (activeProps && activeProps.length > 0) {
        const topProps = activeProps.slice(0, 3)
        let generatedCatalogReply = ''
        if (displayName) {
          generatedCatalogReply += `Oi, ${displayName}! `
        } else {
          generatedCatalogReply += `Olá! `
        }

        const maxP = typeof extractedMaxPrice === 'number' ? extractedMaxPrice : 0
        const beds = typeof extractedBedrooms === 'number' ? extractedBedrooms : 0

        if (maxP > 0 || beds > 0) {
          generatedCatalogReply += `Separei aqui opções reais do nosso catálogo que se encaixam no que você procura`
          if (beds > 0) generatedCatalogReply += ` (${beds} dormitórios`
          if (maxP > 0) generatedCatalogReply += `, até R$ ${(maxP / 1000).toFixed(0)}k)`
          else if (beds > 0) generatedCatalogReply += `)`
          generatedCatalogReply += `:\n\n`
        } else {
          generatedCatalogReply += `Aqui estão excelentes opções do nosso catálogo oficial:\n\n`
        }

        topProps.forEach((p) => {
          const pCode = (p.getString('code') || '').trim()
          const pTitle = (p.getString('title') || '').trim()
          let pUrl = (p.getString('url') || '').trim()
          const pCity = (p.getString('city') || '').trim()
          const pNeigh = (p.getString('neighborhood') || '').trim()
          let pPrice = (p.getString('price_formatted') || '').trim()
          const pBeds = p.getInt('bedrooms')
          const pSuites = p.getInt('suites')

          if (!pPrice) {
            const rawPrice = p.getFloat('price')
            if (rawPrice > 0) {
              pPrice = `R$ ${rawPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            } else {
              pPrice = 'Consulte valores'
            }
          }

          if (!pUrl) {
            pUrl = 'https://www.brfimoveis.com.br/imoveis/venda'
          }

          generatedCatalogReply += `📍 *${pCode}* - ${pTitle}\n`
          generatedCatalogReply += `• Localização: ${pNeigh ? pNeigh + ', ' : ''}${pCity}\n`
          generatedCatalogReply += `• Valor: ${pPrice}\n`
          if (pBeds > 0) {
            generatedCatalogReply += `• Dormitórios: ${pBeds}${pSuites > 0 ? ` (${pSuites} suítes)` : ''}\n`
          }
          generatedCatalogReply += `• Link com fotos e detalhes: ${pUrl}\n\n`
        })

        generatedCatalogReply += `Dá uma olhada nos links! Qual dessas opções você achou mais interessante? Se quiser, posso agendar para você conhecer pessoalmente.`
        return generatedCatalogReply
      }

      return `Olá! Você pode conferir nosso catálogo completo de imóveis diretamente no site: https://www.brfimoveis.com.br/imoveis/venda. Se preferir um atendimento exclusivo com o corretor Mauro, ele atende no link: https://wa.me/5548992098050`
    }

    // Check if after sanitation the response became empty or lacks real properties when requested
    const needsCatalogFallback =
      !responseText.trim() ||
      (validationResult.hadHallucinatedProperty &&
        (!responseText.includes('http') || responseText.length < 30)) ||
      (isRequestingOptions &&
        (!responseText.includes('http') || !responseText.includes('brfimoveis.com.br')))

    // If response was repetitive, canned, or stripped of hallucinated properties, replace with real catalog options!
    if (cannedDetected || isTooSimilar || needsCatalogFallback) {
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
          fbErrLog.set('payload', JSON.stringify({ customer_id: customerId, error: String(fbErr) }))
          $app.saveNoValidate(fbErrLog)
        } catch (_) {}
      }
    }

    // FINAL UNCONDITIONAL SANITIZATION & CANNED INTERCEPTION
    // Guarantee that no supervisor metadata, headers, or canned sentences can slip through to WhatsApp
    responseText = sanitizeAiResponse(responseText)
    if (isCannedValuesSentence(responseText)) {
      console.warn('[AI_REPLY] Final check detected canned sentence, forcing catalog fallback')
      responseText = generateCatalogFallbackMessage(matchedProps)
      responseText = sanitizeAiResponse(responseText)
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

    // Resilient fallback: attempt to send real catalog properties or safety response
    try {
      if (customerId && (conversationChannel === 'whatsapp' || !conversationChannel)) {
        console.log(
          `[AI_REPLY] Top-level catch attempting emergency catalog fallback for ${customerId}...`,
        )
        let emergencyReply = ''

        // Try to query active properties directly
        try {
          const fallbackProps = $app.findRecordsByFilter(
            'properties',
            'is_active = true',
            'price',
            3,
            0,
          )
          if (fallbackProps && fallbackProps.length > 0) {
            let custDisplayName = ''
            try {
              const custRec = $app.findRecordById('customers', customerId)
              const cName = (
                custRec.getString('first_name') ||
                custRec.getString('name') ||
                ''
              ).trim()
              if (cName && !cName.includes('+') && !/^\d+$/.test(cName)) {
                custDisplayName = cName.split(' ')[0]
              }
            } catch (_) {}

            emergencyReply = custDisplayName ? `Oi, ${custDisplayName}! ` : `Olá! `
            emergencyReply += `Separei aqui excelentes opções reais do nosso catálogo oficial da BRF Imóveis:\n\n`

            fallbackProps.forEach((p) => {
              const pCode = (p.getString('code') || '').trim()
              const pTitle = (p.getString('title') || '').trim()
              let pUrl =
                (p.getString('url') || '').trim() || 'https://www.brfimoveis.com.br/imoveis/venda'
              const pCity = (p.getString('city') || '').trim()
              const pNeigh = (p.getString('neighborhood') || '').trim()
              let pPrice = (p.getString('price_formatted') || '').trim()
              const pBeds = p.getInt('bedrooms')
              const pSuites = p.getInt('suites')

              if (!pPrice) {
                const rawPrice = p.getFloat('price')
                pPrice =
                  rawPrice > 0
                    ? `R$ ${rawPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Consulte valores'
              }

              emergencyReply += `📍 *${pCode}* - ${pTitle}\n`
              emergencyReply += `• Localização: ${pNeigh ? pNeigh + ', ' : ''}${pCity}\n`
              emergencyReply += `• Valor: ${pPrice}\n`
              if (pBeds > 0) {
                emergencyReply += `• Dormitórios: ${pBeds}${pSuites > 0 ? ` (${pSuites} suítes)` : ''}\n`
              }
              emergencyReply += `• Link com fotos e detalhes: ${pUrl}\n\n`
            })
            emergencyReply += `Dá uma olhada nos links! Qual dessas opções você achou mais interessante? Se quiser, posso agendar para você conhecer pessoalmente.`
          }
        } catch (catDbErr) {
          console.warn(`[AI_REPLY] Emergency catalog lookup error: ${String(catDbErr)}`)
        }

        // If catalog lookup also failed, use minimal safety message
        if (!emergencyReply) {
          emergencyReply = `Olá! Você pode conferir nosso catálogo completo de imóveis diretamente no site: https://www.brfimoveis.com.br/imoveis/venda. Se preferir um atendimento exclusivo com o corretor Mauro, ele atende no link: https://wa.me/5548992098050`
        }

        // Save conversation record
        try {
          const convCol = $app.findCollectionByNameOrId('conversations')
          const rec = new Record(convCol)
          rec.set('user_id', userId || '')
          rec.set('customer_id', customerId)
          rec.set('sender', 'ai')
          rec.set('content', emergencyReply)
          rec.set('channel', conversationChannel || 'whatsapp')
          $app.save(rec)
        } catch (_) {}

        // Resolve meta credentials if needed
        let emMetaToken = ''
        let emPhoneId = ''
        try {
          const usersWithMeta = $app.findRecordsByFilter(
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

        let emCustomerPhone = ''
        try {
          const cRec = $app.findRecordById('customers', customerId)
          emCustomerPhone = cRec.getString('phone') || ''
        } catch (_) {}

        let emCleanPhone = emCustomerPhone.replace(/\D/g, '')
        if (emCleanPhone.length === 10 || emCleanPhone.length === 11) {
          emCleanPhone = '55' + emCleanPhone
        }

        if (emMetaToken && emPhoneId && emCleanPhone) {
          callMetaWithRetry(
            `https://graph.facebook.com/v21.0/${emPhoneId}/messages`,
            'POST',
            { Authorization: `Bearer ${emMetaToken}`, 'Content-Type': 'application/json' },
            JSON.stringify({
              messaging_product: 'whatsapp',
              to: emCleanPhone,
              type: 'text',
              text: { body: emergencyReply },
            }),
          )
          console.log(`[AI_REPLY] Emergency fallback sent to ${emCleanPhone}`)
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
    if (acquiredLock) {
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
        } catch (_) {}
      }
    }
  }

  return e.next()
}, 'conversations')
