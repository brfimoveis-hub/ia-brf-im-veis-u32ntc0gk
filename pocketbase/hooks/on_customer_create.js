onRecordAfterCreateSuccess((e) => {
  // GUARDA ANTI-FANTASMA (11/11): leads vindos do Direct do Instagram são atendidos
  // pelo webhook (instagram_webhook_post) + ai_auto_reply + instagram_auto_reply.
  // Este hook gerava uma "resposta da Bia" SEM canal, apenas salva no CRM (nunca
  // enviada ao Direct) — mascarava o bug de entrega. Não disparar para esses leads.
  const ghostSource = e.record.getString('source') || ''
  if (/instagram/i.test(ghostSource)) {
    return e.next()
  }

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

              // Um lead criado pelo CRM ainda NÃO escreveu no WhatsApp, ou seja, está
              // FORA da janela de 24h: texto livre seria rejeitado (erro 131047).
              // Sempre que não houver mensagem do cliente, abre-se a conversa com
              // TEMPLATE aprovado. Se não houver template, registra e não insiste.
              let hasInbound = false
              try {
                const inboundCheck = $app.findRecordsByFilter(
                  'conversations',
                  "customer_id = '" + customerId + "' && (sender = 'customer' || sender = 'lead')",
                  '-created',
                  1,
                  0,
                )
                hasInbound = inboundCheck && inboundCheck.length > 0
              } catch (_) {}

              // APPSECRET_PROOF (v0.0.1425): "Require App Secret" ativo no app Meta
              // exige a assinatura em TODO POST de envio para a Cloud API.
              // Credenciais: meta_app_secret do usuário -> meta_instagram_app_secret
              // -> env META_APP_SECRET (mesmo rito de meta_messenger_save_and_subscribe).
              let waSecret = ''
              try {
                waSecret = (userRecord.getString('meta_app_secret') || '').trim()
                if (!waSecret)
                  waSecret = (userRecord.getString('meta_instagram_app_secret') || '').trim()
              } catch (_) {}
              if (!waSecret) {
                try {
                  waSecret = String($os.getenv('META_APP_SECRET') || '').trim()
                } catch (_) {}
              }
              const waProof = (accessToken) => {
                if (!waSecret || !accessToken) return ''
                try {
                  return '?appsecret_proof=' + $security.hs256(String(accessToken), waSecret)
                } catch (_) {
                  return ''
                }
              }

              let createPayload = null
              if (hasInbound) {
                createPayload = {
                  messaging_product: 'whatsapp',
                  to: cleanPhone,
                  type: 'text',
                  text: { body: responseText },
                }
              } else {
                let tplName = ''
                let tplLang = 'pt_BR'
                try {
                  tplName = (userRecord.getString('meta_whatsapp_lead_template') || '').trim()
                  tplLang =
                    (userRecord.getString('meta_whatsapp_lead_template_lang') || '').trim() ||
                    'pt_BR'
                } catch (_) {}
                if (!tplName) {
                  try {
                    const tpls = $app.findRecordsByFilter(
                      'whatsapp_templates',
                      "status = 'APPROVED'",
                      '-created',
                      1,
                      0,
                    )
                    if (tpls && tpls.length > 0) {
                      tplName = (tpls[0].getString('name') || '').trim()
                      tplLang = (tpls[0].getString('language') || 'pt_BR').trim() || 'pt_BR'
                    }
                  } catch (_) {}
                }
                if (tplName) {
                  createPayload = {
                    messaging_product: 'whatsapp',
                    to: cleanPhone,
                    type: 'template',
                    template: {
                      name: tplName,
                      language: { code: tplLang },
                      components: [
                        {
                          type: 'body',
                          parameters: [{ type: 'text', text: (displayName || 'tudo bem').trim() }],
                        },
                      ],
                    },
                  }
                } else {
                  try {
                    const logsColNoTpl2 = $app.findCollectionByNameOrId('system_logs')
                    const noTplLog2 = new Record(logsColNoTpl2)
                    noTplLog2.set('user_id', userId)
                    noTplLog2.set('type', 'whatsapp_outside_window_no_template')
                    noTplLog2.set(
                      'message',
                      'Novo lead fora da janela de 24h e sem template aprovado — mensagem não enviada',
                    )
                    noTplLog2.set('payload', { customer_id: customerId, phone: cleanPhone })
                    $app.saveNoValidate(noTplLog2)
                  } catch (_) {}
                }
              }

              if (createPayload) {
                const createRes = $http.send({
                  url: `https://graph.facebook.com/v21.0/${metaPhoneId}/messages${waProof(metaToken)}`,
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${metaToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(createPayload),
                  timeout: 15,
                })
                if (createRes && createRes.statusCode >= 400) {
                  try {
                    const errJson2 = createRes.json || {}
                    const errObj2 = errJson2.error || {}
                    const logsColFail2 = $app.findCollectionByNameOrId('system_logs')
                    const failLog2 = new Record(logsColFail2)
                    failLog2.set('user_id', userId)
                    failLog2.set('type', 'whatsapp_send_failed')
                    failLog2.set(
                      'message',
                      'Falha ao enviar primeira mensagem (status ' +
                        createRes.statusCode +
                        ', code ' +
                        String(errObj2.code || 'none') +
                        ')',
                    )
                    failLog2.set('details', String(errObj2.message || ''))
                    failLog2.set('payload', {
                      customer_id: customerId,
                      phone: cleanPhone,
                      type: createPayload.type,
                    })
                    $app.saveNoValidate(failLog2)
                  } catch (_) {}
                }
              }
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
