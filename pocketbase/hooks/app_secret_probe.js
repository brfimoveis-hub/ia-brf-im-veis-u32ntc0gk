// Hook TEMPORÁRIO de probe das App Secrets do app 2442476629610638.
// Rota: GET /backend/v1/app_secret_probe
// [APP_SECRET_FIX] Prova: testa o token de usuário atual (meta_instagram_user_token)
// duas vezes contra /debug_token (uma por secret candidata) e contra /me com
// appsecret_proof por secret. Sem alterar nada. Removível após auditoria.
//
// Regra v0.0.1399: helpers declarados DENTRO do handler.
function handleAppSecretProbe(e) {
  var out = { tag: 'APP_SECRET_FIX', tested_at: new Date().toISOString() }
  try {
    var user = $app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    if (!user) {
      return e.json(404, { error: 'usuário não encontrado' })
    }
    var userToken = (user.getString('meta_instagram_user_token') || '').trim()
    var appId = (user.getString('meta_app_id') || '2442476629610638').trim()
    var candidates = [
      { label: 'meta_app_secret', secret: (user.getString('meta_app_secret') || '').trim() },
      {
        label: 'meta_instagram_app_secret',
        secret: (user.getString('meta_instagram_app_secret') || '').trim(),
      },
    ]
    out.app_id = appId
    out.token_suffix = '...' + userToken.slice(-4)
    out.candidates = []

    var winner = null
    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i]
      if (!cand.secret) continue
      var r = {
        candidate: cand.label,
        secret_masked: cand.secret.slice(0, 8) + '...' + cand.secret.slice(-8),
      }

      // Teste A: debug_token com app access token APP_ID|SECRET
      try {
        var dbg = $http.send({
          url:
            'https://graph.facebook.com/debug_token?input_token=' +
            encodeURIComponent(userToken) +
            '&access_token=' +
            encodeURIComponent(appId + '|' + cand.secret),
          method: 'GET',
          timeout: 12,
        })
        var data = dbg.json && dbg.json.data ? dbg.json.data : null
        r.debug_token = {
          http_status: dbg.statusCode,
          is_valid: !!(data && data.is_valid),
          error: dbg.json && dbg.json.error ? dbg.json.error : null,
          application: data ? data.application || '' : '',
        }
      } catch (errA) {
        r.debug_token = { error: String(errA) }
      }

      // Teste B: /me com appsecret_proof = HMAC-SHA256(token, secret)
      try {
        var proof = $security.hs256(userToken, cand.secret)
        var me = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me?fields=id,name&access_token=' +
            encodeURIComponent(userToken) +
            '&appsecret_proof=' +
            proof,
          method: 'GET',
          timeout: 12,
        })
        r.me_with_proof = {
          http_status: me.statusCode,
          id: me.json && me.json.id ? me.json.id : '',
          name: me.json && me.json.name ? me.json.name : '',
          error: me.json && me.json.error ? me.json.error : null,
        }
      } catch (errB) {
        r.me_with_proof = { error: String(errB) }
      }

      r.accepted = !!(
        (r.debug_token && r.debug_token.is_valid) ||
        (r.me_with_proof && r.me_with_proof.http_status === 200 && r.me_with_proof.id)
      )
      if (r.accepted && !winner) winner = cand.label
      out.candidates.push(r)
      console.log(
        '[APP_SECRET_FIX] probe HTTP: ' +
          cand.label +
          ' => debug_token.is_valid=' +
          (r.debug_token ? r.debug_token.is_valid : 'n/a') +
          ' /me=' +
          (r.me_with_proof ? r.me_with_proof.http_status : 'n/a') +
          ' => aceita=' +
          r.accepted,
      )
    }

    out.winner = winner
    // debug_token final do token ...6QXu com a chave vencedora — DUAS formas:
    // (a) app access token APP_ID|SECRET com appsecret_proof (o app exige
    //     "Require App Secret" até para o app token — sem proof dá code 100);
    // (b) o próprio token de usuário como input e access token (owner do app
    //     aceito) + proof do próprio token.
    if (winner) {
      var winSec = winner === 'meta_app_secret' ? candidates[0].secret : candidates[1].secret
      // (a) app token + proof
      try {
        var appTok = appId + '|' + winSec
        var fdProof = $security.hs256(appTok, winSec)
        var fd = $http.send({
          url:
            'https://graph.facebook.com/debug_token?input_token=' +
            encodeURIComponent(userToken) +
            '&access_token=' +
            encodeURIComponent(appTok) +
            '&appsecret_proof=' +
            fdProof,
          method: 'GET',
          timeout: 12,
        })
        out.final_debug_token = fd.json || {}
        out.final_debug_token_http = fd.statusCode
      } catch (errC) {
        out.final_debug_token = { error: String(errC) }
      }
      // (b) user token debugando a si mesmo + proof
      try {
        var fd2Proof = $security.hs256(userToken, winSec)
        var fd2 = $http.send({
          url:
            'https://graph.facebook.com/debug_token?input_token=' +
            encodeURIComponent(userToken) +
            '&access_token=' +
            encodeURIComponent(userToken) +
            '&appsecret_proof=' +
            fd2Proof,
          method: 'GET',
          timeout: 12,
        })
        out.final_debug_token_user = fd2.json || {}
        out.final_debug_token_user_http = fd2.statusCode
      } catch (errD) {
        out.final_debug_token_user = { error: String(errD) }
      }
      console.log(
        '[APP_SECRET_FIX] probe HTTP final (app token + proof): ' +
          JSON.stringify(out.final_debug_token),
      )
      console.log(
        '[APP_SECRET_FIX] probe HTTP final (user token + proof): ' +
          JSON.stringify(out.final_debug_token_user),
      )
    }
    console.log('[APP_SECRET_FIX] probe HTTP resultado: vencedora=' + (winner || 'NENHUMA'))

    // Prova persistida em system_logs (auditoria do Mauro)
    try {
      var logsCol = $app.findCollectionByNameOrId('system_logs')
      var rec = new Record(logsCol)
      rec.set('user_id', user.id)
      rec.set('type', 'app_secret_probe')
      rec.set('message', '[APP_SECRET_FIX] probe HTTP — aceita: ' + (winner || 'NENHUMA'))
      rec.set('details', JSON.stringify(out))
      $app.saveNoValidate(rec)
    } catch (_) {}

    return e.json(200, out)
  } catch (outer) {
    return e.json(500, { error: String(outer) })
  }
}

routerAdd('GET', '/backend/v1/app_secret_probe', handleAppSecretProbe)
