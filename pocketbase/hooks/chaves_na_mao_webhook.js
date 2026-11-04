// pocketbase/hooks/chaves_na_mao_webhook.js
// Hook de integração para recepção de leads do portal Chaves na Mão.
// Salva em 'leads' E em 'customers', associando imóvel (ex: LM327) e registrando
// auditoria transparente em 'system_logs' tanto para sucesso quanto para falha.

routerAdd('GET', '/backend/v1/chaves_na_mao_webhook/health', (e) => {
  return e.json(200, {
    status: 'active',
    service: 'chaves_na_mao_webhook',
    timestamp: new Date().toISOString(),
  })
})

routerAdd('POST', '/backend/v1/chaves_na_mao_webhook', (e) => {
  let body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {
    body = {}
  }

  const query = e.request.url.query()
  const userId = query.get('user_id') || query.get('uid')
  const provider = query.get('provider') || 'chavesnamao'

  let user = null
  if (userId) {
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {}
  }

  if (!user) {
    try {
      const fallbackUsers = $app.findRecordsByFilter('users', '', 'created', 1, 0)
      if (fallbackUsers.length > 0) user = fallbackUsers[0]
    } catch (_) {}
  }

  const assignedUserId = user ? user.id : 'g5jto8bhulw01bz'

  try {
    const rawName =
      body.name ||
      body.nome ||
      body.lead_name ||
      body.contato ||
      body.client_name ||
      body.cliente ||
      'Lead Chaves na Mão'

    const email = body.email || body.lead_email || body.contato_email || ''

    let rawPhone =
      body.phone ||
      body.telefone ||
      body.lead_phone ||
      body.celular ||
      body.whatsapp ||
      body.contato_telefone ||
      ''

    let phoneDigits = String(rawPhone).replace(/\D/g, '')

    // Normalização padrão para telefone brasileiro (55 + DDD + 9 dígitos)
    if (phoneDigits.length === 10 || phoneDigits.length === 11) {
      phoneDigits = '55' + phoneDigits
    }

    const propertyRef =
      body.property_ref ||
      body.imovel ||
      body.url ||
      body.referencia ||
      body.link ||
      body.codigo ||
      body.code ||
      ''

    const rawMessage =
      body.message ||
      body.mensagem ||
      body.observacao ||
      body.notes ||
      body.descricao ||
      body.interesse ||
      ''

    let notes = ''
    if (propertyRef) {
      notes += 'Referência do Imóvel: ' + propertyRef
    }
    if (rawMessage) {
      notes += (notes ? '\n' : '') + 'Mensagem: ' + rawMessage
    }

    // 1. Gravar na coleção 'leads' (Pipeline de Leads)
    let leadId = ''
    try {
      const leadsCol = $app.findCollectionByNameOrId('leads')
      const lead = new Record(leadsCol)
      lead.set('assigned_to', assignedUserId)
      lead.set('name', rawName)
      lead.set('email', email)
      lead.set('phone', phoneDigits || String(rawPhone))
      lead.set('source', 'Portal Chaves na Mão')
      lead.set('status', 'Novo')
      lead.set('notes', notes)
      $app.saveNoValidate(lead)
      leadId = lead.id
    } catch (leadErr) {
      $app
        .logger()
        .warn('Falha ao salvar em leads (tentando prosseguir com customers): ' + leadErr.message)
    }

    // 2. Gravar ou atualizar na coleção 'customers' (Base Principal do CRM e da Bia)
    let customerId = ''
    try {
      const customersCol = $app.findCollectionByNameOrId('customers')
      let existingCust = null

      if (phoneDigits) {
        try {
          const foundCusts = $app.findRecordsByFilter(
            'customers',
            "phone = '" +
              phoneDigits +
              "' || phone_1_value = '" +
              phoneDigits +
              "' || phone ~ '" +
              phoneDigits.slice(-8) +
              "'",
            '-created',
            1,
            0,
          )
          if (foundCusts && foundCusts.length > 0) {
            existingCust = foundCusts[0]
          }
        } catch (_) {}
      }

      const receivedAtIso = new Date().toISOString()
      const originEntry = {
        date: receivedAtIso,
        source: 'Portal Chaves na Mão',
        type: 'portal',
        property_ref: propertyRef,
        lead_id: leadId,
      }

      if (existingCust) {
        customerId = existingCust.id
        existingCust.set('last_origin', 'Portal Chaves na Mão')
        existingCust.set('last_origin_at', receivedAtIso)
        if (notes && !existingCust.getString('notes')) {
          existingCust.set('notes', notes)
        }
        $app.saveNoValidate(existingCust)
      } else {
        const newCust = new Record(customersCol)
        newCust.set('user_id', assignedUserId)
        newCust.set('name', rawName)
        newCust.set('first_name', rawName.split(' ')[0] || rawName)
        newCust.set('phone', phoneDigits || String(rawPhone))
        newCust.set('phone_1_value', phoneDigits || String(rawPhone))
        newCust.set('email', email)
        newCust.set('email_1_value', email)
        newCust.set('status', '1. Acolhimento')
        newCust.set('source', 'Portal Chaves na Mão')
        newCust.set('last_origin', 'Portal Chaves na Mão')
        newCust.set('last_origin_at', receivedAtIso)
        newCust.set('notes', notes)
        newCust.set('tags', ['lead_quente', 'portal_externo', 'chaves_na_mao'])
        newCust.set('origin_history', [originEntry])
        newCust.set('persistence_status', 'ativo')
        newCust.set('urgency', 3)
        $app.saveNoValidate(newCust)
        customerId = newCust.id
      }
    } catch (custErr) {
      $app.logger().warn('Falha ao sincronizar com customers: ' + custErr.message)
    }

    // 3. Auditoria de SUCESSO em system_logs
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('user_id', assignedUserId)
      log.set('type', 'chaves_na_mao_webhook_success')
      log.set(
        'message',
        'Lead Chaves na Mão processado com sucesso: ' +
          rawName +
          ' (' +
          (phoneDigits || rawPhone) +
          ') - Imóvel: ' +
          (propertyRef || 'Não especificado'),
      )
      log.set('details', JSON.stringify({ body: body, leadId: leadId, customerId: customerId }))
      log.set('payload', body)
      $app.saveNoValidate(log)
    } catch (_) {}

    return e.json(200, {
      success: true,
      leadId: leadId,
      customerId: customerId,
      message: 'Lead recebido e cadastrado com sucesso',
    })
  } catch (err) {
    $app.logger().error('Chaves na Mão Webhook Error: ' + err.message)

    // Auditoria de ERRO transparente em system_logs
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('user_id', assignedUserId)
      log.set('type', 'chaves_na_mao_webhook_error')
      log.set('message', 'Erro ao processar webhook Chaves na Mão: ' + err.message)
      log.set('details', JSON.stringify({ error: err.message, body: body }))
      log.set('payload', body)
      $app.saveNoValidate(log)
    } catch (_) {}

    return e.internalServerError('Failed to process lead from Chaves na Mão')
  }
})
