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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return res
        }
      } catch (e) {}
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
      newLog.set('payload', JSON.stringify({ statusCode: res?.statusCode, body: res?.json }))
      $app.saveNoValidate(newLog)
    } catch (e) {}

    return res
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

    let userId = e.record.getString('user_id')
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
    } catch (err) {}

    const strictGuidelines = `
### REGRAS OBRIGATÓRIAS (SIGA ESTRITAMENTE):
1. FOCO EM VENDA/PERMUTA: Priorize venda e permuta. Nós NÃO trabalhamos com aluguel. Se o cliente perguntar sobre aluguel, informe gentilmente que a especialidade é apenas Venda e Permuta.
2. HANDOFF PARA HUMANO: Se o cliente fizer uma pergunta que você não saiba responder com base no seu conhecimento, ou se ele pedir explicitamente para falar com um "corretor", "humano", "atendente" ou "Mauro", responda EXATAMENTE COM ESTA FRASE:
"Entendi sua dúvida. Vou te transferir agora para o Mauro, nosso especialista: https://wa.me/5548992098050"
E não adicione mais nenhuma palavra.`

    activeCadenceText += `\n\n${strictGuidelines}`

    let queryEmbedding = null
    try {
      const res = $ai.embed({ input: customerMessage })
      if (res.data && res.data[0]) {
        queryEmbedding = res.data[0].embedding
      }
    } catch (err) {
      $app.logger().error('Embedding failed', 'error', String(err))
    }

    let contextChunks = []

    if (queryEmbedding) {
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
      channelContext = `\n[PERFIL DE ATENDIMENTO: REMARKETING]\nO cliente veio de uma campanha de remarketing (já nos conhece ou interagiu antes).\nDIRETRIZES DE REMARKETING:\n- Aborde de forma mais direta, focando em reengajamento.\n- Trabalhe ativamente objeções.\n`
    } else {
      channelContext = `\n[PERFIL DE ATENDIMENTO: GERAL]\nO cliente é um lead novo (primeiro contato).\nDIRETRIZES GERAIS:\n- Faça a qualificação inicial.\n`
    }

    let crmPhaseContext = ''

    const propertyContext = `\n[DADOS DO EMPREENDIMENTO]\nEmpreendimento: Villa dos Açores\nLocalização: Biguaçu / Rio Caveiras\n`

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
          }
        })
      }
    }

    const combinedContextText = `${contextText}\n${filesContextText}`.trim()

    const messages = []
    const systemPrompt = `Você é ${aiName}.
Sua identidade e instruções específicas (Persona):
${personaInstructions}

Instruções da IA Mãe (Base de Conhecimento Global):
${motherAiInstructions}
${channelContext}
${crmPhaseContext}
${propertyContext}

DIRETRIZES RIGOROSAS E REGRAS DE NEGÓCIO (BRF IMÓVEIS):
1. IDENTIFICAÇÃO DO IMÓVEL: Se não houver contexto sobre qual imóvel o cliente tem interesse, sua PRIMEIRA interação deve ser: "Vi que você se interessou por um imóvel nosso! Me diz qual deles chamou sua atenção?".
2. ALUGUEL/LOCAÇÃO: Se o cliente mencionar "aluguel", "alugar" ou "locação", responda: "Trabalhamos apenas com venda e permuta. Gostaria de ver opções para compra?".
3. PERMUTA: Se o cliente mencionar que tem um imóvel para dar de entrada ou trocar, responda normalmente e inclua a tag [PERMUTA] no final da resposta.
4. DESCONHECIMENTO/INCERTEZA: Se você não souber a resposta, não estiver na sua base de conhecimento, ou estiver em dúvida, NUNCA invente. Responda educadamente que vai verificar e forneça o link direto para o Mauro: "Qualquer dúvida específica, pode falar direto com o Mauro pelo link: wa.me/5548992098050". Adicione também a tag [HANDOVER: Mauro] no final da sua resposta.
5. Responda de forma fluida, coerente e humana.
6. Priorize EXTREMAMENTE as suas "instruções principais" acima e o "CONTEXTO RECUPERADO" abaixo.
7. NUNCA mencione seus processos internos, "base de conhecimento", "cadências", "contexto", ou "instruções".
8. NUNCA inicie a resposta com frases sistêmicas ou analíticas. Vá direto ao ponto.
9. Analise o histórico da conversa e NUNCA repita a mesma mensagem que você enviou recentemente.
10. EVOLUÇÃO DE CADÊNCIA (10 PASSOS): Acompanhe os 'Passos Estruturados' da cadência atual. Se o cliente evoluir, inclua a tag [STATUS: NovoStatus] no final.
11. TRANSBORDO (HANDOVER): Se o cliente pedir para falar com um humano, agendar visita presencial, ou a conversa avançar para negociação, inclua a tag [HANDOVER: Mauro].

CONTEXTO RECUPERADO:
${combinedContextText || '(Nenhum contexto específico encontrado na base para esta pergunta)'}`

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

    let responseText =
      'Desculpe, estou com uma instabilidade no momento e não consegui gerar uma resposta.'
    let detectedStatus = ''
    let detectedPhase = ''
    let detectedHandover = ''

    try {
      const chatRes = $ai.chat({
        model: 'fast',
        messages: messages,
      })
      if (chatRes.choices && chatRes.choices[0] && chatRes.choices[0].message) {
        responseText = chatRes.choices[0].message.content.trim()
      }
    } catch (err) {
      $app.logger().error('Skip AI Chat failed', 'error', String(err))
    }

    if (
      responseText !==
      'Desculpe, estou com uma instabilidade no momento e não consegui gerar uma resposta.'
    ) {
      if (motherAiInstructions) {
        try {
          const validationRes = $ai.chat({
            model: 'fast',
            messages: [
              {
                role: 'system',
                content: `Você é a IA Mãe, o sistema mestre de supervisão. Avalie se a resposta gerada pela Persona Bia obedece às diretrizes globais de negócio: "${motherAiInstructions}". Responda APENAS com "APROVADO" se estiver correta e dentro das regras, ou reescreva a mensagem corrigindo os desvios e mantendo o mesmo tom original, preservando também as tags sistêmicas se houver.`,
              },
              { role: 'user', content: responseText },
            ],
          })

          if (
            validationRes.choices &&
            validationRes.choices[0] &&
            validationRes.choices[0].message
          ) {
            const motherFeedback = validationRes.choices[0].message.content.trim()
            if (motherFeedback !== 'APROVADO' && !motherFeedback.startsWith('APROVADO')) {
              responseText = motherFeedback
              $app.logger().info('IA Mãe corrigiu a resposta da Bia', 'customerId', customerId)
            }
          }
        } catch (err) {
          $app.logger().error('Mother AI validation failed', 'error', String(err))
        }
      }

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

      let detectedPermuta = false
      if (responseText.includes('[PERMUTA]')) {
        detectedPermuta = true
        responseText = responseText.replace(/\[PERMUTA\]/gi, '').trim()
      }

      responseText = responseText.replace(/^[\[\(].*?[\]\)]\s*/gm, '').trim()
      responseText = responseText.replace(/(\(Aplicando.*?\))|(\[Aplicando.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Com base.*?\))|(\[Com base.*?\])/gi, '').trim()
    } else {
      $app.logger().error('OpenAI Chat failed or skipped')
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
          }
        }
      }
    } catch (err) {}

    if (!isDuplicate) {
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
          targetStatus = 'lead'
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

        if (detectedHandover) {
          const tags = custToUpdate.get('tags') || []
          if (!tags.includes('ai_paused')) {
            tags.push('ai_paused')
            custToUpdate.set('tags', tags)
            crmUpdated = true
          }
        }

        if (crmUpdated) {
          $app.save(custToUpdate)

          if (targetStatus === 'Qualificação') {
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
        } catch (e) {}
      }

      const cleanPhone = customerPhone.replace(/\D/g, '')

      if (metaToken && metaPhoneId) {
        if (responseText) {
          callMetaWithRetry(
            `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
            'POST',
            { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
            JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanPhone,
              type: 'text',
              text: { body: responseText },
            }),
          )
        }

        if (sendAudio) {
          try {
            const ttsRes = callMetaWithRetry(
              'https://api.openai.com/v1/audio/speech',
              'POST',
              { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
              JSON.stringify({
                model: 'tts-1',
                input: responseText || 'Olá',
                voice: userRecord?.getString('ai_voice_id') || 'nova',
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
                `https://graph.facebook.com/v19.0/${metaPhoneId}/media`,
                'POST',
                {
                  Authorization: `Bearer ${metaToken}`,
                  'Content-Type': `multipart/form-data; boundary=${boundary}`,
                },
                bodyBytes.buffer,
              )

              if (mediaRes && mediaRes.statusCode === 200 && mediaRes.json?.id) {
                callMetaWithRetry(
                  `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
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
          } catch (err) {
            $app.logger().error('Audio TTS/Upload failed', 'error', String(err))
          }
        }

        if (sendVideo) {
          try {
            const avatarRes = $http.send({
              url: 'https://api.heygen.com/v1/video.generate',
              method: 'POST',
              headers: { Authorization: `Bearer MOCK`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: responseText, avatar_id: 'bia_default' }),
              timeout: 5,
            })
            const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4'

            callMetaWithRetry(
              `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
              'POST',
              { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
              JSON.stringify({
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'video',
                video: { link: videoUrl, caption: 'Assista a esta apresentação!' },
              }),
            )
          } catch (err) {
            $app.logger().error('Video generation failed', 'error', String(err))
          }
        }
      } else if (uazapiUrl && uazapiKey && customerPhone) {
        try {
          const source = customer.getString('source') || ''
          const phone = customer.getString('phone') || ''

          let instanceName = '48992098050'
          if (source.includes('Uazapi - ')) {
            instanceName = source.replace('Uazapi - ', '').trim()
          }

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

              if (uazapiRes && (uazapiRes.statusCode === 200 || uazapiRes.statusCode === 201)) break
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
        } catch (err) {
          $app.logger().error('Error routing message to Uazapi', 'error', String(err))
        }
      }

      if (detectedHandover) {
        let summary = 'A IA transferiu este lead para o atendimento humano.'
        try {
          const summaryRes = $ai.chat({
            model: 'fast',
            messages: [
              {
                role: 'system',
                content:
                  'Resuma em poucas palavras o interesse ou objeção deste cliente com base nas últimas mensagens da conversa de vendas. Max 3 linhas.',
              },
              ...messages.slice(-6),
            ],
          })
          if (summaryRes.choices && summaryRes.choices[0] && summaryRes.choices[0].message) {
            summary = summaryRes.choices[0].message.content.trim()
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

          if (metaToken && metaPhoneId) {
            callMetaWithRetry(
              `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
              'POST',
              { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
              JSON.stringify({
                messaging_product: 'whatsapp',
                to: agentPhone,
                type: 'text',
                text: { body: summaryText },
              }),
            )
          } else if (uazapiUrl && uazapiKey) {
            try {
              const cleanUrlHandover = uazapiUrl.endsWith('/') ? uazapiUrl.slice(0, -1) : uazapiUrl

              let source = customerRec.getString('source') || ''
              let instanceName = '48992098050'
              if (source.includes('Uazapi - '))
                instanceName = source.replace('Uazapi - ', '').trim()

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
