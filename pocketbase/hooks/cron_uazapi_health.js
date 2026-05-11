cronAdd('uazapi_health_check', '*/5 * * * *', () => {
  const users = $app.findRecordsByFilter('users', "uazapi_instance_number != ''", '', 100, 0)

  for (const user of users) {
    const instance = user.getString('uazapi_instance_number')
    const domain = user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    const adminToken =
      $secrets.get('UAZAPI_ADMIN_TOKEN') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    try {
      const res = $http.send({
        url: `${domain}/instance/connectionState/${instance}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          AdminToken: adminToken,
        },
        timeout: 10,
      })

      if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 404) {
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
      } else if (res.statusCode === 200) {
        if (user.getString('uazapi_status') !== 'connected') {
          user.set('uazapi_status', 'connected')
          user.set('uazapi_error', '')
          $app.save(user)
        }
      }
    } catch (e) {
      $app.logger().error('Cron Uazapi Health Error', 'error', e.message, 'instance', instance)
    }
  }
})
