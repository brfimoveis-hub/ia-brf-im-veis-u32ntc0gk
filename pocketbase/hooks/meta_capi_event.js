onRecordAfterUpdateSuccess((e) => {
  const newStatus = e.record.getString('status')
  const oldStatus = e.record.original().getString('status')

  // Only fire on status change
  if (newStatus && newStatus !== oldStatus) {
    const userId = e.record.getString('user_id')
    if (!userId) return e.next()

    let user
    try {
      user = $app.findRecordById('users', userId)
    } catch (err) {
      return e.next()
    }

    const pixelId = user.getString('meta_pixel_id')
    const capiToken = user.getString('meta_capi_token')

    if (pixelId && capiToken) {
      const email = e.record.getString('email')
      const phone = e.record.getString('phone')
      const fn = e.record.getString('first_name')

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

      // Meta requires at least one user data field for identification
      if (!userData.em && !userData.ph && !userData.fn) {
        return e.next()
      }

      const payload = {
        data: [
          {
            event_name: 'LeadStatusUpdate',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'system_generated',
            user_data: userData,
            custom_data: {
              status: newStatus,
            },
          },
        ],
      }

      const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`
      try {
        const res = $http.send({
          url: url,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
