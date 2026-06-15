routerAdd(
  'POST',
  '/backend/v1/uazapi/resync',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const user = $app.findRecordById('users', userId)

    const uazapiDomain = user.getString('uazapi_domain')
    const instanceNumber = user.getString('uazapi_instance_number')
    const adminToken = user.getString('uazapi_admin_token') || $secrets.get('UAZAPI_API_KEY') || ''

    if (!uazapiDomain || !instanceNumber) {
      return e.badRequestError('Configuração Uazapi incompleta.')
    }

    let isConnected = false
    try {
      const cleanUrl = uazapiDomain.endsWith('/') ? uazapiDomain.slice(0, -1) : uazapiDomain
      const res = $http.send({
        url: `${cleanUrl}/instance/connectionState/${instanceNumber}`,
        method: 'GET',
        headers: { apikey: adminToken },
        timeout: 10,
      })

      if (res.statusCode === 200 && res.json && res.json.instance?.state === 'open') {
        isConnected = true
      }
    } catch (err) {
      $app.logger().error('Uazapi resync error', 'error', String(err))
    }

    user.set('uazapi_status', isConnected ? 'connected' : 'disconnected')
    $app.save(user)

    return e.json(200, { status: user.getString('uazapi_status') })
  },
  $apis.requireAuth(),
)
