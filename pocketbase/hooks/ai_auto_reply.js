onRecordAfterCreateSuccess((e) => {
  const sender = e.record.getString('sender')

  if (sender !== 'customer' && sender !== 'user' && sender !== 'lead') {
    return e.next()
  }

  let acquiredLock = false
  const customerId = e.record.getString('customer_id')

  try {
    const customerInitialCheck = $app.findRecordById('customers', customerId)
    if (customerInitialCheck.get('is_blocked') === true) {
      $app.logger().info('AI trigger skipped: customer is blocked', 'customerId', customerId)
      return e.next()
    }

    try {
      $app.runInTransaction((txApp) => {
        const customer = txApp.findRecordById('customers', customerId)
        const tags = customer.get('tags') || []

        if (tags.includes('ai_processing')) {
          const updatedDate = new Date(customer.getString('updated')).getTime()
          const now = new Date().getTime()
          if (now - updatedDate < 120000) {
            throw new Error('LOCKED')
          }
        }

        const newTags = tags.filter((t) => t !== 'ai_processing')
        newTags.push('ai_processing')
        customer.set('tags', newTags)
        txApp.save(customer)
        acquiredLock = true
      })
    } catch (err) {
      if (err.message === 'LOCKED') {
        $app
          .logger()
          .info(
            'Prevented concurrent execution: AI is already processing',
            'customerId',
            customerId,
          )
        return e.next()
      }
    }

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
        if (lastMsg.id !== e.record.id) {
          $app
            .logger()
            .info(
              'Skipping auto-reply: message is not the latest in conversation',
              'msgId',
              e.record.id,
            )
          return e.next()
        }
        const lastSender = lastMsg.getString('sender')
        if (lastSender !== 'customer' && lastSender !== 'user' && lastSender !== 'lead') {
          $app
            .logger()
            .info(
              'Skipping auto-reply: last message not from customer/user/lead',
              'lastSender',
              lastSender,
            )
          return e.next()
        }
      }
    } catch (err) {}

    const userId = e.record.getString('user_id')
    let userRecord = null
    try {
      if (userId) userRecord = $app.findRecordById('users', userId)
    } catch (err) {}

    try {
      if (userId) {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', userId)
        logRecord.set('type', 'diagnostic')
        logRecord.set('message', 'AI Processing Initiated')
        logRecord.set('details', `Iniciando verificação de regras para resposta automática.`)
        logRecord.set('payload', { customer_id: customerId })
        $app.saveNoValidate(logRecord)
      }
    } catch (err) {}

    const now = new Date()
    const customer = $app.findRecordById('customers', customerId)
    const tags = customer.get('tags') || []
    const customerPhone = customer.getString('phone') || ''
    const customerSource = customer.getString('source') || ''

    let receiverPhone = ''
    const sourceMatch = customerSource.match(/(?:Uazapi|Meta)\s*-\s*(\d+)/)
    if (sourceMatch) {
      receiverPhone = sourceMatch[1]
    } else if (customerPhone.includes('48992098050') || customerSource.includes('48992098050')) {
      receiverPhone = '48992098050'
    } else if (customerPhone.includes('48991828050') || customerSource.includes('48991828050')) {
      receiverPhone = '48991828050'
    }
    const isTargetLead =
      customerPhone.includes('48992098050') || customerSource.includes('48992098050')

    const deliveryEnabled = userRecord ? userRecord.get('delivery_enabled') !== false : true
    const deliveryStart = userRecord
      ? userRecord.getString('delivery_start_time') || '08:00'
      : '08:00'
    const deliveryEnd = userRecord ? userRecord.getString('delivery_end_time') || '18:00' : '18:00'
    const deliveryInterval = userRecord ? userRecord.getInt('delivery_interval') || 5 : 5
    let deliveryDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    if (userRecord && userRecord.get('delivery_days')) {
      try {
        const parsed = userRecord.get('delivery_days')
        if (Array.isArray(parsed)) deliveryDays = parsed
      } catch (err) {}
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
      $app.logger().info('Message deferred: delivery disabled', 'customerId', customerId)
      return e.next()
    }

    const is24_7Flow = receiverPhone.includes('992098050') || isTargetLead

    if (!is24_7Flow) {
      if (
        !deliveryDays.includes(currentDay) ||
        currentTimeStr < deliveryStart ||
        currentTimeStr > deliveryEnd
      ) {
        $app.logger().info('Message deferred: outside business hours', 'customerId', customerId)
        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', userId)
          logRecord.set('type', 'diagnostic')
          logRecord.set('message', 'Message deferred: outside business hours (Remarketing Flow)')
          logRecord.set(
            'details',
            `Envio pausado. Horário permitido: ${deliveryStart}-${deliveryEnd}, dias: ${deliveryDays.join(',')}`,
          )
          logRecord.set('payload', { customer_id: customerId })
          $app.saveNoValidate(logRecord)
        } catch (err) {}
        return e.next()
      }
    }

    try {
      const globalLastAiMsgs = $app.findRecordsByFilter(
        'conversations',
        `user_id = '${userId}' && sender = 'ai'`,
        '-created',
        1,
        0,
      )
      if (globalLastAiMsgs.length > 0) {
        const lastAiDate = new Date(globalLastAiMsgs[0].getString('created'))
        const cooldownMs = deliveryInterval * 60000
        if (now.getTime() - lastAiDate.getTime() < cooldownMs) {
          $app
            .logger()
            .info(
              `Message deferred: interval cooldown active (${deliveryInterval}m)`,
              'customerId',
              customerId,
            )
          try {
            const logsCol = $app.findCollectionByNameOrId('system_logs')
            const logRecord = new Record(logsCol)
            logRecord.set('user_id', userId)
            logRecord.set('type', 'diagnostic')
            logRecord.set('message', `Message deferred: interval cooldown`)
            logRecord.set(
              'details',
              `Aguardando intervalo mínimo de ${deliveryInterval} minutos entre mensagens automáticas.`,
            )
            logRecord.set('payload', { customer_id: customerId })
            $app.saveNoValidate(logRecord)
          } catch (err) {}
          return e.next()
        }
      }
    } catch (err) {}

    if (tags.includes('ai_paused')) {
      if (isTargetLead) {
        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', e.record.getString('user_id'))
          logRecord.set('type', 'diagnostic_error')
          logRecord.set('message', 'AI trigger skipped: AI is paused for this customer')
          logRecord.set('details', `Lead 48992098050 com tag ai_paused.`)
          logRecord.set('payload', { customer_id: customerId })
          $app.saveNoValidate(logRecord)
        } catch (err) {}
      }
      return e.next()
    }

    const apiKey = $secrets.get('OPENAI_API_KEY')
    if (!apiKey) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', userId || '')
        logRecord.set('type', 'diagnostic_error')
        logRecord.set('message', 'AI trigger skipped: missing API Key')
        logRecord.set('details', `OPENAI_API_KEY ausente ou inválida.`)
        logRecord.set('payload', { customer_id: customerId })
        $app.saveNoValidate(logRecord)
      } catch (err) {}
      $app.logger().warn('OPENAI_API_KEY missing for ai auto reply')
      return e.next()
    }

    const aiName = userRecord ? userRecord.getString('ai_name') || 'Bia' : 'Bia'
    const actualAiName = userRecord ? userRecord.getString('ai_name') : ''
    const aiInstructions = userRecord ? userRecord.getString('ai_instructions') : ''

    const isNameMissing = !actualAiName.trim()
    const isInstructionsMissing = !aiInstructions.trim()

    if (isNameMissing || isInstructionsMissing) {
      const reasons = []
      if (isNameMissing) reasons.push('AI Name missing')
      if (isInstructionsMissing) reasons.push('AI Instructions missing')

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', userId || '')
        logRecord.set('type', 'diagnostic_error')
        logRecord.set('message', 'AI trigger skipped: ' + reasons.join(' and '))
        logRecord.set(
          'details',
          `A IA não pode responder porque a configuração está incompleta. Pendências: ${reasons.join(', ')}`,
        )
        logRecord.set('payload', { customer_id: customerId, reasons: reasons })
        $app.saveNoValidate(logRecord)
      } catch (err) {}

      $app
        .logger()
        .warn(
          'AI auto reply skipped due to inactive identity',
          'customerId',
          customerId,
          'reasons',
          reasons.join(', '),
        )
      return e.next()
    }

    const customerMessage = e.record.getString('content') || ''
    const currentStatus = customer.getString('status') || 'Base de Clientes/Novo LYD'
    let activeCadenceText = ''

    try {
      const cadences = $app.findRecordsByFilter(
        'cadences',
        `user_id = '${userId}' && is_active = true && title = '${currentStatus.replace(/'/g, "''")}'`,
        '-created',
        1,
        0,
      )
      if (cadences.length > 0) {
        const c = cadences[0]
        const cTitle = c.getString('title')
        const cContent = c.getString('content')
        const cInst = c.getString('ai_instructions')
        activeCadenceText = `\n\n### CADÊNCIA ATUAL (${cTitle}):\nProcedimento: ${cContent}\nDiretriz Específica: ${cInst}`
      } else {
        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', userId || '')
          logRecord.set('type', 'diagnostic_warning')
          logRecord.set('message', 'Cadência não encontrada para Auto Reply')
          logRecord.set(
            'details',
            `Nenhuma cadência ativa encontrada para a fase '${currentStatus}'.`,
          )
          logRecord.set('payload', { customer_id: customerId, status: currentStatus })
          $app.saveNoValidate(logRecord)
        } catch (err) {}
      }
    } catch (err) {}

    const embedRes = $http.send({
      url: 'https://api.openai.com/v1/embeddings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: customerMessage }),
      timeout: 30,
    })

    let contextChunks = []

    if (
      embedRes.statusCode === 200 &&
      embedRes.json &&
      embedRes.json.data &&
      embedRes.json.data[0] &&
      embedRes.json.data[0].embedding
    ) {
      const queryEmbedding = embedRes.json.data[0].embedding
      const pbaseURL = $secrets.get('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'

      const ragRes = $http.send({
        url: pbaseURL + '/backend/v1/rag-search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer internal-rag-token-123',
        },
        body: JSON.stringify({ query: queryEmbedding, userId: userId }),
        timeout: 15,
      })

      if (ragRes.statusCode === 200 && ragRes.json) {
        if (ragRes.json.knowledge_base) {
          ragRes.json.knowledge_base.forEach((item) => {
            if (item.content) {
              contextChunks.push(`### Informação (${item.title || 'Geral'}):\n${item.content}`)
            }
          })
        }
        if (ragRes.json.cadences) {
          ragRes.json.cadences.forEach((item) => {
            if (item.content) {
              contextChunks.push(
                `### Procedimento de Venda (${item.title || 'Fluxo'}):\n${item.content}`,
              )
            }
            if (item.ai_instructions) {
              contextChunks.push(
                `Diretriz Específica para este Procedimento:\n${item.ai_instructions}`,
              )
            }
          })
        }
      } else {
        $app.logger().error('RAG search failed', 'status', String(ragRes.statusCode))
      }
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
    } catch (err) {}

    let channelContext = ''
    if (receiverPhone.includes('991828050')) {
      channelContext = `\n[PERFIL DE ATENDIMENTO: REMARKETING]\nO cliente veio de uma campanha de remarketing (já nos conhece ou interagiu antes).\nDIRETRIZES DE REMARKETING:\n- Aborde de forma mais direta, focando em reengajamento.\n- Trabalhe ativamente objeções (preço, tempo, localização).\n- Se for Villa dos Açores e houver objeção de preço, argumente que o valor é excelente (R$ 4.930,77/m²) e a localização estratégica em Biguaçu.\n`
    } else {
      channelContext = `\n[PERFIL DE ATENDIMENTO: GERAL]\nO cliente é um lead novo (primeiro contato).\nDIRETRIZES GERAIS:\n- Faça a qualificação inicial.\n- Se houver interesse no Villa dos Açores, pergunte sobre as preferências dele (ex: prefere suíte ou foca mais na área de lazer/piscina?).\n`
    }

    const messages = []
    const systemPrompt = `Você é ${aiName}.\nSua identidade e instruções principais:\n${aiInstructions || 'Seja prestativa, educada e direta.'}\n${channelContext}\nDIRETRIZES RIGOROSAS:\n1. Responda de forma fluida, coerente e humana.\n2. Priorize EXTREMAMENTE as suas "instruções principais" acima e o "CONTEXTO RECUPERADO" abaixo.\n3. NUNCA mencione seus processos internos, "base de conhecimento", "cadências", "contexto", ou "instruções". NUNCA comece frases com parênteses ou colchetes descrevendo suas ações.\n4. NUNCA inicie a resposta com frases como "(Aplicando instruções...)", "Com base no contexto...", ou similares. Vá direto ao ponto.\n5. Analise o histórico da conversa e NUNCA repita a mesma mensagem que você enviou recentemente.\n6. Aja estritamente de acordo com as instruções (roteiro/script) e o Foco Regional definidos na sua identidade. Se a resposta exigir conhecimentos que não constam nas instruções ou no contexto, contorne educadamente. NUNCA invente informações (alucinação).\n7. Se você perceber que o cliente atingiu um novo estágio no funil de vendas ou mudou de fase (ex: agendou visita, demonstrou objeção, fechou negócio), você DEVE incluir as tags [PHASE: Nova_Fase] e [STATUS: Novo_Status] no final da sua resposta.\nOs status válidos são: "Lead Novo", "Contato 1", "Contato 2", "Qualificação", "Engajamento", "Visita", "Objeção", "Proposta", "Negociação", "Fechamento".\nAs fases (phase) válidas são: "Lead", "Atendimento", "Visita", "Proposta", "Fechamento".\n\nCONTEXTO RECUPERADO:\n${contextText || '(Nenhum contexto específico encontrado na base para esta pergunta)'}`

    messages.push({ role: 'system', content: systemPrompt })

    if (historyRecords && historyRecords.length > 0) {
      historyRecords.forEach((msg) => {
        const msgSender = msg.getString('sender')
        if (msgSender === 'system') return
        const role = msgSender === 'ai' || msgSender === 'agent' ? 'assistant' : 'user'
        if (msg.id !== e.record.id) {
          messages.push({ role: role, content: msg.getString('content') || '' })
        }
      })
    }

    messages.push({ role: 'user', content: customerMessage })

    const chatRes = $http.send({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.3,
        max_tokens: 500,
      }),
      timeout: 45,
    })

    let responseText =
      'Desculpe, estou com uma instabilidade no momento e não consegui gerar uma resposta.'
    let detectedStatus = ''

    if (
      chatRes.statusCode === 200 &&
      chatRes.json &&
      chatRes.json.choices &&
      chatRes.json.choices[0] &&
      chatRes.json.choices[0].message &&
      chatRes.json.choices[0].message.content
    ) {
      responseText = chatRes.json.choices[0].message.content.trim()

      let detectedPhase = ''

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

      responseText = responseText.replace(/^[\[\(].*?[\]\)]\s*/gm, '').trim()
      responseText = responseText.replace(/(\(Aplicando.*?\))|(\[Aplicando.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Com base.*?\))|(\[Com base.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Recuperando.*?\))|(\[Recuperando.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Analisando.*?\))|(\[Analisando.*?\])/gi, '').trim()
    } else {
      $app.logger().error('OpenAI Chat failed', 'status', String(chatRes.statusCode))
      try {
        if (userId) {
          const logCollection = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logCollection)
          logRecord.set('user_id', userId)
          logRecord.set('type', 'diagnostic_error')
          logRecord.set('message', 'Falha na comunicação com OpenAI Chat')
          logRecord.set(
            'details',
            'Ocorreu um erro ao tentar gerar a resposta da IA. Status HTTP: ' + chatRes.statusCode,
          )
          const errorRaw = chatRes.json ? JSON.stringify(chatRes.json) : 'error'
          logRecord.set('payload', { status: chatRes.statusCode, raw: errorRaw })
          $app.save(logRecord)
        }
      } catch (err) {}
    }

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
        if (lastMsg.id !== e.record.id) {
          isDuplicate = true
          $app
            .logger()
            .info('Prevented auto-reply: conversation already advanced', 'newMsgId', lastMsg.id)
        }
      }

      if (!isDuplicate) {
        const lastAiMsgs = $app.findRecordsByFilter(
          'conversations',
          `customer_id = '${customerId}' && sender = 'ai'`,
          '-created',
          1,
          0,
        )
        if (lastAiMsgs.length > 0) {
          const lastAiMsg = lastAiMsgs[0]
          const lastContent = (lastAiMsg.getString('content') || '').trim().toLowerCase()
          const newContent = responseText.trim().toLowerCase()

          if (lastContent === newContent) {
            isDuplicate = true
            $app
              .logger()
              .info('Prevented loop: exact same AI response generated', 'customerId', customerId)
          }
        }
      }
    } catch (err) {}

    if (!isDuplicate) {
      const reply = new Record($app.findCollectionByNameOrId('conversations'))
      reply.set('user_id', userId)
      reply.set('customer_id', customerId)
      reply.set('sender', 'ai')
      reply.set('content', responseText)

      $app.save(reply)

      try {
        const custToUpdate = $app.findRecordById('customers', customerId)
        const custStatusLower = (custToUpdate.getString('status') || '').toLowerCase()

        let targetStatus = ''
        const validStatuses = [
          'Base de Clientes/Novo LYD',
          'Lead Novo',
          'Contato 1',
          'Contato 2',
          'Qualificação',
          'Qualificado',
          'Engajamento',
          'Visita',
          'Objeção',
          'Demo Agend.',
          'Demo Realiz.',
          'Proposta',
          'Negociação',
          'Fechamento',
        ]

        if (detectedStatus && validStatuses.includes(detectedStatus)) {
          targetStatus = detectedStatus
        } else if (
          custStatusLower === 'novo' ||
          custStatusLower === 'lead novo' ||
          custStatusLower === 'base de clientes/novo lyd' ||
          custStatusLower === ''
        ) {
          targetStatus = 'Contato 1'
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

        if (crmUpdated) {
          $app.save(custToUpdate)
          try {
            const logsCol = $app.findCollectionByNameOrId('system_logs')
            const logRecord = new Record(logsCol)
            logRecord.set('user_id', userId)
            logRecord.set('type', 'crm_update')
            logRecord.set('message', 'Lead Evolution: CRM Phase/Status Updated by AI')
            logRecord.set(
              'details',
              `Status mudou para: ${targetStatus || custStatusLower}. Phase mudou para: ${targetPhase || custToUpdate.getString('phase')}.`,
            )
            logRecord.set('payload', {
              customer_id: customerId,
              status: targetStatus,
              phase: targetPhase,
            })
            $app.saveNoValidate(logRecord)
          } catch (e) {}
        }
      } catch (err) {
        $app.logger().error('Failed to update customer status', 'error', String(err))
      }

      try {
        const customerRecord = $app.findRecordById('customers', customerId)
        const source = customerRecord.getString('source') || ''
        const phone = customerRecord.getString('phone') || ''

        const uazapiUrl = $secrets.get('UAZAPI_URL') || ''
        const uazapiKey = $secrets.get('UAZAPI_API_KEY') || ''

        if (
          source.includes('Uazapi') ||
          source.includes('48992098050') ||
          phone.includes('48992098050') ||
          (uazapiUrl && uazapiKey)
        ) {
          let instanceName = '48992098050'
          if (source.includes('Uazapi - ')) {
            instanceName = source.replace('Uazapi - ', '').trim()
          } else if (source.includes('Meta - ')) {
            instanceName = source.replace('Meta - ', '').trim()
          }

          if (uazapiUrl && uazapiKey && phone) {
            const cleanUrl = uazapiUrl.endsWith('/') ? uazapiUrl.slice(0, -1) : uazapiUrl
            $http.send({
              url: `${cleanUrl}/message/sendText/${instanceName}`,
              method: 'POST',
              headers: { 'Content-Type': 'application/json', apikey: uazapiKey },
              body: JSON.stringify({
                number: phone,
                options: { delay: 1200, presence: 'composing' },
                textMessage: { text: responseText },
              }),
              timeout: 15,
            })

            const logsCol = $app.findCollectionByNameOrId('system_logs')
            const logRecord = new Record(logsCol)
            logRecord.set('user_id', userId)
            logRecord.set('type', 'diagnostic')
            logRecord.set('message', 'Mensagem enviada via Uazapi')
            logRecord.set(
              'details',
              `Resposta da IA enviada para ${phone} via instância ${instanceName}`,
            )
            logRecord.set('payload', { phone: phone, instanceName: instanceName })
            $app.saveNoValidate(logRecord)
          }
        }
      } catch (err) {
        $app.logger().error('Error routing message to Uazapi', 'error', String(err))
        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', userId)
          logRecord.set('type', 'diagnostic_error')
          logRecord.set('message', 'Falha ao enviar resposta via Uazapi')
          logRecord.set('details', String(err))
          $app.saveNoValidate(logRecord)
        } catch (err2) {}
      }

      try {
        if (userId) {
          const userRecord = $app.findRecordById('users', userId)
          const capiToken = userRecord.getString('meta_capi_token')
          const mainPixelId = userRecord.getString('meta_pixel_id')
          const tagsList = userRecord.get('meta_tags_list') || []
          const testCode = userRecord.getString('meta_test_event_code')

          let targetPixels = []
          if (mainPixelId) targetPixels.push(mainPixelId)
          if (tagsList && Array.isArray(tagsList)) {
            tagsList.forEach((t) => {
              if (t.id && !targetPixels.includes(t.id)) targetPixels.push(t.id)
            })
          }

          if (capiToken && targetPixels.length > 0) {
            const customerRecord = $app.findRecordById('customers', customerId)
            const phoneVal = customerRecord.getString('phone') || ''
            const phoneNorm = phoneVal.replace(/\D/g, '')
            if (phoneNorm) {
              const hashPhone = $security.sha256(phoneNorm)
              const timeUnix = Math.floor(new Date().getTime() / 1000)

              targetPixels.forEach((pixelId) => {
                const events = []

                // General AI Reply (Lead)
                events.push({
                  event_name: 'Lead',
                  event_time: timeUnix,
                  action_source: 'system_generated',
                  user_data: { ph: [hashPhone] },
                  custom_data: { currency: 'BRL', value: 0.0, content_name: 'ai_reply' },
                })

                // Fechamento Event (Purchase)
                const isClosing = detectedStatus === 'Fechamento' || detectedPhase === 'Fechamento'
                if (isClosing) {
                  events.push({
                    event_name: 'Purchase',
                    event_time: timeUnix,
                    action_source: 'system_generated',
                    user_data: { ph: [hashPhone] },
                    custom_data: { currency: 'BRL', value: 0.0, content_name: 'ai_fechamento' },
                  })
                }

                const payload = { data: events }
                if (testCode) payload.test_event_code = testCode

                $http.send({
                  url: `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                  timeout: 5,
                })
              })

              const isClosingAny = detectedStatus === 'Fechamento' || detectedPhase === 'Fechamento'
              if (isClosingAny) {
                try {
                  const logsCol = $app.findCollectionByNameOrId('system_logs')
                  const logRecord = new Record(logsCol)
                  logRecord.set('user_id', userId)
                  logRecord.set('type', 'crm_update')
                  logRecord.set('message', 'Meta CAPI Event Sent: Purchase (Fechamento)')
                  logRecord.set('details', `Evento de fechamento enviado para pixels.`)
                  logRecord.set('payload', { customer_id: customerId })
                  $app.saveNoValidate(logRecord)
                } catch (e) {}
              }
            }
          }
        }
      } catch (err) {
        $app.logger().error('CAPI Error in AI Reply', 'error', String(err))
      }

      try {
        if (userId) {
          const logCollection = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logCollection)
          logRecord.set('user_id', userId)
          logRecord.set('type', 'diagnostic')
          logRecord.set('message', 'IA respondeu ao cliente com sucesso')

          let detailsMsg = 'A inteligência artificial gerou e enviou uma resposta.'
          if (contextText) {
            detailsMsg +=
              ' Baseada em contexto específico recuperado da Base de Conhecimento/Cadências.'
          } else {
            detailsMsg +=
              ' Utilizou apenas as instruções principais (sem contexto específico adicional encontrado).'
          }
          logRecord.set('details', detailsMsg)
          logRecord.set('payload', { customer_id: customerId, context_used: !!contextText })
          $app.save(logRecord)
        }
      } catch (err) {}
    }
  } catch (err) {
    $app.logger().error('AI Auto Reply Error', 'error', String(err))
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      const userIdVal = e.record.getString('user_id') || ''
      logRecord.set('user_id', userIdVal)
      logRecord.set('type', 'diagnostic_error')
      logRecord.set('message', 'Falha na Execução do AI Auto Reply')
      logRecord.set('details', String(err))
      logRecord.set('payload', {
        error: String(err),
        record_id: e.record.id,
        customer_id: customerId || 'unknown',
      })
      $app.saveNoValidate(logRecord)
    } catch (err2) {}
  } finally {
    if (acquiredLock) {
      try {
        $app.runInTransaction((txApp) => {
          const customer = txApp.findRecordById('customers', customerId)
          const tags = customer.get('tags') || []
          if (tags.includes('ai_processing')) {
            customer.set(
              'tags',
              tags.filter((t) => t !== 'ai_processing'),
            )
            txApp.save(customer)
          }
        })
      } catch (err) {
        $app
          .logger()
          .error('Failed to release lock', 'customerId', customerId, 'error', String(err))
      }
    }
  }

  return e.next()
}, 'conversations')
