onRecordAfterCreateSuccess((e) => {
  const userId = e.record.getString('assigned_to')

  let pixelId = $secrets.get('META_PIXEL_ID')
  let capiToken = $secrets.get('META_ACCESS_TOKEN')
  let testCode = $secrets.get('META_TEST_EVENT_CODE')
  let websiteUrl = ''

  if ((!pixelId || !capiToken || !websiteUrl) && userId) {
    try {
      const user = $app.findRecordById('users', userId)
      pixelId = pixelId || user.getString('meta_pixel_id')
      capiToken = capiToken || user.getString('meta_capi_token')
      websiteUrl = user.getString('website_url')
    } catch (err) {}
  }

  if (pixelId && capiToken) {
    const email = e.record.getString('email')
    const phone = e.record.getString('phone')
    const fn = e.record.getString('name') ? e.record.getString('name').split(' ')[0] : ''
    const ln = e.record.getString('name')
      ? e.record.getString('name').split(' ').slice(1).join(' ')
      : ''

    const userData = {}

    if (email) {
      userData.em = [$security.sha256(email.trim().toLowerCase())]
    }
    if (phone) {
      userData.ph = [$security.sha256(phone.replace(/\D/g, ''))]
    }
    if (fn) {
      userData.fn = [$security.sha256(fn.trim().toLowerCase())]
    }
    if (ln) {
      userData.ln = [$security.sha256(ln.trim().toLowerCase())]
    }

    if (userData.em || userData.ph || userData.fn) {
      const payload = {
        data: [
          {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: websiteUrl || 'https://www.brfimoveis.com.br',
            event_id: $security.randomString(32),
            user_data: userData,
            custom_data: {
              source: e.record.getString('source') || 'API',
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
            .error('CAPI Lead Create Error', 'status', res.statusCode, 'body', res.json || res.body)
        }
      } catch (err) {
        $app.logger().error('CAPI Request Failed', 'error', err.message)
      }
    }
  }

  e.next()
}, 'leads')
