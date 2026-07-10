routerAdd('GET', '/backend/v1/chaves_na_mao_webhook/status', (e) => {
  return e.json(200, { status: 'active' })
})
