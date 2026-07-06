onRecordAfterUpdateSuccess((e) => {
  const newStatus = e.record.getString('status')
  const oldStatus = e.record.original().getString('status')

  if (newStatus && newStatus !== oldStatus) {
    const userId = e.record.getString('user_id')

    let testCode = $secrets.get('META_TEST_EVENT_CODE')

    let user
    let datasetId = ''
    let capiToken = ''

    if (userId) {
      try {
        user = $app.findRecordById('users', userId)
        datasetId = user.getString('meta_dataset_id') || user.getString('meta_pixel_id')
        capiToken = user.getString('meta_capi_token')
      } catch (err) {}
    }

    if (!datasetId || !capiToken) {
      try {
        const adminUsers = $app.findRecordsByFilter(
          'users',
          "meta_capi_token != ''",
          '-created',
          1,
          0,
        )
        if (adminUsers.length > 0) {
          user = user || adminUsers[0]
          datasetId =
            datasetId ||
            adminUsers[0].getString('meta_dataset_id') ||
            adminUsers[0].getString('meta_pixel_id')
          capiToken = capiToken || adminUsers[0].getString('meta_capi_token')
        }
      } catch (err) {}
    }

    if (!datasetId || !capiToken) {
      $app.logger().warn('CAPI Event Match Warning: Missing Dataset ID or Token. Event blocked.')
      return e.next()
    }

    let email = e.record.getString('email') || e.record.getString('email_1_value')
    let phone = e.record.getString('phone') || e.record.getString('phone_1_value')
    let fn =
      e.record.getString('first_name') ||
      (e.record.getString('name') ? e.record.getString('name').split(' ')[0] : '')
    let ln = e.record.getString('name')
      ? e.record.getString('name').split(' ').slice(1).join(' ')
      : ''

    if (!email && !phone) {
      $app
        .logger()
        .warn(
          'CAPI Event Match Warning: Missing email and phone for Meta CAPI payload. Attempting to send with available parameters.',
        )
    }

    const userData = {
      external_id: [$security.sha256(e.record.id)],
    }

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
      fn = fn.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      userData.fn = [$security.sha256(fn.trim().toLowerCase())]
    }
    if (ln) {
      ln = ln.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      userData.ln = [$security.sha256(ln.trim().toLowerCase())]
    }

    const source = e.record.getString('source') || ''
    const notes = e.record.getString('notes') || ''
    const combinedData = source + ' ' + notes
    if (combinedData.includes('_fbp=')) {
      const match = combinedData.match(/_fbp=([^;\s&]+)/)
      if (match) userData.fbp = match[1]
    }
    if (combinedData.includes('_fbc=')) {
      const match = combinedData.match(/_fbc=([^;\s&]+)/)
      if (match) userData.fbc = match[1]
    }

    const ipv4Regex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/
    const ipMatch = combinedData.match(ipv4Regex)
    if (ipMatch) {
      userData.client_ip_address = ipMatch[0]
    } else {
      userData.client_ip_address = userData.client_ip_address || '192.168.1.1'
    }

    userData.client_user_agent =
      userData.client_user_agent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SkipCloud/1.0'

    const payload = {
      data: [
        {
          event_name: newStatus,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: 'https://brfiacrminteligente.goskip.app',
          event_id: e.record.id + '_' + newStatus,
          user_data: userData,
          custom_data: {
            status: newStatus,
          },
        },
      ],
    }

    if (testCode) payload.test_event_code = testCode

    const url = `https://graph.facebook.com/v21.0/${datasetId}/events`
    try {
      const res = $http.send({
        url: url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${capiToken}`,
        },
        body: JSON.stringify(payload),
        timeout: 10,
      })

      if (res.statusCode >= 400) {
        const errorBody = res.json || {}
        const metaError = errorBody.error || {}
        const metaErrorCode = metaError.code
        const metaErrorSubcode = metaError.error_subcode
        let errorMsg = metaError.message || `API Error ${res.statusCode}`

        // GraphMethodException: code 100, subcode 33 — "Object with ID does not exist"
        if (metaErrorCode === 100 && metaErrorSubcode === 33) {
          errorMsg = `Object ID '${datasetId}' não encontrado. O Dataset/Pixel ID fornecido não existe ou o token não tem permissão para acessá-lo. Verifique o ID nas configurações de conexão.`
        } else if (
          errorMsg.includes('Unsupported post request') ||
          errorMsg.includes('does not exist') ||
          errorMsg.includes('Object with ID')
        ) {
          errorMsg = `ID inválido: O Dataset/Pixel ID '${datasetId}' não existe ou o token não tem permissão. Verifique se não é um App ID.`
        }

        $app
          .logger()
          .error(
            'CAPI Update Error',
            'status',
            res.statusCode,
            'code',
            metaErrorCode,
            'subcode',
            metaErrorSubcode,
            'message',
            errorMsg,
          )
        if (user) {
          user.set('meta_capi_status', 'error')
          user.set('meta_capi_error', errorMsg)
          try {
            $app.saveNoValidate(user)
          } catch (_) {}
        }
      } else {
        if (user && user.getString('meta_capi_status') === 'error') {
          user.set('meta_capi_status', 'connected')
          user.set('meta_capi_error', '')
          try {
            $app.saveNoValidate(user)
          } catch (_) {}
        }
      }
    } catch (err) {
      $app.logger().error('CAPI Request Failed', 'error', err.message)
    }
  }

  e.next()
}, 'customers')
