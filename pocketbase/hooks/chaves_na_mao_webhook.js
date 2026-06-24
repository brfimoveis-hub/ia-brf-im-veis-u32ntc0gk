routerAdd('POST', '/backend/v1/webhooks/chaves-na-mao', (e) => {
  const body = e.requestInfo().body || {}
  const uid = e.request.url.query().get('uid')

  let user = null
  if (uid) {
    try {
      user = $app.findRecordById('users', uid)
    } catch (_) {}
  }

  if (!user) {
    try {
      const fallbackUsers = $app.findRecordsByFilter('users', '', 'created', 1, 0)
      if (fallbackUsers.length > 0) user = fallbackUsers[0]
    } catch (_) {}
  }

  if (!user) {
    return e.badRequestError('No user found to assign the lead in the Pipeline')
  }

  try {
    const name = body.name || body.nome || body.lead_name || body.contato || 'Lead Chaves na Mão'
    const email = body.email || body.lead_email || ''
    let phone = body.phone || body.telefone || body.lead_phone || body.celular || ''

    // Normalize phone to digits only
    phone = phone.replace(/\D/g, '')

    const propertyRef =
      body.property_ref || body.imovel || body.url || body.referencia || body.link || ''

    let notes = ''
    if (propertyRef) {
      notes = `Referência do Imóvel: ${propertyRef}`
    }
    if (body.message || body.mensagem || body.observacao) {
      const msg = body.message || body.mensagem || body.observacao
      notes += notes ? `\nMensagem: ${msg}` : `Mensagem: ${msg}`
    }

    const leadsCol = $app.findCollectionByNameOrId('leads')
    const lead = new Record(leadsCol)
    lead.set('assigned_to', user.id)
    lead.set('name', name)
    lead.set('email', email)
    lead.set('phone', phone)
    lead.set('source', 'Chaves na Mão')
    lead.set('status', 'Novo')
    lead.set('notes', notes)

    $app.save(lead)

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('type', 'webhook_success')
      log.set('message', `Lead do Chaves na Mão recebido com sucesso e adicionado ao Pipeline.`)
      log.set('details', body)
      $app.save(log)
    } catch (_) {}

    return e.json(200, {
      success: true,
      leadId: lead.id,
      message: 'Lead adicionado ao Pipeline com sucesso',
    })
  } catch (err) {
    $app.logger().error('Chaves na Mão Webhook Error', 'error', err.message)

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('type', 'webhook_error')
      log.set('message', 'Erro ao salvar lead do Chaves na Mão no Pipeline')
      log.set('details', body)
      $app.save(log)
    } catch (_) {}

    return e.internalServerError('Failed to process lead for Pipeline')
  }
})
