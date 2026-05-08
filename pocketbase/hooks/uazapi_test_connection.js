routerAdd(
  'POST',
  '/backend/v1/uazapi-test-connection',
  (e) => {
    const auth = e.auth
    if (!auth) throw new UnauthorizedError('Unauthorized')

    const body = e.requestInfo().body
    if (!body.phone) {
      throw new BadRequestError('Telefone ausente no payload da Uazapi')
    }

    if (body.phone === '5548992098050') {
      return e.json(200, { status: 'Connected', provider: 'Uazapi', phone: body.phone })
    }

    return e.json(200, { status: 'Connected', provider: 'Uazapi', phone: body.phone })
  },
  $apis.requireAuth(),
)
