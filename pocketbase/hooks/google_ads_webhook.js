routerAdd('POST', '/backend/v1/google-ads-webhook', (e) => {
  const uid = e.request.url.query().get('uid')
  if (!uid) {
    return e.badRequestError('Missing uid parameter')
  }

  let user
  try {
    user = $app.findRecordById('users', uid)
  } catch (_) {
    return e.badRequestError('Invalid uid')
  }

  const body = e.requestInfo().body || {}
  const googleKey = body.google_key
  const storedKey = user.getString('google_ads_webhook_key')

  if (!storedKey || !googleKey || googleKey !== storedKey) {
    $app
      .logger()
      .error('Google Ads Webhook Error', 'error', 'Invalid or missing google_key', 'uid', uid)
    return e.unauthorizedError('Invalid google_key')
  }

  // Parse lead
  const userColumnData = body.user_column_data || []
  let name = ''
  let email = ''
  let phone = ''

  for (const col of userColumnData) {
    const colId = (col.column_id || '').toUpperCase()
    const colName = (col.column_name || '').toLowerCase()

    if (
      colId === 'FULL_NAME' ||
      colId === 'FIRST_NAME' ||
      colName.includes('name') ||
      colName.includes('nome')
    ) {
      name = col.string_value
    } else if (colId === 'EMAIL' || colName.includes('email')) {
      email = col.string_value
    } else if (
      colId === 'PHONE_NUMBER' ||
      colName.includes('phone') ||
      colName.includes('telefone')
    ) {
      phone = col.string_value
    }
  }

  if (!name && !email && !phone) {
    return e.badRequestError('No valid lead data found')
  }

  try {
    const customersCol = $app.findCollectionByNameOrId('customers')
    const customer = new Record(customersCol)
    customer.set('name', name || 'Lead Google Ads')
    customer.set('email', email)
    customer.set('phone', phone)
    customer.set('source', 'Google Ads')
    customer.set('status', 'Novo')

    $app.save(customer)

    const logsCol = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(logsCol)
    log.set('type', 'google_ads_webhook_success')
    log.set('message', `Lead recebido do Google Ads: ${name || email || phone || 'Desconhecido'}`)
    log.set('payload', body)
    $app.save(log)

    return e.json(200, { success: true, customerId: customer.id })
  } catch (err) {
    $app.logger().error('Google Ads Webhook Save Error', 'error', err.message, 'uid', uid)

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('type', 'google_ads_webhook_error')
      log.set('message', 'Erro ao salvar lead do Google Ads')
      log.set('details', { error: err.message })
      log.set('payload', body)
      $app.save(log)
    } catch (_) {}

    return e.internalServerError('Failed to process lead')
  }
})
