/**
 * Endpoints e helpers para controle global de PARAR/RETOMAR a régua e automações.
 * - GET  /backend/v1/regua/status -> Retorna status atual (is_active, paused_at, paused_by, etc.)
 * - POST /backend/v1/regua/toggle -> Altera estado (pausar ou retomar), grava em app_controls e registra em system_logs
 */

/**
 * Helper global para hooks: verifica se as automações de régua estão ativas no banco.
 * Se a coleção ou registro não existir, assume false por segurança máxima até configuração explícita.
 * @param {object} appInstance
 * @returns {boolean}
 */
function isReguaAutomationsActive(appInstance) {
  var app = appInstance || $app
  try {
    var ctrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
    if (ctrl) {
      return !!ctrl.getBool('is_active')
    }
  } catch (err) {
    try {
      var row = app
        .db()
        .newQuery(
          "SELECT is_active FROM app_controls WHERE key = 'regua_automations_active' LIMIT 1",
        )
        .one()
      if (row) {
        return row.is_active === 1 || row.is_active === true || row.is_active === '1'
      }
    } catch (_) {}
  }
  return false
}

// Exporta para escopo global do Goja se possível
if (typeof globalThis !== 'undefined') {
  globalThis.isReguaAutomationsActive = isReguaAutomationsActive
}

routerAdd('GET', '/backend/v1/regua/status', function (c) {
  var app = $app
  var isActive = false
  var pausedAt = ''
  var pausedBy = ''
  var resumedAt = ''
  var resumedBy = ''
  var description = ''
  var recordId = ''

  try {
    var ctrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
    if (ctrl) {
      recordId = ctrl.id
      isActive = !!ctrl.getBool('is_active')
      pausedAt = ctrl.getString('paused_at') || ''
      pausedBy = ctrl.getString('paused_by') || ''
      resumedAt = ctrl.getString('resumed_at') || ''
      resumedBy = ctrl.getString('resumed_by') || ''
      description = ctrl.getString('description') || ''
    }
  } catch (err) {
    console.warn('[REGUA_CONTROL] Erro ao consultar status: ' + err.message)
  }

  return c.json(200, {
    success: true,
    key: 'regua_automations_active',
    is_active: isActive,
    status: isActive ? 'ativa' : 'pausada',
    paused_at: pausedAt,
    paused_by: pausedBy,
    resumed_at: resumedAt,
    resumed_by: resumedBy,
    description: description,
    record_id: recordId,
    checked_at: new Date().toISOString(),
  })
})

routerAdd('POST', '/backend/v1/regua/toggle', function (c) {
  var app = $app
  var body = {}
  var authRecord = null

  try {
    var info = c.requestInfo()
    if (info) {
      body = info.body || {}
      authRecord = info.auth
    }
  } catch (_) {}

  var operatorName =
    (body && body.operator) ||
    (authRecord ? authRecord.getString('name') || authRecord.getString('email') : '') ||
    'Mauro'

  var action = (body && body.action) || ''
  var targetActive = false

  try {
    var col = app.findCollectionByNameOrId('app_controls')
    var ctrl = null
    try {
      ctrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
    } catch (_) {
      ctrl = null
    }

    if (!ctrl) {
      ctrl = new Record(col)
      ctrl.set('key', 'regua_automations_active')
      ctrl.set('name', 'Régua de Persistência e Remarketing Automático')
    }

    var currentActive = !!ctrl.getBool('is_active')

    if (action === 'pause') {
      targetActive = false
    } else if (action === 'resume') {
      targetActive = true
    } else if (body && typeof body.active === 'boolean') {
      targetActive = body.active
    } else {
      targetActive = !currentActive
    }

    var nowIso = new Date().toISOString()
    ctrl.set('is_active', targetActive)

    if (targetActive) {
      ctrl.set('resumed_at', nowIso)
      ctrl.set('resumed_by', operatorName)
    } else {
      ctrl.set('paused_at', nowIso)
      ctrl.set('paused_by', operatorName)
    }

    app.saveNoValidate(ctrl)

    // Auditoria em system_logs
    try {
      var logsCol = app.findCollectionByNameOrId('system_logs')
      var sysLog = new Record(logsCol)
      sysLog.set('type', targetActive ? 'regua_resumed' : 'regua_paused')
      sysLog.set('user_id', authRecord ? authRecord.id : '')
      sysLog.set(
        'message',
        targetActive
          ? 'Régua de automações foi RETOMADA por ' + operatorName
          : 'Régua de automações foi PAUSADA manualmente por ' + operatorName,
      )
      sysLog.set(
        'details',
        JSON.stringify({
          key: 'regua_automations_active',
          is_active: targetActive,
          operator: operatorName,
          timestamp: nowIso,
          previous_state: currentActive,
        }),
      )
      app.saveNoValidate(sysLog)
    } catch (logErr) {
      console.warn('[REGUA_CONTROL] Erro ao gravar log: ' + logErr.message)
    }

    console.log(
      '[REGUA_CONTROL] Estado alterado com sucesso! is_active=' +
        targetActive +
        ' por ' +
        operatorName,
    )

    return c.json(200, {
      success: true,
      is_active: targetActive,
      status: targetActive ? 'ativa' : 'pausada',
      operator: operatorName,
      updated_at: nowIso,
      message: targetActive
        ? 'Régua retomada com sucesso. Os disparos voltarão a processar nos horários programados.'
        : 'Régua pausada com sucesso na hora. Nenhum envio automático sairá enquanto pausada.',
    })
  } catch (err) {
    console.error('[REGUA_CONTROL] Erro ao alterar estado da régua: ' + err.message)
    return c.json(500, {
      success: false,
      error: 'Erro ao alterar estado da régua: ' + err.message,
    })
  }
})
