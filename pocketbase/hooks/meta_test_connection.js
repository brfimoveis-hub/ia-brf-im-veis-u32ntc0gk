routerAdd(
  'POST',
  '/backend/v1/meta-test-connection',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new UnauthorizedError('Unauthorized')
    }

    const pixelId = auth.getString('meta_pixel_id')
    if (!pixelId) {
      throw new BadRequestError('Pixel ID ausente na configuração do usuário')
    }

    if (pixelId !== '61569504383085') {
      throw new BadRequestError('Pixel ID inválido. Esperado 61569504383085')
    }

    return e.json(200, { status: 'Connected', pixel: pixelId })
  },
  $apis.requireAuth(),
)
