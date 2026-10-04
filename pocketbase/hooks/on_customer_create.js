onRecordAfterCreateSuccess((e) => {
  const customerId = e.record.id
  const userId = e.record.getString('user_id')
  const status = e.record.getString('status') || 'Novo'
  const customerName = (e.record.getString('name') || '').trim()
  const customerFirstName = (e.record.getString('first_name') || '').trim()
  const displayName =
    customerFirstName ||
    (customerName && !customerName.includes('+') && !/^\d+$/.test(customerName)
      ? customerName.split(' ')[0]
      : '')

  let userRecord = null
  try {
    if (userId) userRecord = $app.findRecordById('users', userId)
  } catch (_) {}

  const aiName = userRecord ? userRecord.getString('ai_name') || 'Bia' : 'Bia'
  const baseInstructions = userRecord ? userRecord.getString('ai_instructions') : ''

  // A coleção 'cadences' legada não é mais consultada para atendimento.
  // A Bia se conduz exclusivamente pela Constituição da Bia v1.0 e pelos Pilares (baseInstructions).
  let aiInstructions = baseInstructions

  if (!aiInstructions.trim()) {
    $app.logger().info('AI Trigger skipped: No instructions on create', 'customerId', customerId)
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
    logRecord.set('payload', { customer_id: customerId, status: status })
    $app.saveNoValidate(logRecord)
  } catch (_) {}

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
  const clientIdentification = displayName
    ? `Nome do lead: ${displayName} (nome completo: ${customerName})`
    : `O cliente ainda não informou o nome (número/sem nome). Trate-o cordialmente de forma genérica sem placeholders como [Nome].`

  const systemPrompt = `Você é ${aiName}.
Sua identidade e instruções principais:
${aiInstructions}

DADOS DO CLIENTE / LEAD:
${clientIdentification}

EVENTO ATUAL:
Um novo lead acabou de entrar no sistema na fase "${status}".

SUA TAREFA:
Baseado nas instruções e no procedimento da cadência para a fase atual, escreva a primeira mensagem de abordagem/engajamento (outbound) para este cliente.
${displayName ? `Use o primeiro nome do cliente ("${displayName}") na saudação.` : 'NÃO invente um nome e NUNCA deixe marcadores como "[Nome]" ou "{nome}". Se não souber o nome, diga apenas "Olá!" ou "Olá, tudo bem?".'}
Seja direta, empática e humana.
NUNCA mencione que você viu o lead entrar no sistema. A mensagem deve parecer natural.
NUNCA comece com confirmações tipo "Entendido" ou "Vou enviar". Apenas escreva a mensagem para o cliente.
Se as suas instruções não prevêem o envio de nenhuma mensagem inicial ou se não for o momento adequado, responda EXATAMENTE com "SKIP_MESSAGE".`

  messages.push({ role: 'system', content: systemPrompt })
  const userPrompt = displayName
    ? `(Inicie a conversa com o lead. O primeiro nome dele é ${displayName})`
    : '(Inicie a conversa com o lead)'
  messages.push({ role: 'user', content: userPrompt })

  try {
    const chatRes = $ai.chat({ model: 'fast', messages: messages })

    if (chatRes.choices && chatRes.choices[0] && chatRes.choices[0].message) {
      let responseText = chatRes.choices[0].message.content.trim()
      responseText = responseText.replace(/\[STATUS:\s*.*?\]/gi, '').trim()

      // Safety guard against literal [Nome] placeholder leakage
      if (displayName) {
        responseText = responseText.replace(/\[Nome\]/gi, displayName)
        responseText = responseText.replace(/\{Nome\}/gi, displayName)
      } else {
        responseText = responseText.replace(/,\s*\[Nome\]/gi, '')
        responseText = responseText.replace(/\[Nome\]/gi, '')
        responseText = responseText.replace(/,\s*\{Nome\}/gi, '')
        responseText = responseText.replace(/\{Nome\}/gi, '')
      }

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
              let cleanPhone = phone.replace(/\D/g, '')
              if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                cleanPhone = '55' + cleanPhone
              }
              $http.send({
                url: `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`,
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
      }
    }
  } catch (err) {
    $app.logger().error('Skip AI Chat failed on customer create', 'error', String(err))
  }

  return e.next()
}, 'customers')
