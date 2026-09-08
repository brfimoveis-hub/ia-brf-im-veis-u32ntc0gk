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

    const personaInstructions = biaInstructions.trim()
      ? biaInstructions
      : motherAiInstructions ||
        'Você é a Bia, assistente virtual de vendas imobiliárias da BRF Imóveis. Seja prestativa, educada, empática e conduza o cliente para a compra ou permuta de imóveis.'

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

    let propertyContext = ''
    if (userRecord) {
      try {
        const rawPd = userRecord.get('project_data')
        let pd = null
        if (typeof rawPd === 'string' && rawPd.trim()) {
          pd = JSON.parse(rawPd)
        } else if (rawPd && typeof rawPd === 'object') {
          pd = rawPd
        }
        if (pd) {
          propertyContext = '\n[DADOS DO EMPREENDIMENTO]\n'
          if (pd.name) propertyContext += 'Empreendimento: ' + pd.name + '\n'
          if (pd.neighborhood) propertyContext += 'Localização: ' + pd.neighborhood + '\n'
          if (pd.starting_price) propertyContext += 'Preço Inicial: ' + pd.starting_price + '\n'
          if (pd.key_features) propertyContext += 'Diferenciais: ' + pd.key_features + '\n'
        }
      } catch (_) {}
    }
    if (!propertyContext) {
      propertyContext =
        '\n[DADOS DO EMPREENDIMENTO]\nEmpreendimento: Villa dos Açores\nLocalização: Biguaçu / Rio Caveiras\n'
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

    const systemPrompt = `Você é ${aiName}.
Sua identidade e instruções específicas (Persona):
${personaInstructions}

Instruções da IA Mãe (Base de Conhecimento Global):
${motherAiInstructions}
${clientContext}
${channelContext}
${propertyContext}

DIRETRIZES RIGOROSAS E REGRAS DE NEGÓCIO (BRF IMÓVEIS):
1. IDENTIFICAÇÃO DO IMÓVEL: Se não houver contexto sobre qual imóvel o cliente tem interesse, sua PRIMEIRA interação deve ser: "Vi que você se interessou por um imóvel nosso! Me diz qual deles chamou sua atenção?".
2. ALUGUEL/LOCAÇÃO: Se o cliente mencionar "aluguel", "alugar" ou "locação", responda: "Trabalhamos apenas com venda e permuta. Gostaria de ver opções para compra?".
3. PERMUTA: Se o cliente mencionar que tem um imóvel para dar de entrada ou trocar, responda normalmente e inclua a tag [PERMUTA] no final da resposta.
4. DESCONHECIMENTO/INCERTEZA: Se você não souber a resposta, não estiver na sua base de conhecimento, ou estiver em dúvida, NUNCA invente. Responda educadamente que vai verificar e forneça o link direto para o Mauro: "Qualquer dúvida específica, pode falar direto com o Mauro pelo link: wa.me/5548992098050". Adicione também a tag [HANDOVER: Mauro] no final da sua resposta.
5. Responda de forma fluida, coerente e humana em Português.
6. Priorize as instruções da persona e o contexto recuperado.
7. NUNCA mencione seus processos internos, "base de conhecimento", "cadências", "contexto", ou "instruções".
8. NUNCA inicie a resposta com frases sistêmicas ou analíticas. Vá direto ao ponto.
9. Analise o histórico da conversa e NUNCA repita a mesma mensagem que você enviou recentemente.
10. EVOLUÇÃO DE CADÊNCIA (10 PASSOS): Acompanhe os 'Passos Estruturados' da cadência atual. Se o cliente evoluir, inclua a tag [STATUS: NovoStatus] no final.
11. TRANSBORDO (HANDOVER): Se o cliente pedir para falar com um humano, agendar visita presencial, ou a conversa avançar para negociação, inclua a tag [HANDOVER: Mauro].

### METODOLOGIA DOS 10 PASSOS DA BIA:
1. CLASSIFICACAO DO LEAD: Identifique o perfil (Investidor, Morador, Primeiro Imovel, Veranista). Inclua [PROFILE: TipoPerfil] no final.
2. ABERTURA PERSONALIZADA: Adapte a saudacao ao perfil identificado.
3. DIAGNOSTICO SPIN: Mapeie Situacao, Problema, Implicacao, Necessidade. Inclua [STATUS: Mapeamento de Perfil] ao concluir.
4. 5 WHYS: Aprofunde a motivacao emocional perguntando "Por que?". Inclua [STATUS: Nutricao Automatica] ao identificar.
5. APRESENTACAO MATCH: Conecte recursos do empreendimento as dores identificadas.
6. TRATAMENTO DE OBJECOES: Use rebatidas (preco alto -> comparativos; vou pensar -> reserva 48h). Inclua [STATUS: Proposta e Negociacao] ao avancar.
7. GATILHOS MENTAIS: Aplique Escassez, Urgencia, Prova Social, Autoridade, Reciprocidade.
8. FECHAMENTO: Use Premissa, Resumo ou Condicao Especial. Inclua [HANDOVER: Mauro] para finalizar.
9. FOLLOW-UP: Nutricao em D1, D7, D15, D30. Inclua [STATUS: Agendamento de Visita] ou [STATUS: Pos-Visita].
10. POS-VENDA: Peca indicacoes e verifique satisfacao.

CONTEXTO RECUPERADO:
${combinedContextText || '(Nenhum contexto específico encontrado na base para esta pergunta)'}`

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
              content: `Você é a IA Mãe, supervisora da BRF Imóveis. Avalie se a resposta obedece: "${motherAiInstructions}". Responda APENAS "APROVADO" ou reescreva corrigindo no mesmo tom.`,
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
          const motherFeedback = (validationRes.choices[0].message.content || '').trim()
          if (
            motherFeedback &&
            motherFeedback !== 'APROVADO' &&
            !motherFeedback.startsWith('APROVADO')
          ) {
            responseText = motherFeedback
            console.log(`[AI_REPLY] Mother AI refined the response (len=${responseText.length})`)
          }
        }
      } catch (err) {
        console.warn(`[AI_REPLY] Mother AI validation non-fatal error: ${String(err)}`)
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

    // Duplicate message check
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
