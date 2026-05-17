onRecordAfterCreateSuccess((e) => {
  const lead = e.record
  const assignedTo = lead.getString('assigned_to')
  const phone = lead.getString('phone')
  const email = lead.getString('email')
  const name = lead.getString('name') || 'Novo Lead'
  const source = lead.getString('source') || 'Sistema'
  const status = lead.getString('status') || 'Novo'
  const notes = lead.getString('notes')

  if (!assignedTo) {
    $app.logger().warn('Lead created without assigned_to', 'lead_id', lead.id)
    return e.next()
  }

  let existingCustomer = null
  try {
    if (phone) {
      const records = $app.findRecordsByFilter(
        'customers',
        `user_id = '${assignedTo}' && (phone = '${phone.replace(/'/g, "''")}' || phone_1_value = '${phone.replace(/'/g, "''")}')`,
        '-created',
        1,
        0,
      )
      if (records.length > 0) existingCustomer = records[0]
    }

    if (!existingCustomer && email) {
      const records = $app.findRecordsByFilter(
        'customers',
        `user_id = '${assignedTo}' && (email = '${email.replace(/'/g, "''")}' || email_1_value = '${email.replace(/'/g, "''")}')`,
        '-created',
        1,
        0,
      )
      if (records.length > 0) existingCustomer = records[0]
    }
  } catch (err) {
    $app.logger().error('Error checking for existing customer', err)
  }

  const customersCol = $app.findCollectionByNameOrId('customers')

  if (existingCustomer) {
    existingCustomer.set('status', status)
    if (source && !existingCustomer.getString('source')) existingCustomer.set('source', source)
    if (notes) {
      const oldNotes = existingCustomer.getString('notes')
      existingCustomer.set('notes', oldNotes ? oldNotes + '\n\n' + notes : notes)
    }
    $app.save(existingCustomer)
  } else {
    const newCustomer = new Record(customersCol)
    newCustomer.set('user_id', assignedTo)
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

    $app.save(newCustomer)
  }

  return e.next()
}, 'leads')
