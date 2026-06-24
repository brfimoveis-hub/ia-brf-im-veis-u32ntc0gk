routerAdd('GET', '/backend/v1/webhooks/chaves-na-mao/status', (e) => {
  return e.json(200, {
    status: 'active',
    message: 'A integração com o Chaves na Mão está ativa e pronta para receber leads no Pipeline.',
  })
})
