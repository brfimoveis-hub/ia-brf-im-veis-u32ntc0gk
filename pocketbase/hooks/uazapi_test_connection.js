routerAdd(
  'POST',
  '/backend/v1/uazapi-test-connection',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new UnauthorizedError('Unauthorized')
    }

    const body = e.requestInfo().body || {}
    const phone = body.phone || '5548992098050'

    const user = $app.findRecordById('users', auth.id)
    const domain = user.getString('uazapi_domain') || 'https://iabrfimveis.uazapi.com'
    const token =
      user.getString('uazapi_token') || 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj'

    let url = domain.replace(/\/$/, '') + `/instance/connectionState/${phone}`

    let isError = false
    let errorMsg = ''

    try {
      const res = $http.send({
        url: url,
        method: 'GET',
        headers: {
          apikey: token,
          'Content-Type': 'application/json',
        },
        timeout: 10,
      })

      if (res.statusCode === 404) {
        isError = true
        errorMsg = `The requested resource wasn't found`
      } else if (res.statusCode < 200 || res.statusCode >= 300) {
        isError = true
        errorMsg = `Falha na integridade da conexão Uazapi para o número ${phone}: Erro HTTP ${res.statusCode}`
      }
    } catch (err) {
      $app.logger().error('Uazapi HTTP Error', 'err', err)
      isError = true
      errorMsg = `Falha na integridade da conexão Uazapi para o número ${phone}: O servidor está inalcançável ou ocorreu um erro de rede`
    }

    if (isError) {
      try {
        user.set('uazapi_status', 'error')
        user.set('uazapi_error', errorMsg)
        $app.saveNoValidate(user)
      } catch (saveErr) {
        $app.logger().error('Error saving user uazapi status', 'err', saveErr)
      }
      throw new NotFoundError(errorMsg)
    }

    try {
      user.set('uazapi_status', 'connected')
      user.set('uazapi_error', '')
      $app.saveNoValidate(user)
    } catch (saveErr) {
      $app.logger().error('Error saving user uazapi status', 'err', saveErr)
    }

    return e.json(200, { status: 'connected', provider: 'Uazapi', phone: phone })
  },
  $apis.requireAuth(),
)
