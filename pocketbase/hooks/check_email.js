routerAdd('POST', '/backend/v1/check-email', (e) => {
  const body = e.requestInfo().body
  if (!body || !body.email) {
    throw new BadRequestError('O campo email é obrigatório')
  }
  try {
    $app.findAuthRecordByEmail('users', body.email)
    return e.json(200, { exists: true })
  } catch (_) {
    throw new NotFoundError('Usuário não encontrado.')
  }
})
