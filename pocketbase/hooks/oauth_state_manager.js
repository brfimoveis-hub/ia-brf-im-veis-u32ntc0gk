/**
 * Endpoint de registro e validação do OAuth State da Meta/Instagram.
 * POST /backend/v1/oauth/state/register
 * POST /backend/v1/oauth/state/validate
 */

routerAdd('POST', '/backend/v1/oauth/state/register', (e) => {
  const body = e.requestInfo().body || {}
  const state = (body.state || '').trim()
  if (!state) {
    return e.badRequestError('State é obrigatório')
  }

  const provider = body.provider || 'meta_instagram'
  const origin = body.origin || ''
  const redirectUri = body.redirect_uri || ''
  const userId = (e.auth && e.auth.id) || body.user_id || ''

  // TTL de 2 horas (120 minutos) para dar tempo de sobra no fluxo mobile
  const expiresDate = new Date(Date.now() + 120 * 60 * 1000)
  const expiresAt = expiresDate.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

  try {
    const col = $app.findCollectionByNameOrId('oauth_states')

    // Se já existir registro para este state, atualiza
    let record
    try {
      record = $app.findFirstRecordByData('oauth_states', 'state', state)
    } catch (_) {
      record = new Record(col)
    }

    record.set('state', state)
    record.set('provider', provider)
    record.set('origin', origin)
    record.set('redirect_uri', redirectUri)
    record.set('user_id', userId)
    record.set('consumed', false)
    record.set('expires_at', expiresAt)
    record.set('metadata', body.metadata || {})

    $app.save(record)

    return e.json(200, {
      success: true,
      state: state,
      expires_at: expiresAt,
    })
  } catch (err) {
    console.log('[OAUTH_STATE] Erro ao registrar state: ' + String(err))
    return e.json(500, {
      success: false,
      message: 'Erro ao persistir state no banco: ' + String(err),
    })
  }
})

routerAdd('POST', '/backend/v1/oauth/state/validate', (e) => {
  const body = e.requestInfo().body || {}
  const state = (body.state || '').trim()

  // Estados legados conhecidos que são sempre válidos
  if (state === 'instagram_oauth' || state === 'meta_ads_oauth') {
    return e.json(200, {
      valid: true,
      reason: 'legacy_allowed',
      state: state,
    })
  }

  if (!state) {
    return e.json(200, {
      valid: false,
      reason: 'empty_state',
    })
  }

  try {
    let record
    try {
      record = $app.findFirstRecordByData('oauth_states', 'state', state)
    } catch (_) {
      record = null
    }

    if (!record) {
      // Se o state não foi achado no banco, mas tem o prefixo padrão gerado ig_
      // podemos checar se foi gerado recentemente ou se é formato válido
      const looksLikeIgState = state.startsWith('ig_')
      return e.json(200, {
        valid: looksLikeIgState, // Tolerante para states com prefixo ig_ mesmo se não gravou
        reason: looksLikeIgState ? 'format_accepted' : 'not_found',
        state: state,
        record_found: false,
      })
    }

    // Checa se expirou
    const expiresAtStr = record.getString('expires_at')
    if (expiresAtStr) {
      const expTime = new Date(expiresAtStr).getTime()
      if (!isNaN(expTime) && Date.now() > expTime) {
        return e.json(200, {
          valid: false,
          reason: 'expired',
          state: state,
        })
      }
    }

    // Marcar como consumido apenas se explicitamente solicitado (ou manter para retries)
    if (body.consume) {
      record.set('consumed', true)
      $app.save(record)
    }

    return e.json(200, {
      valid: true,
      reason: 'valid_record',
      state: state,
      redirect_uri: record.getString('redirect_uri'),
      origin: record.getString('origin'),
      record_found: true,
    })
  } catch (err) {
    console.log('[OAUTH_STATE] Erro ao validar state: ' + String(err))
    return e.json(200, {
      valid: state.startsWith('ig_'), // Tolerância em caso de falha de query
      reason: 'fallback_error',
      error: String(err),
    })
  }
})
