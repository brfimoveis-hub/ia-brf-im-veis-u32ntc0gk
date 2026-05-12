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
      ? userRecord.getString('delivery_start_time') || '09:00'
      : '09:00'
    const deliveryEnd = userRecord ? userRecord.getString('delivery_end_time') || '18:00' : '18:00'
    const deliveryInterval = userRecord ? userRecord.getInt('delivery_interval') || 5 : 5
    let deliveryDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    if (userRecord && userRecord.get('delivery_days')) {
      try {
        const parsed = userRecord.get('delivery_days')
        if (Array.isArray(parsed) && parsed.length > 0) deliveryDays = parsed
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
          return e.next()
        }
      }
    } catch (err) {}

    if (tags.includes('ai_paused')) {
      return e.next()
    }

    const apiKey = $secrets.get('OPENAI_API_KEY')
    if (!apiKey) {
      $app.logger().warn('OPENAI_API_KEY missing for ai auto reply')
      return e.next()
    }

    const aiName = userRecord ? userRecord.getString('ai_name') || 'Bia' : 'Bia'
    const actualAiName = userRecord ? userRecord.getString('ai_name') : ''
    const biaInstructions = userRecord ? userRecord.getString('bia_instructions') : ''
    const motherAiInstructions = userRecord ? userRecord.getString('ai_instructions') : ''

    const personaInstructions = biaInstructions.trim()
      ? biaInstructions
      : motherAiInstructions || 'Seja prestativa e educada.'

    const isNameMissing = !actualAiName.trim()

    if (isNameMissing) {
      $app.logger().warn('AI auto reply skipped due to inactive identity', 'customerId', customerId)
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
      channelContext = `\n[PERFIL DE ATENDIMENTO: GERAL]\nO cliente é um lead novo (primeiro contato).\nDIRETRIZES GERAIS:\n- Faça a qualificação inicial.\n`
    }

    const leadCreatedStr = customer.getString('created')
    let crmPhaseContext = ''
    if (leadCreatedStr) {
      const leadCreated = new Date(leadCreatedStr)
      const daysSinceCreated = Math.floor(
        (now.getTime() - leadCreated.getTime()) / (1000 * 3600 * 24),
      )

      if (daysSinceCreated <= 7) {
        crmPhaseContext = `\n[FASE ATUAL DO LEAD: D0-D7 QUALIFICAÇÃO]\nObjetivo: Apresentar o empreendimento Villa dos Açores e qualificar o lead (entender necessidades, renda e urgência).`
      } else if (daysSinceCreated <= 21) {
        crmPhaseContext = `\n[FASE ATUAL DO LEAD: D8-D21 APRESENTAÇÃO]\nObjetivo: Compartilhar detalhes da planta LM311, vídeos explicativos (sugira enviar vídeo do Veed.io) e focar nos detalhes do m².`
      } else if (daysSinceCreated <= 45) {
        crmPhaseContext = `\n[FASE ATUAL DO LEAD: D22-D45 SIMULAÇÃO]\nObjetivo: Focar em facilidades para autônomos, simulação de parcelamento, financiamento Caixa e entrada flexível.`
      } else {
        crmPhaseContext = `\n[FASE ATUAL DO LEAD: D46-D60+ NEGOCIAÇÃO]\nObjetivo: Agendar visita ao local ou iniciar fechamento de proposta.`
      }
    }

    const propertyContext = `\n[DADOS DO EMPREENDIMENTO]\nEmpreendimento: Villa dos Açores\nLocalização: Biguaçu / Rio Caveiras\nPreço M²: R$ 4.930,77/m²\nPlanta Principal: LM311\n`

    let filesContextText = ''
    if (userRecord) {
      const files = userRecord.get('ai_knowledge_files') || []
      if (files.length > 0) {
        const pbUrl = $secrets.get('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
        files.forEach((f) => {
          if (f.endsWith('.txt') || f.endsWith('.csv')) {
            const fileUrl = `${pbUrl}/api/files/${userRecord.collectionId}/${userRecord.id}/${f}`
            try {
              const res = $http.send({ url: fileUrl, method: 'GET', timeout: 5 })
              if (res.statusCode === 200 && res.body) {
                const str = String.fromCharCode.apply(null, res.body)
                filesContextText += `\n--- Arquivo: ${f} ---\n${str}\n`
              }
            } catch (err) {}
          } else {
            filesContextText += `\n--- Arquivo: ${f} (Conteúdo complementar na IA Mãe) ---\n`
          }
        })
      }
    }

    const combinedContextText = `${contextText}\n${filesContextText}`.trim()

    const messages = []
    const systemPrompt = `Você é ${aiName}.\nSua identidade e instruções específicas (Persona):\n${personaInstructions}\n\nInstruções da IA Mãe (Base de Conhecimento Global):\n${motherAiInstructions}\n${channelContext}\n${crmPhaseContext}\n${propertyContext}\n\nDIRETRIZES RIGOROSAS:\n1. Responda de forma fluida, coerente e humana.\n2. Priorize EXTREMAMENTE as suas "instruções principais" acima e o "CONTEXTO RECUPERADO" abaixo.\n3. NUNCA mencione seus processos internos, "base de conhecimento", "cadências", "contexto", ou "instruções". NUNCA comece frases com parênteses ou colchetes descrevendo suas ações.\n4. NUNCA inicie a resposta com frases como "(Aplicando instruções...)", "Com base no contexto...", ou similares. Vá direto ao ponto.\n5. Analise o histórico da conversa e NUNCA repita a mesma mensagem que você enviou recentemente.\n6. Aja estritamente de acordo com as instruções (roteiro/script) e o Foco Regional definidos na sua identidade. NUNCA invente informações (alucinação).\n7. Se você perceber que o cliente atingiu um novo estágio no funil de vendas ou mudou de fase, você DEVE incluir as tags [PHASE: Nova_Fase] e [STATUS: Novo_Status] no final da sua resposta.\nOs status válidos são: "Base de Clientes/Novo LYD", "Lead Novo", "Contato 1", "Contato 2", "Qualificação", "Qualificado", "Engajamento", "Visita", "Objeção", "Demo Agend.", "Demo Realiz.", "Proposta", "Negociação", "Fechamento".\nAs fases (phase) válidas são: "Lead", "Atendimento", "Visita", "Proposta", "Fechamento".\n8. TRANSBORDO (HANDOVER): Se o cliente pedir para falar com um humano, agendar visita presencial, ou suporte inicial, inclua a tag [HANDOVER: Bernadete] no final de sua resposta. Se for negociação avançada de valores finais ou fechamento financeiro, inclua [HANDOVER: Mauro].\n\nCONTEXTO RECUPERADO:\n${combinedContextText || '(Nenhum contexto específico encontrado na base para esta pergunta)'}`

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
    let detectedPhase = ''
    let detectedHandover = ''

    if (
      chatRes.statusCode === 200 &&
      chatRes.json &&
      chatRes.json.choices &&
      chatRes.json.choices[0] &&
      chatRes.json.choices[0].message &&
      chatRes.json.choices[0].message.content
    ) {
      responseText = chatRes.json.choices[0].message.content.trim()

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

      responseText = responseText.replace(/^[\[\(].*?[\]\)]\s*/gm, '').trim()
      responseText = responseText.replace(/(\(Aplicando.*?\))|(\[Aplicando.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Com base.*?\))|(\[Com base.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Recuperando.*?\))|(\[Recuperando.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Analisando.*?\))|(\[Analisando.*?\])/gi, '').trim()
    } else {
      $app.logger().error('OpenAI Chat failed', 'status', String(chatRes.statusCode))
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

          if (targetStatus === 'Qualificado') {
            const slackWebhook = $secrets.get('SLACK_WEBHOOK_URL')
            if (slackWebhook) {
              try {
                $http.send({
                  url: slackWebhook,
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: `🚀 *Novo Lead Qualificado!*\n*Nome:* ${custToUpdate.getString('name')}\n*Telefone:* ${custToUpdate.getString('phone')}`,
                    channel: '#leads-sc',
                  }),
                  timeout: 10,
                })
              } catch (err) {}
            }
          }
        }
      } catch (err) {
        $app.logger().error('Failed to update customer status', 'error', String(err))
      }

      let uazapiUrl = $secrets.get('UAZAPI_URL') || ''
      let uazapiKey = $secrets.get('UAZAPI_API_KEY') || ''

      try {
        const customerRecord = $app.findRecordById('customers', customerId)
        const source = customerRecord.getString('source') || ''
        const phone = customerRecord.getString('phone') || ''

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

            let uazapiAttempt = 0
            const uazapiMaxRetries = 3
            let uazapiRes = null
            const backoffs = [1000, 3000, 9000]
            const randomDelay = Math.floor(Math.random() * (180000 - 60000 + 1)) + 60000

            while (uazapiAttempt <= uazapiMaxRetries) {
              try {
                uazapiRes = $http.send({
                  url: `${cleanUrl}/message/sendText/${instanceName}`,
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', apikey: uazapiKey },
                  body: JSON.stringify({
                    number: phone,
                    options: { delay: randomDelay, presence: 'composing' },
                    textMessage: { text: responseText },
                  }),
                  timeout: 15,
                })

                if (uazapiRes && (uazapiRes.statusCode === 200 || uazapiRes.statusCode === 201))
                  break
                if (
                  uazapiRes &&
                  uazapiRes.statusCode !== 404 &&
                  uazapiRes.statusCode !== 504 &&
                  uazapiRes.statusCode !== 500 &&
                  uazapiRes.statusCode !== 0
                ) {
                  break
                }
              } catch (e) {}

              if (uazapiAttempt < uazapiMaxRetries) {
                const sleepMs = backoffs[uazapiAttempt] || 9000
                const start = new Date().getTime()
                while (new Date().getTime() - start < sleepMs) {}
              }
              uazapiAttempt++
            }
          }
        }
      } catch (err) {
        $app.logger().error('Error routing message to Uazapi', 'error', String(err))
      }

      // Handover Logic
      if (detectedHandover) {
        let summary = 'A IA transferiu este lead para o atendimento humano.'
        try {
          const summaryRes = $http.send({
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content:
                    'Resuma em poucas palavras o interesse ou objeção deste cliente com base nas últimas mensagens da conversa de vendas. Max 3 linhas.',
                },
                ...messages.slice(-6),
              ],
              temperature: 0.3,
              max_tokens: 150,
            }),
            timeout: 15,
          })
          if (summaryRes.statusCode === 200 && summaryRes.json && summaryRes.json.choices[0]) {
            summary = summaryRes.json.choices[0].message.content.trim()
          }
        } catch (e) {}

        try {
          const customerRec = $app.findRecordById('customers', customerId)
          const summaryText = `*🚨 Transbordo de Lead 🚨*\n*Lead:* ${customerRec.getString('name')} (${customerRec.getString('phone')})\n*Destino:* ${detectedHandover}\n*Resumo da Conversa:*\n${summary}`
          const agentPhone = detectedHandover.toLowerCase().includes('mauro')
            ? '5548999728050'
            : '5548991958012'

          const slackWebhook = $secrets.get('SLACK_WEBHOOK_URL')
          if (slackWebhook) {
            try {
              $http.send({
                url: slackWebhook,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: summaryText, channel: '#leads-sc' }),
                timeout: 10,
              })
            } catch (e) {}
          }

          if (uazapiUrl && uazapiKey) {
            try {
              const cleanUrlHandover = uazapiUrl.endsWith('/') ? uazapiUrl.slice(0, -1) : uazapiUrl

              let source = customerRec.getString('source') || ''
              let instanceName = '48992098050'
              if (source.includes('Uazapi - '))
                instanceName = source.replace('Uazapi - ', '').trim()
              else if (source.includes('Meta - '))
                instanceName = source.replace('Meta - ', '').trim()

              $http.send({
                url: `${cleanUrlHandover}/message/sendText/${instanceName}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: uazapiKey },
                body: JSON.stringify({
                  number: agentPhone,
                  options: { delay: 1000 },
                  textMessage: { text: summaryText },
                }),
                timeout: 15,
              })
            } catch (e) {}
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    $app.logger().error('AI Auto Reply Error', 'error', String(err))
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
      } catch (err) {}
    }
  }

  return e.next()
}, 'conversations')
