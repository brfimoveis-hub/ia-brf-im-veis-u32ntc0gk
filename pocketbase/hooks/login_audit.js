/// <reference path="../pb_data/types.d.ts" />
// Auditoria de login (v0.0.1417): registra TODA tentativa de auth com senha
// na coleção users (sucesso e falha) no system_logs, para que o diagnóstico
// apareça nos logs com prova (regra do Mauro: nunca declarar fim de rito
// sem prova nos logs).
//
// REGRA v0.0.1399: handlers só podem referenciar funções declaradas dentro
// do próprio callback — nada de helpers top-level.
onRecordAuthRequest((e) => {
  const email = (() => {
    try {
      return String(e.record.email() || '').toLowerCase()
    } catch (_) {
      return ''
    }
  })()

  try {
    e.next()
    // chegou aqui: auth OK
    const logs = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(logs)
    log.set('type', 'login_audit')
    log.set('message', 'Login realizado com sucesso')
    log.set('payload', JSON.stringify({ email, status: 'success' }))
    $app.save(log)
  } catch (err) {
    // auth falhou: e.next() lançou o erro de credenciais
    const logs = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(logs)
    log.set('type', 'login_audit')
    log.set('message', 'Tentativa de login falhou (credenciais inválidas)')
    log.set('payload', JSON.stringify({ email, status: 'invalid_credentials' }))
    $app.save(log)
    throw err
  }
}, 'users')
