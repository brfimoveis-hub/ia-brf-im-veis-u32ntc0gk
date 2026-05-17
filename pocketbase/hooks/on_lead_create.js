onRecordAfterCreateSuccess((e) => {
  const lead = e.record
  const assignedTo = lead.getString('assigned_to')
  const phone = lead.getString('phone')
  const email = lead.getString('email')
  const name = lead.getString('name') || 'Novo Lead'
  const source = lead.getString('source') || 'Sistema'
  const status = lead.getString('status') || 'Novo'
  const notes = lead.getString('notes')

  let existingCustomer = null
  try {
    if (phone) {
      const filterStr = assignedTo
        ? `user_id = '${assignedTo}' && (phone = '${phone.replace(/'/g, "''")}' || phone_1_value = '${phone.replace(/'/g, "''")}')`
        : `(phone = '${phone.replace(/'/g, "''")}' || phone_1_value = '${phone.replace(/'/g, "''")}')`

      const records = $app.findRecordsByFilter('customers', filterStr, '-created', 1, 0)
      if (records.length > 0) existingCustomer = records[0]
    }

    if (!existingCustomer && email) {
      const filterStr = assignedTo
        ? `user_id = '${assignedTo}' && (email = '${email.replace(/'/g, "''")}' || email_1_value = '${email.replace(/'/g, "''")}')`
        : `(email = '${email.replace(/'/g, "''")}' || email_1_value = '${email.replace(/'/g, "''")}')`

      const records = $app.findRecordsByFilter('customers', filterStr, '-created', 1, 0)
      if (records.length > 0) existingCustomer = records[0]
    }
  } catch (err) {
    $app.logger().error('Error checking for existing customer', err)
  }

  const customersCol = $app.findCollectionByNameOrId('customers')

  if (existingCustomer) {
    existingCustomer.set('status', status)
    if (assignedTo && !existingCustomer.getString('user_id'))
      existingCustomer.set('user_id', assignedTo)
    if (source && !existingCustomer.getString('source')) existingCustomer.set('source', source)
    if (notes) {
      const oldNotes = existingCustomer.getString('notes')
      existingCustomer.set('notes', oldNotes ? oldNotes + '\n\n' + notes : notes)
    }
    $app.save(existingCustomer)
  } else {
    const newCustomer = new Record(customersCol)
    if (assignedTo) newCustomer.set('user_id', assignedTo)
    newCustomer.set('name', name)
    newCustomer.set('first_name', name.split(' ')[0] || '')
    if (phone) {
      newCustomer.set('phone', phone)
      newCustomer.set('phone_1_value', phone)
    }
    if (email) {
      newCustomer.set('email', email)
      newCustomer.set('email_1_value', email)
    }
    newCustomer.set('status', status === 'lead' ? 'lead' : 'Novo')
    newCustomer.set('source', source)
    newCustomer.set('notes', notes)

    // Verify cadence existence before saving to prevent orphaned customers
    try {
      let cadences = $app.findRecordsByFilter(
        'cadences',
        `user_id = '${assignedTo || e.auth?.id}' && is_active = true && title = '${newCustomer.getString('status').replace(/'/g, "''")}'`,
        '-created',
        1,
        0,
      )
      if (
        cadences.length === 0 &&
        (newCustomer.getString('status') === 'Novo' || newCustomer.getString('status') === 'lead')
      ) {
        cadences = $app.findRecordsByFilter(
          'cadences',
          `user_id = '${assignedTo || e.auth?.id}' && is_active = true`,
          'order',
          1,
          0,
        )
      }

      if (cadences.length === 0) {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('user_id', assignedTo || e.auth?.id)
        logRecord.set('type', 'api_failure')
        logRecord.set('message', 'Erro ao transferir lead: Cadência ausente')
        logRecord.set(
          'details',
          'O lead foi criado, mas não pôde ser movido para clientes porque não há cadência ativa correspondente.',
        )
        logRecord.set('payload', { lead_id: lead.id })
        $app.saveNoValidate(logRecord)

        return e.next()
      }
    } catch (_) {}

    $app.save(newCustomer)
  }

  return e.next()
}, 'leads')
