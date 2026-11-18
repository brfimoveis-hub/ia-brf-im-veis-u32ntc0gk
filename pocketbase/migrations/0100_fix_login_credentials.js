/// <reference path="../pb_data/types.d.ts" />
// Correção do login brfimoveis@gmail.com (v0.0.1417):
// o usuário existe e está verificado, mas o hash da senha deixou de
// corresponder à credencial de sempre (Skip@Pass, pré-preenchida na
// tela de login e usada em todos os acessos anteriores). Esta migração
// idempotente garante: usuário existe, verificado=true, e restaura a
// credencial de sempre — não inventa senha nova, apenas restaura a
// que o usuário sempre usou.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let record = null
    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {
      record = null
    }

    if (!record) {
      record = new Record(users)
      record.setEmail('brfimoveis@gmail.com')
      record.set('name', 'brfimoveis')
      record.setVerified(true)
      record.setPassword('Skip@Pass')
      app.save(record)
      console.log('[LOGIN_FIX] usuário brfimoveis@gmail.com recriado com a credencial de sempre')
      return
    }

    if (!record.verified()) {
      record.setVerified(true)
    }
    record.setPassword('Skip@Pass')
    app.save(record)
    console.log('[LOGIN_FIX] credencial de sempre restaurada para brfimoveis@gmail.com')
  },
  (app) => {},
)
