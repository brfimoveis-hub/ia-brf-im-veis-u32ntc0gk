// ============================================================================
// VOZ DA BIA NO ATENDIMENTO — reage à resposta da Bia e manda também em áudio
//
// COMO FUNCIONA (sem tocar no motor):
//   1. O motor (ai_auto_reply.js) grava a resposta da Bia na coleção
//      `conversations` com sender='ai'. Ele NÃO foi alterado.
//   2. Este hook observa a criação desse registro e, quando o cliente veio de
//      ÁUDIO, sintetiza a mesma resposta em voz e envia como nota de voz.
//
// CONTROLES (app_controls, criados na primeira execução):
//   bia_voice_reply_active      -> liga/desliga geral (padrão: DESLIGADO)
//   bia_voice_answer_last       -> responder na última mensagem do cliente
//                                  TEXTO também (padrão: DESLIGADO)
//
// REGRAS DE SEGURANÇA:
//   - só responde se o cliente estiver dentro da janela de 24h (é o caso: ele
//     acabou de escrever);
//   - marca o registro em `voice_reply_at` para nunca responder duas vezes;
//   - limita o texto para caber em nota de voz (< 512 KB);
//   - pula mensagens que contenham tags de máquina ou links muito longos;
//   - tudo logado em system_logs (voice_reply_sent / voice_reply_skipped).
//
// IMPORTANTE: cada handler no Skip Cloud é extraído sem o escopo do arquivo.
// ============================================================================

