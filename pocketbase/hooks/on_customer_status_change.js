onRecordAfterUpdateSuccess((e) => {
  const oldStatus = e.record.original().getString('status')
  const newStatus = e.record.getString('status')

  if (!oldStatus || oldStatus === newStatus) {
    return e.next()
  }

  const customerId = e.record.id
  const userId = e.record.getString('user_id')
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

  // Carregar dados estruturados, notas e preferências já coletadas do customer
  const customerNotes = e.record.getString('notes') || ''
  const customerPriceRange = e.record.getString('price_range') || ''
  const customerNeighborhood = e.record.getString('neighborhood') || ''
  const customerProfile = e.record.getString('lead_profile') || ''

  // Mapear imóveis específicos citados nas notas ou no histórico do cliente
  let relevantPropertyInfo = ''
  try {
    let combinedSearch = `${customerNotes} ${customerNeighborhood} ${customerPriceRange}`
    if (historyRecords && historyRecords.length > 0) {
      combinedSearch += ' ' + historyRecords.map((m) => m.getString('content') || '').join(' ')
    }

    const propCodeMatch = combinedSearch.match(
      /(?:^|\s|\b)(cs[-\s]?284|cs284|ap[-\s]?\d+|lm[-\s]?\d+|cs[-\s]?\d+|\b\d{3}\b)/i,
    )
    let propRecs = []
    if (propCodeMatch) {
      const codeClean = propCodeMatch[1].toUpperCase().replace(/\s+/g, '')
      const numOnly = codeClean.replace(/\D/g, '')
      propRecs = $app.findRecordsByFilter(
        'properties',
        `is_active = true && (code ~ '${codeClean}' || url ~ '/${numOnly}/' || code ~ '${numOnly}')`,
        '-created',
        1,
        0,
      )
    }

    if (propRecs.length === 0 && customerNeighborhood) {
      propRecs = $app.findRecordsByFilter(
        'properties',
        `is_active = true && (neighborhood ~ '${customerNeighborhood.replace(/'/g, "''")}' || title ~ '${customerNeighborhood.replace(/'/g, "''")}')`,
        '-created',
        1,
        0,
      )
    }

    if (propRecs.length > 0) {
      const pr = propRecs[0]
      const pTitle = pr.getString('title') || ''
      const pPrice =
        pr.getString('price_formatted') ||
        (pr.getInt('price') ? `R$ ${pr.getInt('price').toLocaleString('pt-BR')}` : '')
      const pNeigh = pr.getString('neighborhood') || ''
      const pCity = pr.getString('city') || ''
      const pUrl = pr.getString('url') || ''
      const pSuites = pr.getInt('suites')
      const pBeds = pr.getInt('bedrooms')
      const pDesc = (pr.getString('description') || '').split('.')[0]

      relevantPropertyInfo = `\nIMÓVEL DE INTERESSE MAPEADO NO CATÁLOGO:
- Título: ${pTitle}
- Valor: ${pPrice}
- Localização: ${[pNeigh, pCity].filter(Boolean).join(', ')}
- Tipologia: ${pSuites ? `${pSuites} suíte(s)` : `${pBeds} quartos`}
- Destaques: ${pDesc}
- Link Oficial: ${pUrl}`
    }
  } catch (errProp) {
    $app.logger().error('Error fetching relevant property for status change', errProp)
  }

  const messages = []
  const clientIdentification = displayName
    ? `Nome do lead: ${displayName} (nome completo: ${customerName})`
    : `O cliente ainda não informou o nome (número/sem nome). Trate-o cordialmente de forma genérica sem placeholders como [Nome].`

  const customerSummary = `DADOS E PREFERÊNCIAS JÁ CONHECIDAS DO CLIENTE:
- ${clientIdentification}
- Notas salvas: ${customerNotes || 'Nenhuma nota registrada'}
- Faixa de valor: ${customerPriceRange || 'Não definida'}
- Região/Bairro de interesse: ${customerNeighborhood || 'Não definido'}
- Perfil: ${customerProfile || 'Geral'}
${relevantPropertyInfo}`

  const systemPrompt = `Você é ${aiName}, da BRF Imóveis.
Sua identidade e instruções principais:
${aiInstructions}

${customerSummary}

EVENTO ATUAL:
O cliente acabou de ser movido pelo agente para a fase de funil: "${newStatus}". (Fase anterior: "${oldStatus}").

DIRETRIZES MANDATÓRIAS DE RETOMADA E CONTINUIDADE:
1. NUNCA recomece questionários ou qualificação já respondida! Se o cliente já informou nome, tipologia, preferência (ex: casa com 3 suítes nos Ingleses) ou forma de pagamento (ex: à vista), é ESTRITAMENTE PROIBIDO perguntar isso novamente.
2. RETOMADA DO IMÓVEL DE INTERESSE: Retome o imóvel de interesse do cliente, destacando diferenciais reais, valor, link oficial e convite consultivo para agendar visita presencial ou conferir as fotos.
3. Não use saudações redundantes ("Bom dia/Boa tarde/Boa noite") se o diálogo já estava em andamento. Seja direta, acolhedora e consultiva.
4. NUNCA mencione que você viu uma mudança de status/fase no sistema. A mensagem deve parecer 100% natural.
5. NUNCA comece com confirmações tipo "Entendido" ou "Vou enviar". Apenas escreva a mensagem final para o cliente no WhatsApp.
6. Se as suas instruções não prevêem o envio de nenhuma mensagem para esta fase ou se não for o momento adequado, responda EXATAMENTE com "SKIP_MESSAGE".`

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
