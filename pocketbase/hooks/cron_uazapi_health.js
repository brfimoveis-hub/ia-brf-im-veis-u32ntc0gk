cronAdd('uazapi_health_check', '*/5 * * * *', () => {
  const users = $app.findRecordsByFilter('users', "uazapi_instance_number != ''", '', 100, 0)

  for (const user of users) {
    const instance = user.getString('uazapi_instance_number')
    let domain = user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    const adminToken =
      $secrets.get('UAZAPI_ADMIN_TOKEN') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    if (domain.endsWith('/')) domain = domain.slice(0, -1)
    if (domain.endsWith('/api')) domain = domain.slice(0, -4)
    if (domain.endsWith('/v1')) domain = domain.slice(0, -3)

    const userAdminToken = user.getString('uazapi_admin_token')
    const userApiKey = user.getString('uazapi_token')

    const headers = { 'Content-Type': 'application/json' }
    if (userAdminToken) headers['AdminToken'] = userAdminToken
    if (userApiKey) {
      headers['apikey'] = userApiKey
      headers['Authorization'] = userApiKey.toLowerCase().startsWith('bearer ')
        ? userApiKey
        : 'Bearer ' + userApiKey
    }
    if (!userAdminToken && !userApiKey) {
      headers['apikey'] = adminToken
      headers['Authorization'] = adminToken.toLowerCase().startsWith('bearer ')
        ? adminToken
        : 'Bearer ' + adminToken
    }

    try {
      let res = $http.send({
        url: `${domain}/instance/status/${instance}`,
        method: 'GET',
        headers: headers,
        timeout: 10,
      })

      if (res.statusCode === 404) {
        try {
          const apiV1Res = $http.send({
            url: `${domain}/api/v1/instance/status/${instance}`,
            method: 'GET',
            headers: headers,
            timeout: 10,
          })
          if (apiV1Res.statusCode !== 404) {
            res = apiV1Res
          }
        } catch (err) {}
      }

      if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 404) {
        const slackWebhook = $secrets.get('SLACK_WEBHOOK_URL')
        if (slackWebhook) {
          try {
            $http.send({
              url: slackWebhook,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: `⚠️ *Uazapi Error*\nInstância: ${instance}\nStatus: ${res.statusCode} (Desconectada/Inválida)`,
                channel: '#leads-sc',
              }),
              timeout: 10,
            })
          } catch (err) {}
        }

        const col = $app.findCollectionByNameOrId('system_logs')
        const record = new Record(col)
        record.set('type', 'diagnostic_error')
        record.set(
          'message',
          `Uazapi Health Check Failed (${res.statusCode}) - Auto-correction triggered`,
        )
        record.set('details', { instance, status: res.statusCode })
        $app.save(record)

        user.set('uazapi_status', 'disconnected')
        user.set('uazapi_error', `Token/Instance invalid (Auto-detected ${res.statusCode})`)
        $app.save(user)
      } else if (res.statusCode === 200 && res.json) {
        const data = res.json
        let statusStr = 'disconnected'
        if (data.status?.loggedIn || data.instance?.status === 'connected') {
          statusStr = 'online'
        } else if (data.instance?.qrcode) {
          statusStr = 'qr_ready'
        }

        if (user.getString('uazapi_status') !== statusStr) {
          user.set('uazapi_status', statusStr)
          user.set('uazapi_error', '')
          if (data.instance?.id) {
            user.set('uazapi_instance_number', data.instance.name || data.instance.id)
          }
          $app.save(user)
        }
      }
    } catch (e) {
      $app.logger().error('Cron Uazapi Health Error', 'error', e.message, 'instance', instance)
    }
  }
})
