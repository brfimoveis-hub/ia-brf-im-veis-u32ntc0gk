onRecordAfterCreateSuccess((e) => {
  const customerId = e.record.id
  const userId = e.record.getString('user_id')
  const status = e.record.getString('status') || 'Base de Clientes/Novo LYD'

  let userRecord = null
  try {
    if (userId) userRecord = $app.findRecordById('users', userId)
  } catch (_) {}

  const aiName = userRecord ? userRecord.getString('ai_name') || 'Bia' : 'Bia'
  const baseInstructions = userRecord ? userRecord.getString('ai_instructions') : ''

  let cadenceRecord = null
  try {
    const cadences = $app.findRecordsByFilter(
      'cadences',
      `user_id = '${userId}' && is_active = true && title = '${status.replace(/'/g, "''")}'`,
      '-created',
      1,
      0,
    )
    if (cadences.length > 0) {
      cadenceRecord = cadences[0]
    } else if (status === 'Novo' || status === 'lead' || status === 'Base de Clientes/Novo LYD') {
      const firstCadences = $app.findRecordsByFilter(
        'cadences',
        `user_id = '${userId}' && is_active = true`,
        'order',
        1,
        0,
      )
      if (firstCadences.length > 0) {
        cadenceRecord = firstCadences[0]
      }
    }
  } catch (err) {
    $app.logger().error('Error fetching cadence for customer create', err)
  }

  if (!cadenceRecord) {
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', userId)
      logRecord.set('type', 'diagnostic')
      logRecord.set('message', 'Cadência inicial não encontrada')
      logRecord.set(
        'details',
        `Nenhuma cadência ativa encontrada para a fase inicial '${status}'. Usando apenas instruções base.`,
      )
      logRecord.set('payload', { customer_id: customerId, status: status, warning: true })
      $app.saveNoValidate(logRecord)
    } catch (_) {}
  }

  const cadenceContent = cadenceRecord ? cadenceRecord.getString('content') : ''
  const cadenceInstructions = cadenceRecord ? cadenceRecord.getString('ai_instructions') : ''
  let cadenceStepsJson = ''
  try {
    if (cadenceRecord) {
      const steps = cadenceRecord.get('steps')
      if (steps) cadenceStepsJson = JSON.stringify(steps)
    }
  } catch (_) {}

  let aiInstructions = baseInstructions
  if (cadenceContent || cadenceInstructions || cadenceStepsJson) {
    aiInstructions += `\n\nDIRETRIZES DA FASE ATUAL (${status}):\n`
    if (cadenceContent) aiInstructions += `Procedimento/Conteúdo: ${cadenceContent}\n`
    if (cadenceInstructions) aiInstructions += `Instruções Específicas: ${cadenceInstructions}\n`
    if (cadenceStepsJson) aiInstructions += `Passos da Cadência (JSON): ${cadenceStepsJson}\n`
    aiInstructions += `\nIMPORTANTE: Com base nos passos da cadência, conduza o lead para o próximo passo. Quando o lead atingir o objetivo de uma nova fase, inclua no final da sua resposta a tag [STATUS: Nova_Fase] para atualizar o CRM.\n`
  }

  if (!aiInstructions.trim()) {
    $app.logger().info('AI Trigger skipped: No instructions on create', 'customerId', customerId)
    return e.next()
  }

  const apiKey = $secrets.get('OPENAI_API_KEY')
  if (!apiKey) {
    $app.logger().warn('AI Trigger skipped: No OPENAI_API_KEY on create')
    return e.next()
  }

  try {
    const logsCol = $app.findCollectionByNameOrId('system_logs')
    const logRecord = new Record(logsCol)
    logRecord.set('user_id', userId)
    logRecord.set('type', 'diagnostic')
    logRecord.set('message', 'AI Triggered by New Lead')
    logRecord.set(
      'details',
      `Novo lead capturado com status '${status}'. Preparando primeira interação usando cadência específica.`,
    )
    logRecord.set('payload', {
      customer_id: customerId,
      status: status,
    })
    $app.saveNoValidate(logRecord)
  } catch (_) {}

  // If there are already messages, this might conflict with ai_auto_reply.
  // We check if there are any conversations. If there are, it means ai_auto_reply will handle it.
  try {
    const existingMsgs = $app.findRecordsByFilter(
      'conversations',
      `customer_id = '${customerId}'`,
      '',
      1,
      0,
    )
    if (existingMsgs.length > 0) {
      $app
        .logger()
        .info('Skipping on_customer_create AI trigger because conversation already exists')
      return e.next()
    }
  } catch (_) {}

  const messages = []
  const systemPrompt = `Você é ${aiName}.
Sua identidade e instruções principais:
${aiInstructions}

EVENTO ATUAL:
Um novo lead acabou de entrar no sistema na fase "${status}".

SUA TAREFA:
Baseado nas instruções e no procedimento da cadência para a fase atual, escreva a primeira mensagem de abordagem/engajamento (outbound) para este cliente.
Seja direta, empática e humana.
NUNCA mencione que você viu o lead entrar no sistema. A mensagem deve parecer natural.
NUNCA comece com confirmações tipo "Entendido" ou "Vou enviar". Apenas escreva a mensagem para o cliente.
Se as suas instruções não prevêem o envio de nenhuma mensagem inicial ou se não for o momento adequado, responda EXATAMENTE com "SKIP_MESSAGE".`

  messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: '(Inicie a conversa com o lead)' })

  const chatRes = $http.send({
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.3,
      max_tokens: 400,
    }),
    timeout: 30,
  })

  if (chatRes.statusCode === 200 && chatRes.json?.choices?.[0]?.message?.content) {
    let responseText = chatRes.json.choices[0].message.content.trim()

    responseText = responseText.replace(/\[STATUS:\s*.*?\]/gi, '').trim()

    if (responseText !== 'SKIP_MESSAGE' && responseText !== '') {
      try {
        const reply = new Record($app.findCollectionByNameOrId('conversations'))
        reply.set('user_id', userId)
        reply.set('customer_id', customerId)
        reply.set('sender', 'ai')
        reply.set('content', responseText)
        $app.save(reply)

        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', userId)
        logRecord.set('type', 'diagnostic')
        logRecord.set('message', 'IA enviou primeira mensagem para novo lead')
        logRecord.set('details', `Mensagem de abordagem gerada para a fase ${status}.`)
        logRecord.set('payload', { customer_id: customerId, text: responseText })
        $app.saveNoValidate(logRecord)
      } catch (err) {
        $app.logger().error('Error saving AI initial reply', err)
      }

      try {
        const phone = e.record.getString('phone') || ''
        const source = e.record.getString('source') || ''
        const uazapiUrl = $secrets.get('UAZAPI_URL') || ''
        const uazapiKey = $secrets.get('UAZAPI_API_KEY') || ''

        if (
          phone &&
          uazapiUrl &&
          uazapiKey &&
          (phone.includes('48992098050') || source.includes('Uazapi') || source.includes('Meta - '))
        ) {
          let instanceName = '48992098050'
          if (source.includes('Uazapi - ')) {
            instanceName = source.replace('Uazapi - ', '').trim()
          } else if (source.includes('Meta - ')) {
            instanceName = source.replace('Meta - ', '').trim()
          }
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
        }
      } catch (_) {}
    }
  }

  return e.next()
}, 'customers')
