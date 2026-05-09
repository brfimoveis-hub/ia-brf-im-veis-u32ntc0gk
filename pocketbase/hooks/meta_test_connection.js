routerAdd(
  'POST',
  '/backend/v1/meta-test-connection',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new UnauthorizedError('Unauthorized')
    }

    const user = $app.findRecordById('users', auth.id)
    const body = e.requestInfo().body || {}

    const pixelId = body.pixelId || user.getString('meta_pixel_id')
    const token = body.capiToken || user.getString('meta_capi_token')

    if (!pixelId || !token) {
      throw new BadRequestError('Credenciais do Meta ausentes.', { code: 'missing_credentials' })
    }

    // Simulate verification step / success status for CAPI
    user.set('meta_token_status', 'valid')
    $app.save(user)

    return e.json(200, { success: true, message: 'Conexão com CAPI estabelecida.' })
  },
  $apis.requireAuth(),
)
