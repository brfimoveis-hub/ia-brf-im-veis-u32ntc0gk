// 1762810000_fix_meta_app_secret.js
// [APP_SECRET_FIX] Etapa 2 — CORREÇÃO do registro, idempotente (reescrita v0.0.1420).
//
// O probe da etapa 1 (1762800009) e o hook /backend/v1/app_secret_probe provaram
// nos logs que a App Secret real do app 2442476629610638 é a
// meta_instagram_app_secret (248ee93a...): com ela o /me aceita o
// appsecret_proof (200 "Mauro Fengler") e o debug_token do token ...6QXu
// retorna is_valid=true; com a meta_app_secret antiga (d085b85d, herdada do app
// anterior) a Meta devolve code 190 "Invalid OAuth access token signature" /
// code 100 "Invalid appsecret_proof".
//
// OBS de arquitetura (prova do probe): neste app o debug_token com app access
// token APP_ID|SECRET devolve "#100 You must provide an app access token..."
// MESMO com a secret certa — o app exige App Secret (appsecret_proof) em TODAS
// as chamadas, inclusive com app access token. O teste decisivo é o /me com
// proof; o debug_token válido só sai autenticado com o próprio token de usuário
// + proof (is_valid=true, application "BRF Imóveis 2").
//
// Esta migração NÃO confia em nada hardcode: repete a prova por si só (/me com
// proof de cada candidata, com fallback pela prova já registrada em system_logs
// quando nenhuma valida — ex. token expirado no replay), atualiza
// meta_app_secret para a chave aceita e grava o resultado em system_logs. Em
// qualquer cópia do projeto só escreve quando UMA chave valida (ou o par provado
// bate) e o valor salvo é diferente.
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
    const appId = (user.getString('meta_app_id') || '2442476629610638').trim()
    const userToken = (user.getString('meta_instagram_user_token') || '').trim()
    const currentSecret = (user.getString('meta_app_secret') || '').trim()
    const dedicatedSecret = (user.getString('meta_instagram_app_secret') || '').trim()
    const OLD_HARDCODED = 'd085b85d8d534c682f60b6bde8043610'

    // Candidatas deduplicadas: a dedicada primeiro (provada válida), depois a
    // salva atual — só entram se existirem no registro.
    const candidates = []
    if (dedicatedSecret) candidates.push(dedicatedSecret)
    if (currentSecret && currentSecret !== dedicatedSecret) candidates.push(currentSecret)
    if (candidates.length === 0) {
      console.log(tag + ' etapa 2: nada a testar (candidatas ausentes) — abortado sem alteração')
      return
    }

    let winner = null
    const tested = []
    for (let i = 0; i < candidates.length; i++) {
      const secret = candidates[i]
      const masked = secret.slice(0, 8) + '...' + secret.slice(-8)
      const detail = { secret_masked: masked, accepted: false }

      // Teste decisivo: /me com appsecret_proof = HMAC-SHA256(token, secret).
      // Secret certa => 200 com id; errada => code 100 "Invalid appsecret_proof".
      if (userToken) {
        try {
          const proof = $security.hs256(userToken, secret)
          const me = $http.send({
            url:
              'https://graph.facebook.com/v22.0/me?fields=id,name&access_token=' +
              encodeURIComponent(userToken) +
              '&appsecret_proof=' +
              proof,
            method: 'GET',
            timeout: 12,
          })
          const ok = !!(me.statusCode === 200 && me.json && me.json.id)
          detail.me_with_proof = {
            http_status: me.statusCode,
            id: me.json && me.json.id ? me.json.id : '',
            name: me.json && me.json.name ? me.json.name : '',
            error: me.json && me.json.error ? me.json.error : null,
          }
          detail.accepted = ok
        } catch (errB) {
          detail.me_with_proof = { error: String(errB) }
        }
      }

      // Teste complementar: debug_token autenticado com o PRÓPRIO token de
      // usuário + proof (única forma que funciona neste app — ver OBS acima).
      if (userToken) {
        try {
          const proof = $security.hs256(userToken, secret)
          const dbg = $http.send({
            url:
              'https://graph.facebook.com/debug_token?input_token=' +
              encodeURIComponent(userToken) +
              '&access_token=' +
              encodeURIComponent(userToken) +
              '&appsecret_proof=' +
              proof,
            method: 'GET',
            timeout: 12,
          })
          const data = (dbg.json && dbg.json.data) || null
          detail.debug_token_user = {
            http_status: dbg.statusCode,
            is_valid: !!(data && data.is_valid),
            application: data ? data.application || '' : '',
            error: (dbg.json && dbg.json.error) || null,
          }
          if (data && data.is_valid) detail.accepted = true
        } catch (errA) {
          detail.debug_token_user = { error: String(errA) }
        }
      }

      tested.push(detail)
      console.log(
        tag +
          ' etapa 2: chave ' +
          masked +
          ' => aceita=' +
          detail.accepted +
          ' /me=' +
          (detail.me_with_proof ? detail.me_with_proof.http_status : 'n/a'),
      )
      if (detail.accepted && !winner) winner = secret
    }

    // Fallback (prova já registrada): se nenhuma candidata validar AGORA (ex.:
    // token expirado no momento do replay da migração), corrige quando o valor
    // salvo é exatamente a chave herdada do app antigo (d085b85d...) e existe
    // meta_instagram_app_secret do MESMO app — par provado válido pelo probe
    // 1762800009 e pelo hook /backend/v1/app_secret_probe (system_logs types
    // app_secret_fix_probe / app_secret_probe, /me 200 "Mauro Fengler").
    if (!winner && dedicatedSecret && currentSecret === OLD_HARDCODED) {
      const dedAppId = (user.getString('meta_instagram_app_id') || '').trim()
      if (!dedAppId || dedAppId === appId) {
        winner = dedicatedSecret
        console.log(
          tag +
            ' etapa 2: fallback pela prova registrada em system_logs — usando meta_instagram_app_secret',
        )
      }
    }

    const writeLog = (msg, extra) => {
      try {
        const logsCol = app.findCollectionByNameOrId('system_logs')
        const rec = new Record(logsCol)
        rec.set('user_id', user.id)
        rec.set('type', 'app_secret_fix')
        rec.set('message', msg)
        rec.set(
          'details',
          JSON.stringify(
            Object.assign(
              {
                app_id: appId,
                token_suffix: userToken ? '...' + userToken.slice(-4) : '',
                tested: tested,
              },
              extra || {},
            ),
          ),
        )
        app.saveNoValidate(rec)
      } catch (logErr) {
        console.error(tag + ' etapa 2: falha ao gravar system_logs: ' + String(logErr))
      }
    }

    if (!winner) {
      console.error(tag + ' etapa 2: NENHUMA chave validou — meta_app_secret mantido como estava')
      writeLog(
        tag + ' etapa 2: nenhuma chave candidata validou — meta_app_secret mantido como estava',
      )
      return
    }

    if (currentSecret === winner) {
      console.log(tag + ' etapa 2: meta_app_secret já contém a chave correta — nada a fazer')
      return
    }

    const previous = currentSecret
      ? currentSecret.slice(0, 8) + '...' + currentSecret.slice(-8)
      : '(vazio)'
    user.set('meta_app_secret', winner)
    app.saveNoValidate(user)
    console.log(
      tag +
        ' etapa 2: meta_app_secret atualizado de ' +
        previous +
        ' para ' +
        winner.slice(0, 8) +
        '...' +
        winner.slice(-8),
    )
    writeLog(
      tag +
        ' meta_app_secret corrigido para a chave validada pela Meta (' +
        winner.slice(0, 8) +
        '...) — anterior (' +
        previous +
        ') era herdada do app antigo',
    )
  },
  (app) => {},
)
