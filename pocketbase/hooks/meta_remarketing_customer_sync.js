onRecordAfterUpdateSuccess((e) => {
  const newStatus = e.record.getString('status')
  const oldStatus = e.record.original().getString('status')

  if (!newStatus || newStatus === oldStatus) return e.next()

  const userId = e.record.getString('user_id')
  if (!userId) return e.next()

  let user
  try {
    user = $app.findRecordById('users', userId)
  } catch (_) {
    return e.next()
  }

  let projectData = {}
  try {
    const raw = user.get('project_data')
    if (raw && typeof raw === 'object') projectData = raw
    else if (typeof raw === 'string') projectData = JSON.parse(raw)
  } catch (_) {}

  const prefs = projectData.remarketing || {}
  if (!prefs.autoSync) return e.next()

  const enabledStatuses = prefs.enabledStatuses || []
  if (enabledStatuses.length === 0 || enabledStatuses.indexOf(newStatus) === -1) {
    return e.next()
  }

  const datasetId = user.getString('meta_dataset_id') || user.getString('meta_pixel_id')
  const capiToken = user.getString('meta_capi_token')

  const logsCol = $app.findCollectionByNameOrId('system_logs')

  if (!datasetId || !capiToken) {
    try {
      const logRecord = new Record(logsCol)
      logRecord.set('type', 'remarketing_sync_skipped')
      logRecord.set('message', 'Remarketing sync skipped: CAPI credentials not configured')
      logRecord.set('details', { customer_id: e.record.id, status: newStatus })
      $app.saveNoValidate(logRecord)
    } catch (_) {}
    return e.next()
  }

  const userData = {
    external_id: [$security.sha256(e.record.id)],
    client_ip_address: '192.168.1.1',
    client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SkipCloud/1.0',
  }

  const email = e.record.getString('email') || e.record.getString('email_1_value')
  const phone = e.record.getString('phone') || e.record.getString('phone_1_value')

  if (email) userData.em = [$security.sha256(email.trim().toLowerCase())]
  if (phone) {
    let cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length === 10 || cleanPhone.length === 11) cleanPhone = '55' + cleanPhone
    userData.ph = [$security.sha256(cleanPhone)]
  }

  const audienceMappings = prefs.audienceMappings || {}
  const audienceName = audienceMappings[newStatus] || ''

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system',
        event_id: e.record.id + '_rmkt_' + newStatus,
        user_data: userData,
        custom_data: {
          remarketing_status: newStatus,
          remarketing_audience: audienceName,
          customer_id: e.record.id,
        },
      },
    ],
  }

  const url = 'https://graph.facebook.com/v21.0/' + datasetId + '/events'

  try {
    const res = $http.send({
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + capiToken,
      },
      body: JSON.stringify(payload),
      timeout: 15,
    })

    const logRecord = new Record(logsCol)
    logRecord.set('type', 'remarketing_sync')

    if (res.statusCode >= 200 && res.statusCode < 300) {
      logRecord.set(
        'message',
        'Remarketing sync success: ' + newStatus + ' for ' + e.record.getString('name'),
      )
      logRecord.set('details', {
        customer_id: e.record.id,
        status: newStatus,
        audience: audienceName,
        http_status: res.statusCode,
      })
    } else {
      let errorMsg = 'Meta API Error ' + res.statusCode
      try {
        const errBody = res.json
        if (errBody && errBody.error && errBody.error.message) errorMsg = errBody.error.message
      } catch (_) {}
      logRecord.set('message', 'Remarketing sync failed: ' + errorMsg)
      logRecord.set('details', {
        customer_id: e.record.id,
        status: newStatus,
        audience: audienceName,
        http_status: res.statusCode,
        error: errorMsg,
      })
      $app
        .logger()
        .error('Remarketing Sync Error', 'status', String(res.statusCode), 'customer', e.record.id)
    }

    $app.saveNoValidate(logRecord)
  } catch (err) {
    try {
      const logRecord = new Record(logsCol)
      logRecord.set('type', 'remarketing_sync_error')
      logRecord.set('message', 'Remarketing sync connection error: ' + String(err))
      logRecord.set('details', { customer_id: e.record.id, status: newStatus })
      $app.saveNoValidate(logRecord)
    } catch (_) {}
    $app.logger().error('Remarketing Sync Failed', 'error', String(err))
  }

  e.next()
}, 'customers')
