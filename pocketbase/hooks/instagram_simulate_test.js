// Trigger temporário para validação do webhook do Instagram
// Pode ser acionado via POST sem auth para simular a chegada do payload da Meta
routerAdd('POST', '/backend/v1/instagram/simulate_test_event', (e) => {
  var baseUrl = $secrets.get('PB_INSTANCE_URL') || ''
  if (!baseUrl) {
    baseUrl = 'https://' + (e.request.host || 'localhost')
  }
  var cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  var testPayload = {
    object: 'instagram',
    entry: [
      {
        id: '17841418593400936',
        time: Date.now(),
        messaging: [
          {
            sender: { id: '1380007457455751' },
            recipient: { id: '17841418593400936' },
            timestamp: Date.now(),
            message: {
              mid: 'm_test_simulated_' + Date.now(),
              text: 'Teste de validação de webhook Instagram direto via simulação',
            },
          },
        ],
      },
    ],
  }

  try {
    var res = $http.send({
      url: cleanUrl + '/backend/v1/instagram/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
      timeout: 15,
    })

    return e.json(200, {
      success: true,
      statusCode: res.statusCode,
      body: typeof res.body === 'string' ? res.body : String(res.body || ''),
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: String(err),
    })
  }
})
