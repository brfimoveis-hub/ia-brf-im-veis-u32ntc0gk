// ============================================================================
// 1762900001_reactivate_dedup_failures_and_pause_vistage.js
//
// Auditoria régua/remarketing (19/11/2026):
// 1. REATIVAÇÃO de clientes abandonados por DEDUP_MENSAGEM_JA_ENVIADA:
//    o dedup marcava 'permanent_failure' e a régua abandonava o cliente.
//    - cadence_attempts com status='permanent_failure' e failure_reason
//      contendo DEDUP_MENSAGEM_JA_ENVIADA -> status='rescheduled';
//    - customers desses registros com persistence_status='pausado' ->
//      persistence_status='ativo', next_follow_up_at=agora (reentra na fila
//      do próximo step, mantendo o follow_up_step atual).
//    Idempotente: no-op em base vazia e nos no-op de valores já corretos.
// 2. convite_vistage volta a is_active=false (regra do Mauro: disparo PAUSADO
//    por padrão; só o painel, após aprovação expressa, ativa).
// ============================================================================
migrate(
  (app) => {
    const nowIso = new Date().toISOString()
    let reactivatedAttempts = 0
    let reactivatedCustomers = 0
    const customerIds = {}

    // 1a. Reescreve os registros de auditoria permanent_failure por dedup
    let attempts = []
    try {
      attempts = app.findRecordsByFilter(
        'cadence_attempts',
        "status = 'permanent_failure' && failure_reason ~ 'DEDUP_MENSAGEM_JA_ENVIADA'",
        '-created',
        500,
        0,
      )
    } catch (e) {
      console.warn('[MIGRATION_1762900001] Falha ao buscar cadence_attempts: ' + e.message)
    }

    for (let i = 0; i < attempts.length; i++) {
      const rec = attempts[i]
      try {
        const custId = rec.getString('customer_id') || ''
        if (custId) customerIds[custId] = true
        rec.set('status', 'rescheduled')
        rec.set('next_attempt_at', nowIso)
        rec.set(
          'failure_reason',
          (rec.getString('failure_reason') || '') +
            ' [REATIVADO 19/11/2026 — dedup não é falha permanente]',
        )
        app.saveNoValidate(rec)
        reactivatedAttempts++
      } catch (e) {
        console.warn(
          '[MIGRATION_1762900001] Falha ao reescrever attempt ' + rec.id + ': ' + e.message,
        )
      }
    }

    // 1b. Reativa os clientes na fila da régua
    for (const cid in customerIds) {
      try {
        const cust = app.findRecordById('customers', cid)
        if (cust.getString('persistence_status') !== 'ativo') {
          cust.set('persistence_status', 'ativo')
          cust.set('next_follow_up_at', nowIso)
          app.saveNoValidate(cust)
          reactivatedCustomers++
        }
      } catch (e) {
        console.warn('[MIGRATION_1762900001] Falha ao reativar customer ' + cid + ': ' + e.message)
      }
    }

    // 2. convite_vistage -> is_active=false
    let vistageFixed = false
    try {
      const ctrl = app.findFirstRecordByFilter('app_controls', "key = 'convite_vistage'")
      if (ctrl && ctrl.getBool('is_active')) {
        ctrl.set('is_active', false)
        app.saveNoValidate(ctrl)
        vistageFixed = true
      }
    } catch (e) {
      console.warn('[MIGRATION_1762900001] Falha ao desativar convite_vistage: ' + e.message)
    }

    // Auditoria
    try {
      const sysLogs = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(sysLogs)
      logRec.set('type', 'regua_reactivation_audit')
      logRec.set(
        'message',
        'Auditoria régua: ' +
          reactivatedAttempts +
          ' cadence_attempts DEDUP reescritos de permanent_failure para rescheduled; ' +
          reactivatedCustomers +
          ' clientes reativados na régua; convite_vistage=' +
          (vistageFixed ? 'DESATIVADO (estava ligado sem autorização)' : 'já estava desligado'),
      )
      logRec.set(
        'details',
        JSON.stringify({
          migration: '1762900001_reactivate_dedup_failures_and_pause_vistage',
          reactivated_attempts: reactivatedAttempts,
          reactivated_customers: reactivatedCustomers,
          convite_vistage_disabled: vistageFixed,
          timestamp: nowIso,
        }),
      )
      app.saveNoValidate(logRec)
    } catch (_) {}

    console.log(
      '[MIGRATION_1762900001] OK — attempts=' +
        reactivatedAttempts +
        ' customers=' +
        reactivatedCustomers +
        ' convite_vistage_disabled=' +
        vistageFixed,
    )
  },
  (app) => {
    // Revert seguro: apenas religa convite_vistage se existir (dados de dedup não são revertidos)
    try {
      const ctrl = app.findFirstRecordByFilter('app_controls', "key = 'convite_vistage'")
      if (ctrl) {
        ctrl.set('is_active', false)
        app.saveNoValidate(ctrl)
      }
    } catch (_) {}
  },
)
