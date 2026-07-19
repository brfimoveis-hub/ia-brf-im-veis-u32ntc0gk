onRecordAfterUpdateSuccess((e) => {
  const oldStatus = e.record.original().getString('status')
  const newStatus = e.record.getString('status')

  if (!oldStatus || oldStatus === newStatus) {
    return e.next()
  }

  const customerId = e.record.id
  const userId = e.record.getString('user_id')

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
      `user_id = '${userId}' && is_active = true && title = '${newStatus.replace(/'/g, "''")}'`,
      '-created',
      1,
      0,
    )
    if (cadences.length > 0) {
      cadenceRecord = cadences[0]
    }
  } catch (err) {
    $app.logger().error('Error fetching cadence for status change', err)
  }

  if (!cadenceRecord) {
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', userId)
      logRecord.set('type', 'diagnostic_warning')
      logRecord.set('message', 'Cadência não encontrada')
      logRecord.set(
        'details',
        `Nenhuma cadência ativa encontrada para a fase '${newStatus}'. Usando apenas instruções base da IA.`,
      )
      logRecord.set('payload', { customer_id: customerId, status: newStatus })
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
    aiInstructions += `\n\nDIRETRIZES DA FASE ATUAL (${newStatus}):\n`
    if (cadenceContent) aiInstructions += `Procedimento/Conteúdo: ${cadenceContent}\n`
    if (cadenceInstructions) aiInstructions += `Instruções Específicas: ${cadenceInstructions}\n`
    if (cadenceStepsJson) aiInstructions += `Passos da Cadência (JSON): ${cadenceStepsJson}\n`
    aiInstructions += `\nIMPORTANTE: Com base nos passos da cadência, conduza o lead para o próximo passo. Quando o lead atingir o objetivo de uma nova fase, você poderá incluir a tag [STATUS: Nova_Fase] nas próximas mensagens para atualizar o CRM. ATENÇÃO: Você NUNCA deve mover o lead para a fase "Fechamento" ou estágios finais automaticamente. Essa ação é restrita a humanos, então não forneça a tag [STATUS: Fechamento].\n`
  }

  if (!aiInstructions.trim()) {
    $app.logger().info('AI Trigger skipped: No instructions', 'customerId', customerId)
    return e.next()
  }

  try {
    const logsCol = $app.findCollectionByNameOrId('system_logs')
    const logRecord = new Record(logsCol)
    logRecord.set('user_id', userId)
    logRecord.set('type', 'diagnostic')
    logRecord.set('message', 'AI Triggered by Status Change')
    logRecord.set(
      'details',
      `Cliente moveu de '${oldStatus}' para '${newStatus}'. Analisando próxima ação usando cadência específica.`,
    )
    logRecord.set('payload', {
      customer_id: customerId,
      old_status: oldStatus,
      new_status: newStatus,
    })
    $app.saveNoValidate(logRecord)
  } catch (_) {}

  let historyRecords = []
  try {
    historyRecords = $app.findRecordsByFilter(
      'conversations',
      `customer_id = '${customerId}'`,
      '-created',
      15,
      0,
    )

    // Prevent double AI trigger if the AI just replied and updated the status itself
    if (historyRecords.length > 0 && historyRecords[0].getString('sender') === 'ai') {
      const msSinceAiMsg =
        new Date().getTime() - new Date(historyRecords[0].getString('created')).getTime()
      if (msSinceAiMsg < 10000) {
        $app
          .logger()
          .info(
            'AI Status Trigger skipped: Status was just updated by AI auto-reply',
            'customerId',
            customerId,
          )
        return e.next()
      }
    }

    historyRecords.reverse()
  } catch (_) {}

  const messages = []
  const systemPrompt = `Você é ${aiName}.
Sua identidade e instruções principais:
${aiInstructions}

EVENTO ATUAL:
O cliente acabou de ser movido pelo agente para a fase de funil: "${newStatus}". (Fase anterior: "${oldStatus}").

SUA TAREFA:
Analise o histórico da conversa e as instruções. Se houver uma mensagem ideal ou um follow-up que deve ser enviado AGORA nesta nova fase, escreva essa mensagem.
Seja direta, empática e humana.
NUNCA mencione que você viu uma mudança de status no sistema. A mensagem deve parecer natural.
NUNCA comece com confirmações tipo "Entendido" ou "Vou enviar". Apenas escreva a mensagem para o cliente.
Se as suas instruções não prevêem o envio de nenhuma mensagem para esta fase ou se não for o momento adequado, responda EXATAMENTE com "SKIP_MESSAGE".`

  messages.push({ role: 'system', content: systemPrompt })

  if (historyRecords && historyRecords.length > 0) {
    historyRecords.forEach((msg) => {
      const msgSender = msg.getString('sender')
      if (msgSender === 'system') return
      const role = msgSender === 'ai' || msgSender === 'agent' ? 'assistant' : 'user'
      messages.push({ role: role, content: msg.getString('content') || '' })
    })
  } else {
    messages.push({ role: 'user', content: '(Nenhum histórico anterior)' })
  }

  try {
    const chatRes = $ai.chat({
      model: 'fast',
      messages: messages,
    })

    if (chatRes.choices && chatRes.choices[0] && chatRes.choices[0].message) {
      let responseText = chatRes.choices[0].message.content.trim()

      // Sanitize in case AI includes the STATUS tag by mistake
      responseText = responseText.replace(/\[STATUS:\s*.*?\]/gi, '').trim()

      if (responseText !== 'SKIP_MESSAGE' && responseText !== '') {
        try {
          const reply = new Record($app.findCollectionByNameOrId('conversations'))
          reply.set('user_id', userId)
          reply.set('customer_id', customerId)
          reply.set('sender', 'ai')
          reply.set('content', responseText)
          $app.save(reply)

          // System Log
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', userId)
          logRecord.set('type', 'diagnostic')
          logRecord.set('message', 'IA enviou mensagem após mudança de fase')
          logRecord.set('details', `Mensagem gerada para a fase ${newStatus}.`)
          logRecord.set('payload', { customer_id: customerId, text: responseText })
          $app.saveNoValidate(logRecord)
        } catch (err) {
          $app.logger().error('Error saving AI reply for status change', err)
        }

        // Send via Meta WhatsApp API
        try {
          const phone = e.record.getString('phone') || ''
          if (phone && userRecord) {
            let metaToken = userRecord.getString('meta_whatsapp_access_token') || ''
            let metaPhoneId = userRecord.getString('meta_whatsapp_phone_number_id') || ''

            if (!metaToken || !metaPhoneId) {
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
            }

            if (metaToken && metaPhoneId) {
              const cleanPhone = phone.replace(/\D/g, '')
              $http.send({
                url: `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${metaToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: cleanPhone,
                  type: 'text',
                  text: { body: responseText },
                }),
                timeout: 15,
              })
            }
          }
        } catch (_) {}
      } else {
        // Skipped
        try {
          const logsCol = $app.findCollectionByNameOrId('system_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('user_id', userId)
          logRecord.set('type', 'diagnostic')
          logRecord.set('message', 'IA não considerou necessário enviar mensagem')
          logRecord.set('details', `Para a fase ${newStatus}, a IA retornou SKIP_MESSAGE.`)
          logRecord.set('payload', { customer_id: customerId })
          $app.saveNoValidate(logRecord)
        } catch (_) {}
      }
    }
  } catch (err) {
    $app.logger().error('Skip AI Chat failed in status change', 'error', String(err))
  }

  return e.next()
}, 'customers')