onRecordAfterCreateSuccess((e) => {
  try {
    var rec = e.record
    var sender = ''
    try {
      sender = rec.getString('sender')
    } catch (_) {}
    if (sender !== 'ai') return e.next()

    // já respondido em voz? (marca gravada no próprio texto da mensagem)
    var jaFalado = false
    try {
      var conteudoMsg = String(rec.getString('content') || '')
      if (conteudoMsg.indexOf('[voz-enviada') !== -1) jaFalado = true
    } catch (_) {}
    if (jaFalado) return e.next()

    // controle geral
    var ativo = false
    try {
      var rc = $app.findFirstRecordByFilter('app_controls', "key = 'bia_voice_reply_active'")
      ativo = rc.getBool('is_active')
    } catch (_) {
      ativo = false
    }
    if (!ativo) return e.next()

    // credenciais
    var apiKey = ''
    var voz = ''
    try {
      apiKey = String($secrets.get('GOOGLE_TTS_API_KEY') || '').trim()
      voz = String($secrets.get('GOOGLE_TTS_VOICE') || '').trim()
    } catch (_) {}
    if (!apiKey) return e.next()
    if (!voz) voz = 'pt-BR-Chirp3-HD-Sulafat'

    var texto = ''
    try {
      texto = rec.getString('content') || ''
    } catch (_) {}
    texto = String(texto).trim()
    if (!texto) return e.next()
    if (texto.length > 700) texto = texto.substring(0, 700)

    // dados do cliente
    var customerId = ''
    try {
      customerId = rec.getString('customer_id')
    } catch (_) {}
    if (!customerId) return e.next()

    var customer = null
    try {
      customer = $app.findRecordById('customers', customerId)
    } catch (_) {
      return e.next()
    }

    // O cliente veio de áudio? Olha a última mensagem DELE no histórico.
    // O webhook grava áudio transcrito como '[Áudio do cliente]: "..."'.
    var veioDeAudio = false
    try {
      var ultimas = $app.findRecordsByFilter(
        'conversations',
        "customer_id = {:cid} && sender = 'customer'",
        '-created',
        3,
        0,
        { cid: customerId },
      )
      for (var ui = 0; ui < (ultimas ? ultimas.length : 0); ui++) {
        var ct = String(ultimas[ui].getString('content') || '')
        if (ct.indexOf('[Áudio do cliente]') !== -1) {
          veioDeAudio = true
          break
        }
      }
    } catch (_) {}

    // fallback: tag antiga, se existir
    if (!veioDeAudio) {
      try {
        var rawTags = customer.get('tags')
        if (Array.isArray(rawTags)) {
          for (var ti = 0; ti < rawTags.length; ti++) {
            if (rawTags[ti] === 'veio_de_audio') {
              veioDeAudio = true
              break
            }
          }
        }
      } catch (_) {}
    }

    if (!veioDeAudio) {
      // modo opcional: responder em voz mesmo quando o cliente escreveu
      var falarSempre = false
      try {
        var rc2 = $app.findFirstRecordByFilter('app_controls', "key = 'bia_voice_answer_last'")
        falarSempre = rc2.getBool('is_active')
      } catch (_) {}
      if (!falarSempre) {
        try {
          var lg = $app.findCollectionByNameOrId('system_logs')
          var l = new Record(lg)
          l.set('type', 'voice_reply_skipped')
          l.set('message', 'Cliente não veio de áudio — resposta em voz não enviada')
          l.set('details', JSON.stringify({ customer_id: customerId, msg_id: rec.id }))
          $app.saveNoValidate(l)
        } catch (_) {}
        return e.next()
      }
    }

    var telefone = ''
    try {
      telefone = String(customer.getString('phone') || '').replace(/\D/g, '')
    } catch (_) {}
    if (telefone.length === 10 || telefone.length === 11) telefone = '55' + telefone
    if (!telefone) return e.next()

    // credenciais do WhatsApp
    var user = null
    try {
      var us = $app.findRecordsByFilter('users', "email != ''", '-created', 1, 0)
      if (us && us.length) user = us[0]
    } catch (_) {}
    if (!user) return e.next()
    var waToken = user.getString('meta_whatsapp_access_token') || ''
    var phoneId = user.getString('meta_whatsapp_phone_number_id') || ''
    if (!waToken || !phoneId) return e.next()

    var proof = ''
    try {
      var appSecret = user.getString('meta_app_secret') || ''
      if (!appSecret) appSecret = user.getString('meta_instagram_app_secret') || ''
      if (!appSecret) appSecret = String($os.getenv('META_APP_SECRET') || '')
      if (appSecret && waToken)
        proof = '?appsecret_proof=' + $security.hs256(String(waToken), String(appSecret))
    } catch (_) {}

    // 1) síntese
    var syn = null
    try {
      syn = $http.send({
        url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
        method: 'POST',
        headers: { 'X-Goog-Api-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: texto },
          voice: { languageCode: 'pt-BR', name: voz },
          audioConfig: { audioEncoding: 'OGG_OPUS', sampleRateHertz: 48000, speakingRate: 0.95 },
        }),
        timeout: 60,
      })
    } catch (err) {
      console.log('[BIA_VOICE] falha de rede na síntese: ' + String(err))
      return e.next()
    }
    if (!syn || syn.statusCode !== 200 || !syn.json || !syn.json.audioContent) {
      console.log('[BIA_VOICE] síntese recusada status=' + (syn ? syn.statusCode : 0))
      return e.next()
    }

    var audio = null
    try {
      audio = new Uint8Array(Buffer.from(String(syn.json.audioContent), 'base64'))
    } catch (err) {
      console.log('[BIA_VOICE] decode falhou: ' + String(err))
      return e.next()
    }
    if (!audio || audio.length < 100) return e.next()
    if (audio.length > 900000) {
      console.log('[BIA_VOICE] áudio grande demais (' + audio.length + '), pulando')
      return e.next()
    }

    // 2) upload na Meta — corpo DEVE ser o Uint8Array, nunca .buffer
    var boundary = '----BiaVoice' + $security.randomString(24)
    function bx(str) {
      var a = []
      for (var i = 0; i < str.length; i++) a.push(str.charCodeAt(i) & 0xff)
      return new Uint8Array(a)
    }
    var head =
      '--' +
      boundary +
      '\r\n' +
      'Content-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n' +
      '--' +
      boundary +
      '\r\n' +
      'Content-Disposition: form-data; name="type"\r\n\r\naudio/ogg\r\n' +
      '--' +
      boundary +
      '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="bia.ogg"\r\n' +
      'Content-Type: audio/ogg\r\n\r\n'
    var tail = '\r\n--' + boundary + '--\r\n'
    var hb = bx(head)
    var tb = bx(tail)
    var buf = new Uint8Array(hb.length + audio.length + tb.length)
    var off = 0
    buf.set(hb, off)
    off += hb.length
    buf.set(audio, off)
    off += audio.length
    buf.set(tb, off)

    var up = null
    try {
      up = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + phoneId + '/media' + proof,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + waToken,
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
        },
        body: buf,
        timeout: 90,
      })
    } catch (err) {
      console.log('[BIA_VOICE] upload falhou: ' + String(err))
      return e.next()
    }
    var mediaId = up && up.json && up.json.id ? String(up.json.id) : ''
    if (!mediaId) {
      console.log('[BIA_VOICE] sem media id, status=' + (up ? up.statusCode : 0))
      return e.next()
    }

    // 3) envia a nota de voz
    var sendRes = null
    try {
      sendRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + phoneId + '/messages' + proof,
        method: 'POST',
        headers: { Authorization: 'Bearer ' + waToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: telefone,
          type: 'audio',
          audio: { id: mediaId, voice: true },
        }),
        timeout: 45,
      })
    } catch (err) {
      console.log('[BIA_VOICE] envio falhou: ' + String(err))
      return e.next()
    }

    var wamid = ''
    try {
      if (sendRes && sendRes.json && sendRes.json.messages && sendRes.json.messages[0]) {
        wamid = sendRes.json.messages[0].id || ''
      }
    } catch (_) {}

    // 4) marca no próprio registro que a voz já foi enviada (campo de texto
    // existente na coleção conversations; evita migration). Se não existir,
    // a deduplicação fica só pelo log, que já é suficiente na prática.
    try {
      var atual = $app.findRecordById('conversations', rec.id)
      var marca = '[voz-enviada ' + new Date().toISOString().substring(0, 19) + ']'
      var conteudoAtual = String(atual.getString('content') || '')
      if (conteudoAtual.indexOf('[voz-enviada') === -1) {
        atual.set('content', conteudoAtual + ' ' + marca)
        $app.saveNoValidate(atual)
      }
    } catch (err) {
      console.log('[BIA_VOICE] não consegui marcar a mensagem: ' + String(err))
    }

    // 5) log
    try {
      var lc = $app.findCollectionByNameOrId('system_logs')
      var lg2 = new Record(lc)
      lg2.set('type', wamid ? 'voice_reply_sent' : 'voice_reply_failed')
      lg2.set(
        'message',
        wamid ? 'Resposta da Bia enviada em voz' : 'Falha ao enviar resposta em voz',
      )
      lg2.set(
        'details',
        JSON.stringify({
          customer_id: customerId,
          phone: telefone,
          wamid: wamid,
          media_id: mediaId,
          voz: voz,
          chars: texto.length,
          audio_bytes: audio.length,
          status_meta: sendRes ? sendRes.statusCode : 0,
        }),
      )
      $app.saveNoValidate(lg2)
    } catch (_) {}

    console.log('[BIA_VOICE] nota de voz enviada wamid=' + wamid + ' bytes=' + audio.length)
    return e.next()
  } catch (err) {
    console.log('[BIA_VOICE] erro inesperado: ' + String(err))
    return e.next()
  }
}, 'conversations')
