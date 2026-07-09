onRecordAfterCreateSuccess((e) => {
  const userId = e.record.getString('user_id')

  let pixelId = $secrets.get('META_PIXEL_ID')
  let capiToken = $secrets.get('META_ACCESS_TOKEN')
  let testCode = $secrets.get('META_TEST_EVENT_CODE')

  let userRecord = null
  if ((!pixelId || !capiToken) && userId) {
    try {
      userRecord = $app.findRecordById('users', userId)
      pixelId = pixelId || userRecord.getString('meta_pixel_id')
      capiToken = capiToken || userRecord.getString('meta_capi_token')
    } catch (err) {}
  }

  if (!pixelId || !capiToken) {
    return e.next()
  }

  const email = e.record.getString('email') || e.record.getString('email_1_value')
  const phone = e.record.getString('phone') || e.record.getString('phone_1_value')
  const fn =
    e.record.getString('first_name') ||
    (e.record.getString('name') ? e.record.getString('name').split(' ')[0] : '')
  const ln = e.record.getString('name')
    ? e.record.getString('name').split(' ').slice(1).join(' ')
    : ''

  const userData = {}

  if (email) {
    userData.em = [$security.sha256(email.trim().toLowerCase())]
  }
  if (phone) {
    let cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone
    }
    userData.ph = [$security.sha256(cleanPhone)]
  }
  if (fn) {
    userData.fn = [$security.sha256(fn.trim().toLowerCase())]
  }
  if (ln) {
    userData.ln = [$security.sha256(ln.trim().toLowerCase())]
  }

  userData.client_ip_address = '192.168.1.1'
  userData.client_user_agent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SkipCloud/1.0'

  if (!userData.em && !userData.ph) {
    $app
      .logger()
      .warn('CAPI Lead Event skipped: no email or phone for customer', 'customerId', e.record.id)
    return e.next()
  }

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: 'https://brfiacrminteligente.goskip.app/dashboard',
        event_id: $security.randomString(32),
        user_data: userData,
        custom_data: {
          currency: 'BRL',
          value: 0.0,
        },
      },
    ],
  }

  if (testCode) payload.test_event_code = testCode

  const url = 'https://graph.facebook.com/v21.0/' + pixelId + '/events'
  try {
    const res = $http.send({
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + capiToken,
      },
      body: JSON.stringify(payload),
      timeout: 10,
    })

    if (res.statusCode >= 400) {
      const errorBody = res.json || {}
      const metaError = errorBody.error || {}
      const metaErrorCode = metaError.code
      const metaErrorSubcode = metaError.error_subcode
      let errorMsg = metaError.message || 'CAPI Lead Event failed (Status ' + res.statusCode + ')'

      if (metaErrorCode === 100 && metaErrorSubcode === 33) {
        errorMsg =
          "Object ID '" +
          pixelId +
          "' não encontrado. O Dataset/Pixel ID fornecido não existe ou o token não tem permissão para acessá-lo."
      } else if (
        errorMsg.indexOf('Unsupported post request') !== -1 ||
        errorMsg.indexOf('does not exist') !== -1 ||
        errorMsg.indexOf('Object with ID') !== -1
      ) {
        errorMsg =
          "ID inválido: O Dataset/Pixel ID '" +
          pixelId +
          "' não foi encontrado. Verifique se não é um App ID."
      }

      $app
        .logger()
        .error(
          'CAPI Create Error',
          'status',
          res.statusCode,
          'code',
          metaErrorCode,
          'subcode',
          metaErrorSubcode,
          'message',
          errorMsg,
        )

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('type', 'capi_sync_error')
        logRecord.set('message', 'Meta CAPI Lead Event falhou: ' + errorMsg)
        logRecord.set('details', {
          status_code: res.statusCode,
          error_code: metaErrorCode,
          error_subcode: metaErrorSubcode,
          pixel_id: pixelId,
          customer_id: e.record.id,
        })
        logRecord.set('payload', payload)
        $app.saveNoValidate(logRecord)
      } catch (_) {}

      if (userRecord) {
        userRecord.set('meta_capi_status', 'error')
        userRecord.set('meta_capi_error', errorMsg)
        try {
          $app.saveNoValidate(userRecord)
        } catch (_) {}
      }
    } else {
      if (userRecord && userRecord.getString('meta_capi_status') === 'error') {
        userRecord.set('meta_capi_status', 'connected')
        userRecord.set('meta_capi_error', '')
        try {
          $app.saveNoValidate(userRecord)
        } catch (_) {}
      }
    }
  } catch (err) {
    $app.logger().error('CAPI Request Failed', 'error', err.message)

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('type', 'capi_sync_error')
      logRecord.set('message', 'Meta CAPI Lead Event falhou: ' + err.message)
      logRecord.set('details', {
        error: err.message,
        pixel_id: pixelId,
        customer_id: e.record.id,
      })
      logRecord.set('payload', payload)
      $app.saveNoValidate(logRecord)
    } catch (_) {}

    if (userRecord) {
      userRecord.set('meta_capi_status', 'error')
      userRecord.set('meta_capi_error', 'Falha de conexão com a API do Meta: ' + err.message)
      try {
        $app.saveNoValidate(userRecord)
      } catch (_) {}
    }
  }

  e.next()
}, 'customers')
