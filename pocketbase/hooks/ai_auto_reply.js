onRecordAfterCreateSuccess((e) => {
  const sender = e.record.getString('sender')

  if (sender !== 'customer' && sender !== 'user' && sender !== 'lead') {
    return e.next()
  }

  let acquiredLock = false
  const customerId = e.record.getString('customer_id')

  try {
    // 0. Strict Locking Mechanism
    try {
      $app.runInTransaction((txApp) => {
        const customer = txApp.findRecordById('customers', customerId)
        const tags = customer.get('tags') || []

        if (tags.includes('ai_processing')) {
          const updatedDate = new Date(customer.getString('updated')).getTime()
          const now = new Date().getTime()
          // If lock is older than 2 minutes, assume stale and override
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

    // 1. Race condition / Trigger optimization check
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
    } catch (_) {}

    // 1.5 Cooldown check (Debouncing)
    try {
      const lastAiMsgs = $app.findRecordsByFilter(
        'conversations',
        `customer_id = '${customerId}' && sender = 'ai'`,
        '-created',
        1,
        0,
      )
      if (lastAiMsgs.length > 0) {
        const lastAiDate = new Date(lastAiMsgs[0].getString('created'))
        const now = new Date()
        if (now.getTime() - lastAiDate.getTime() < 10000) {
          $app
            .logger()
            .info('Skipping auto-reply: cooldown period active (10s)', 'customerId', customerId)
          return e.next()
        }
      }
    } catch (_) {}

    const customer = $app.findRecordById('customers', customerId)
    const tags = customer.get('tags') || []
    const customerPhone = customer.getString('phone') || ''
    const customerSource = customer.getString('source') || ''
    const isTargetLead =
      customerPhone.includes('48992098050') || customerSource.includes('48992098050')

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
        } catch (_) {}
      }
      return e.next()
    }

    const apiKey = $secrets.get('OPENAI_API_KEY')
    if (!apiKey) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', e.record.getString('user_id') || '')
        logRecord.set('type', 'diagnostic_error')
        logRecord.set('message', 'AI trigger skipped: missing API Key')
        logRecord.set('details', `OPENAI_API_KEY ausente ou inválida.`)
        logRecord.set('payload', { customer_id: customerId })
        $app.saveNoValidate(logRecord)
      } catch (_) {}
      $app.logger().warn('OPENAI_API_KEY missing for ai auto reply')
      return e.next()
    }

    const userId = e.record.getString('user_id')
    let userRecord = null
    try {
      if (userId) userRecord = $app.findRecordById('users', userId)
    } catch (_) {}

    const aiName = userRecord ? userRecord.getString('ai_name') || 'Bia' : 'Bia'

    let aiInstructions = userRecord ? userRecord.getString('ai_instructions') || '' : ''
    try {
      if (userId && !aiInstructions) {
        const kbRecords = $app.findRecordsByFilter(
          'knowledge_base',
          `user_id = '${userId}'`,
          '-created',
          1,
          0,
        )
        if (kbRecords && kbRecords.length > 0) {
          aiInstructions = kbRecords[0].getString('ai_instructions') || ''
        }
      }
    } catch (_) {}

    const actualAiName = userRecord ? userRecord.getString('ai_name') : ''
    const metaTokenStatus = userRecord ? userRecord.getString('meta_token_status') : ''
    const hasMeta =
      metaTokenStatus === 'active' || metaTokenStatus === 'valid' || metaTokenStatus === 'Connected'

    const isNameMissing = !actualAiName.trim()
    const isInstructionsMissing = !aiInstructions || aiInstructions.trim().length < 10
    const isMetaMissing = !hasMeta

    if (isNameMissing || isInstructionsMissing || isMetaMissing) {
      const reasons = []
      if (isNameMissing) reasons.push('Nome da IA não configurado')
      if (isInstructionsMissing) reasons.push('Instruções da IA ausentes ou insuficientes')
      if (isMetaMissing) reasons.push('Integração Meta Ads não validada')

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', userId || '')
        logRecord.set('type', 'diagnostic_error')
        logRecord.set('message', 'AI trigger skipped: Identidade Inativa')
        logRecord.set(
          'details',
          `A IA não pode responder porque a Identidade está inativa. Pendências: ${reasons.join(', ')}`,
        )
        logRecord.set('payload', { customer_id: customerId, reasons })
        $app.saveNoValidate(logRecord)
      } catch (_) {}

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

    // 2. Embed customer message
    const embedRes = $http.send({
      url: 'https://api.openai.com/v1/embeddings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: customerMessage }),
      timeout: 30,
    })

    let contextChunks = []

    if (embedRes.statusCode === 200 && embedRes.json?.data?.[0]?.embedding) {
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
            if (item.content)
              contextChunks.push(`### Informação (${item.title || 'Geral'}):\n${item.content}`)
          })
        }
        if (ragRes.json.cadences) {
          ragRes.json.cadences.forEach((item) => {
            if (item.content)
              contextChunks.push(
                `### Procedimento de Venda (${item.title || 'Fluxo'}):\n${item.content}`,
              )
            if (item.ai_instructions)
              contextChunks.push(
                `Diretriz Específica para este Procedimento:\n${item.ai_instructions}`,
              )
          })
        }
      } else {
        $app.logger().error('RAG search failed', 'status', ragRes.statusCode)
      }
    }

    const contextText = contextChunks.join('\n\n')

    // 3. Fetch conversation history
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

    const messages = []
    const systemPrompt = `Você é ${aiName}, Assistente Virtual de Vendas da BRF Imóveis.
Sua identidade e instruções principais:
${aiInstructions || 'Seja prestativa, educada e direta. Se não souber a resposta, direcione para um corretor.'}

DIRETRIZES RIGOROSAS:
1. Responda de forma fluida, coerente e humana, baseando-se EXCLUSIVAMENTE no CONTEXTO RECUPERADO abaixo.
2. NUNCA mencione seus processos internos, "base de conhecimento", "cadências", "contexto", ou "instruções". NUNCA comece frases com parênteses ou colchetes descrevendo suas ações.
3. NUNCA inicie a resposta com frases como "(Aplicando instruções...)", "Com base no contexto...", ou similares. Vá direto ao ponto.
4. Analise o histórico da conversa e NUNCA repita a mesma mensagem que você enviou recentemente.
5. Se a resposta não estiver no contexto, contorne educadamente informando que não tem essa informação no momento e que um corretor entrará em contato. NUNCA invente informações (alucinação).

CONTEXTO RECUPERADO:
${contextText || '(Nenhum contexto específico encontrado na base para esta pergunta)'}`

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

    // 4. Call Chat API
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
    if (chatRes.statusCode === 200 && chatRes.json?.choices?.[0]?.message?.content) {
      responseText = chatRes.json.choices[0].message.content.trim()
      // Sanitize: Remove possible leaked instruction blocks if AI fails to follow directions
      responseText = responseText.replace(/^[\[\(].*?[\]\)]\s*/gm, '').trim()
      responseText = responseText.replace(/(\(Aplicando.*?\))|(\[Aplicando.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Com base.*?\))|(\[Com base.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Recuperando.*?\))|(\[Recuperando.*?\])/gi, '').trim()
      responseText = responseText.replace(/(\(Analisando.*?\))|(\[Analisando.*?\])/gi, '').trim()
    } else {
      $app.logger().error('OpenAI Chat failed', 'status', chatRes.statusCode, 'body', chatRes.raw)
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
          logRecord.set('payload', { status: chatRes.statusCode, raw: chatRes.raw })
          $app.save(logRecord)
        }
      } catch (_) {}
    }

    // 5. Idempotency and State check
    let isDuplicate = false
    try {
      // 5.1 Check if the conversation has advanced while we were processing
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

      // 5.2 Prevent sending the exact same content (Duplicate Content Filter)
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
    } catch (_) {}

    if (!isDuplicate) {
      const reply = new Record($app.findCollectionByNameOrId('conversations'))
      reply.set('user_id', userId)
      reply.set('customer_id', customerId)
      reply.set('sender', 'ai')
      reply.set('content', responseText)

      $app.save(reply)

      // Update customer status to em_atendimento
      try {
        const custToUpdate = $app.findRecordById('customers', customerId)
        const currentStatus = (custToUpdate.getString('status') || '').toLowerCase()
        if (currentStatus === 'novo' || currentStatus === '') {
          custToUpdate.set('status', 'em_atendimento')
          $app.save(custToUpdate)
        }
      } catch (err) {
        $app.logger().error('Failed to update customer status', err)
      }

      // Route response to Uazapi / Meta
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
            logRecord.set('payload', { phone, instanceName })
            $app.saveNoValidate(logRecord)
          }
        }
      } catch (err) {
        $app.logger().error('Error routing message to Uazapi', err)
        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', userId)
          logRecord.set('type', 'diagnostic_error')
          logRecord.set('message', 'Falha ao enviar resposta via Uazapi')
          logRecord.set('details', String(err))
          $app.saveNoValidate(logRecord)
        } catch (_) {}
      }

      // CAPI Event for AI Reply
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
                const payload = {
                  data: [
                    {
                      event_name: 'Lead',
                      event_time: timeUnix,
                      action_source: 'system_generated',
                      user_data: { ph: [hashPhone] },
                      custom_data: { currency: 'BRL', value: 0.0, content_name: 'ai_reply' },
                    },
                  ],
                }
                if (testCode) payload.test_event_code = testCode

                $http.send({
                  url: `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                  timeout: 5,
                })
              })
            }
          }
        }
      } catch (err) {
        $app.logger().error('CAPI Error in AI Reply', 'err', err)
      }

      try {
        if (userId) {
          const logCollection = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logCollection)
          logRecord.set('user_id', userId)
          logRecord.set('type', 'diagnostic')
          logRecord.set('message', 'IA respondeu ao cliente com sucesso')
          logRecord.set('details', 'A inteligência artificial gerou e enviou uma resposta.')
          logRecord.set('payload', { customer_id: customerId, context_used: !!contextText })
          $app.save(logRecord)
        }
      } catch (_) {}
    }
  } catch (err) {
    $app.logger().error('AI Auto Reply Error', 'err', err)
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', e.record.getString('user_id') || '')
      logRecord.set('type', 'diagnostic_error')
      logRecord.set('message', 'Falha na Execução do AI Auto Reply')
      logRecord.set('details', String(err))
      logRecord.set('payload', {
        error: String(err),
        record_id: e.record.id,
        customer_id: customerId || 'unknown',
      })
      $app.saveNoValidate(logRecord)
    } catch (_) {}
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
        $app.logger().error('Failed to release lock', 'customerId', customerId, 'err', err)
      }
    }
  }

  return e.next()
}, 'conversations')
