onRecordAfterUpdateSuccess((e) => {
  const newStatus = e.record.getString('status')
  const oldStatus = e.record.original().getString('status')

  if (newStatus && newStatus !== oldStatus) {
    const userId = e.record.getString('user_id')

    let pixelId = $secrets.get('META_PIXEL_ID')
    let capiToken = $secrets.get('META_ACCESS_TOKEN')
    let testCode = $secrets.get('META_TEST_EVENT_CODE')

    if ((!pixelId || !capiToken) && userId) {
      try {
        const user = $app.findRecordById('users', userId)
        pixelId = pixelId || user.getString('meta_pixel_id')
        capiToken = capiToken || user.getString('meta_capi_token')
      } catch (err) {}
    }

    if (pixelId && capiToken) {
      let email = e.record.getString('email') || e.record.getString('email_1_value')
      let phone = e.record.getString('phone') || e.record.getString('phone_1_value')
      let fn =
        e.record.getString('first_name') ||
        (e.record.getString('name') ? e.record.getString('name').split(' ')[0] : '')
      let ln = e.record.getString('name')
        ? e.record.getString('name').split(' ').slice(1).join(' ')
        : ''

      const userData = {}

      if (email) {
        userData.em = [$security.sha256(email.trim().toLowerCase())]
      }
      if (phone) {
        let cleanPhone = phone.replace(/\D/g, '')
        // Meta prefers country codes. Assume 55 (BR) if length is exactly 10 or 11
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
          cleanPhone = '55' + cleanPhone
        }
        userData.ph = [$security.sha256(cleanPhone)]
      }
      if (fn) {
        // Remove diacritics as required by Meta CAPI best practices for hashing
        fn = fn.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        userData.fn = [$security.sha256(fn.trim().toLowerCase())]
      }
      if (ln) {
        ln = ln.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        userData.ln = [$security.sha256(ln.trim().toLowerCase())]
      }

      if (!userData.em && !userData.ph && !userData.fn) {
        $app
          .logger()
          .warn(
            'CAPI Event Match Warning: Insufficient parameters for event matching. See https://developers.facebook.com/docs/marketing-api/conversions-api/best-practices/#req-rec-params',
          )
        return e.next()
      }

      userData.client_ip_address = userData.client_ip_address || '192.168.1.1'
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
            event_id: $security.randomString(32),
            user_data: userData,
            custom_data: {
              status: newStatus,
            },
          },
        ],
      }

      if (testCode) payload.test_event_code = testCode

      const url = `https://graph.facebook.com/v21.0/${pixelId}/events`
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
          $app
            .logger()
            .error('CAPI Update Error', 'status', res.statusCode, 'body', res.json || res.body)
        }
      } catch (err) {
        $app.logger().error('CAPI Request Failed', 'error', err.message)
      }
    }
  }

  e.next()
}, 'customers')
