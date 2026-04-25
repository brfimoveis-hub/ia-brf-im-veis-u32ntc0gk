onRecordAfterUpdateSuccess((e) => {
  const customer = e.record
  const original = e.record.original()

  const userId = customer.getString('user_id')
  if (!userId) return e.next()

  const emailChanged =
    customer.getString('email') !== original.getString('email') ||
    customer.getString('email_1_value') !== original.getString('email_1_value')
  const phoneChanged =
    customer.getString('phone') !== original.getString('phone') ||
    customer.getString('phone_1_value') !== original.getString('phone_1_value')
  const statusChanged = customer.getString('status') !== original.getString('status')

  if (!emailChanged && !phoneChanged && !statusChanged) return e.next()

  try {
    const user = $app.findRecordById('users', userId)
    const pixelId = (user.getString('meta_pixel_id') || '').trim()
    const capiToken = (user.getString('meta_capi_token') || '').trim()
    const testCode = (user.getString('meta_test_event_code') || '').trim()
    const campaignPhone = (user.getString('meta_campaign_phone') || '').replace(/\D/g, '')

    if (!pixelId || !capiToken) return e.next()

    let email = customer.getString('email_1_value') || customer.getString('email') || ''
    let phone = customer.getString('phone_1_value') || customer.getString('phone') || ''

    email = email.trim().toLowerCase()
    phone = phone.replace(/[^0-9]/g, '')
    if (phone.length === 10 || phone.length === 11) {
      phone = '55' + phone
    }

    const userData = {}
    if (email) userData.em = [$security.sha256(email)]
    if (phone) userData.ph = [$security.sha256(phone)]

    if (!userData.em && !userData.ph) return e.next()

    const payload = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'other',
          user_data: userData,
          custom_data: {
            currency: 'BRL',
            value: 0,
            search_keyword: 'auto_update',
            campaign_phone: campaignPhone ? $security.sha256(campaignPhone) : undefined,
          },
        },
      ],
    }

    if (testCode) payload.test_event_code = testCode

    const res = $http.send({
      url: `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 10,
    })

    if (res.statusCode !== 200) {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', userId)
      logRecord.set('type', 'meta_sync')
      logRecord.set('message', 'Falha no sync automático (Update)')
      logRecord.set('details', String(res.json || res.raw))
      $app.saveNoValidate(logRecord)
    } else {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('user_id', userId)
      logRecord.set('type', 'meta_sync')
      logRecord.set('message', 'Sync automático de Lead com sucesso (Update)')
      logRecord.set('details', 'Customer ID: ' + customer.id)
      $app.saveNoValidate(logRecord)
    }
  } catch (err) {
    $app.logger().error('Auto Meta CAPI Sync Update Error', 'error', String(err))
  }
  return e.next()
}, 'customers')
