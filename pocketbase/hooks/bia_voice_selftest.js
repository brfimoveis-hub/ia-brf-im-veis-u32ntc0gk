// ROTA DESATIVADA — substitui o antigo autoteste de voz.
// Motivo: o autoteste conseguia enviar nota de voz para um cliente real.
// Deixada aqui como bloqueio permanente para não ser recriada por engano.
routerAdd('GET', '/backend/v1/bia/voice/selftest', (e) => {
  return e.json(410, {
    ok: false,
    desativado: true,
    motivo: 'Rota de teste removida. Use /backend/v1/bia/voice/sample para ouvir a voz.',
  })
})
