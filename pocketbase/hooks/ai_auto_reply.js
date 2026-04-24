onRecordAfterCreateSuccess((e) => {
  const sender = e.record.getString('sender')

  if (sender !== 'customer') {
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
        if (lastMsg.getString('sender') !== 'customer') {
          $app
            .logger()
            .info(
              'Skipping auto-reply: last message not from customer',
              'lastSender',
              lastMsg.getString('sender'),
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

    if (tags.includes('ai_paused')) {
      return e.next()
    }

    const apiKey = $secrets.get('OPENAI_API_KEY')
    if (!apiKey) {
      $app.logger().warn('OPENAI_API_KEY missing for ai auto reply')
      return e.next()
    }

    const userId = e.record.getString('user_id')
    let userRecord = null
    try {
      if (userId) userRecord = $app.findRecordById('users', userId)
    } catch (_) {}

    const aiName = userRecord ? userRecord.getString('ai_name') || 'Bia' : 'Bia'

    let aiInstructions = ''
    try {
      if (userId) {
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
        if (msg.getString('sender') === 'system') return
        const role =
          msg.getString('sender') === 'ai' ||
          msg.getString('sender') === 'agent' ||
          msg.getString('sender') === 'user'
            ? 'assistant'
            : 'user'
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
    }
  } catch (err) {
    $app.logger().error('AI Auto Reply Error', 'err', err)
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
