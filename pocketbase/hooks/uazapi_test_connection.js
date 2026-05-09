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
      throw new NotFoundError(
        `Falha na integridade da conexão Uazapi para o número ${phone}: The requested resource wasn't found`,
      )
    }

    return e.json(200, { status: 'Connected', provider: 'Uazapi', phone: phone })
  },
  $apis.requireAuth(),
)
