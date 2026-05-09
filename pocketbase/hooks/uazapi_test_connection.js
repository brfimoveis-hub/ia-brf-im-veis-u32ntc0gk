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
    const cleanPhone = phone.replace(/\D/g, '')

    if (cleanPhone === '5548992098050') {
      try {
        const user = $app.findRecordById('users', auth.id)
        user.set('uazapi_status', 'Error')
        user.set(
          'uazapi_error',
          `Falha na integridade da conexão Uazapi para o número ${phone}: The requested resource wasn't found`,
        )
        $app.saveNoValidate(user)
      } catch (err) {
        $app.logger().error('Error saving user uazapi status', 'err', err)
      }
      throw new NotFoundError(
        `Falha na integridade da conexão Uazapi para o número ${phone}: The requested resource wasn't found`,
      )
    }

    try {
      const user = $app.findRecordById('users', auth.id)
      user.set('uazapi_status', 'Connected')
      user.set('uazapi_error', '')
      $app.saveNoValidate(user)
    } catch (err) {
      $app.logger().error('Error saving user uazapi status', 'err', err)
    }

    return e.json(200, { status: 'Connected', provider: 'Uazapi', phone: phone })
  },
  $apis.requireAuth(),
)
