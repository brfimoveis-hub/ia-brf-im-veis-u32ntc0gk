// 1762800009_probe_app_secret_candidates.js
// [APP_SECRET_FIX] Etapa 1 — PROVA, não presunção.
//
// O usuário g5jto8bhulw01bz tem meta_app_id=2442476629610638 (app "BRF Imóveis 2"),
// mas meta_app_secret=d085b85d... (chave herdada de um fallback antigo do app
// anterior) e meta_instagram_app_secret=248ee93a... A Meta exige "Require App
// Secret": com o secret errado, toda chamada Graph com token de usuário falha com
// code 100 "Invalid appsecret_proof" e o debug_token com code 190 "Invalid OAuth
// access token signature".
//
// Aqui o token de usuário ATUAL (meta_instagram_user_token, o ...6QXu gerado hoje
// pela Bernadete no app 2442476629610638) é testado duas vezes contra
// /debug_token — uma com cada secret candidata — e contra /me com appsecret_proof
// por secret. A chave que validar é gravada no system_logs como prova. A decisão
// de ALTERAR o registro é da etapa 2: esta migração é um probe somente-leitura e
// roda em qualquer cópia do projeto com segurança.
migrate(
  (app) => {
    let user = null
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      return
    }
    if (!user) return

    const tag = '[APP_SECRET_FIX]'
    const userToken = (user.getString('meta_instagram_user_token') || '').trim()
    const appId = '2442476629610638'
    const candidates = [
      {
        label: 'meta_app_secret (d085b85d...8043610, herdada do app antigo)',
        secret: 'd085b85d8d534c682f60b6bde8043610',
      },
      {
        label: 'meta_instagram_app_secret (248ee93a...53a9083)',
        secret: '248ee93aa36d2e85bef72379753a9083',
      },
    ]
    if (!userToken) {
      console.error(tag + ' sem meta_instagram_user_token no usuário — probe abortado')
      return
    }
    console.log(
      tag +
        ' token testado: ...' +
        userToken.slice(-4) +
        ' (' +
        userToken.length +
        ' chars), app=' +
        appId,
    )

    const results = []
    let winner = null
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i]
      const r = {
        candidate: cand.label,
        secret_masked: cand.secret.slice(0, 8) + '...' + cand.secret.slice(-8),
      }

      // Teste A: /debug_token com app access token APP_ID|SECRET.
      // Secret errado => code 190 "Invalid OAuth access token signature".
      try {
        const dbg = $http.send({
          url:
            'https://graph.facebook.com/debug_token?input_token=' +
            encodeURIComponent(userToken) +
            '&access_token=' +
            encodeURIComponent(appId + '|' + cand.secret),
          method: 'GET',
          timeout: 12,
        })
        const body = dbg.json || {}
        const data = body.data || null
        r.debug_token = {
          http_status: dbg.statusCode,
          is_valid: !!(data && data.is_valid),
          error: body.error || null,
          app_id_seen: data ? data.app_id || '' : '',
          application: data ? data.application || '' : '',
          type: data ? data.type || '' : '',
        }
      } catch (err) {
        r.debug_token = { error: String(err) }
      }

      // Teste B: /me com appsecret_proof = HMAC-SHA256(token, secret).
      // Secret certo => 200 com id; secret errado => code 100 "Invalid appsecret_proof".
      try {
        const proof = $security.hs256(userToken, cand.secret)
        const me = $http.send({
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
          id: me.json ? me.json.id || '' : '',
          name: me.json ? me.json.name || '' : '',
          error: me.json && me.json.error ? me.json.error : null,
        }
      } catch (err) {
        r.me_with_proof = { error: String(err) }
      }

      const dbgOk = !!(r.debug_token && r.debug_token.is_valid)
      const meOk = !!(r.me_with_proof && r.me_with_proof.http_status === 200 && r.me_with_proof.id)
      r.accepted = dbgOk || meOk
      if (r.accepted && !winner) winner = cand
      results.push(r)
      console.log(
        tag +
          ' chave ' +
          cand.label +
          ' => debug_token.is_valid=' +
          (r.debug_token ? r.debug_token.is_valid : 'n/a') +
          ' /me=' +
          (r.me_with_proof ? r.me_with_proof.http_status : 'n/a') +
          ' => aceita=' +
          r.accepted,
      )
    }

    // Teste C: debug_token do token ...6QXu com a chave vencedora (prova final)
    let finalDebug = null
    if (winner) {
      try {
        const fd = $http.send({
          url:
            'https://graph.facebook.com/debug_token?input_token=' +
            encodeURIComponent(userToken) +
            '&access_token=' +
            encodeURIComponent(appId + '|' + winner.secret),
          method: 'GET',
          timeout: 12,
        })
        finalDebug = fd.json || {}
      } catch (err) {
        finalDebug = { error: String(err) }
      }
    }

    const summary = {
      tag: 'APP_SECRET_FIX',
      app_id: appId,
      token_suffix: '...' + userToken.slice(-4),
      candidates_tested: results,
      winner: winner ? winner.label : null,
      final_debug_token: finalDebug,
    }

    console.log(tag + ' RESULTADO: chave aceita = ' + (winner ? winner.label : 'NENHUMA das duas'))
    console.log(
      tag +
        ' debug_token final do token ...' +
        userToken.slice(-4) +
        ' com a chave aceita: ' +
        JSON.stringify(finalDebug),
    )

    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const rec = new Record(logsCol)
      rec.set('user_id', user.id)
      rec.set('type', 'app_secret_fix_probe')
      rec.set(
        'message',
        tag +
          ' Probe das duas App Secrets do app 2442476629610638 com o token ...' +
          userToken.slice(-4) +
          '. Aceita: ' +
          (winner ? winner.label : 'NENHUMA'),
      )
      rec.set('details', JSON.stringify(summary))
      app.saveNoValidate(rec)
    } catch (logErr) {
      console.error(tag + ' falha ao gravar system_logs: ' + String(logErr))
    }
  },
  (app) => {},
)
