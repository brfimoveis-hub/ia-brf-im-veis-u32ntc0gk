/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Garantir que o limite de arquivo da Base de Conhecimento (ai_knowledge_files)
    // seja expressamente 500 MB (524.288.000 bytes) no schema PocketBase
    try {
      const kbCol = app.findCollectionByNameOrId('ai_knowledge_files')
      if (kbCol) {
        const fileField = kbCol.fields.getByName('file')
        if (fileField) {
          fileField.maxSize = 524288000 // 500 MB
        }
        app.save(kbCol)
        console.log(
          '[MIG_0281] ai_knowledge_files file.maxSize reconfirmado para 524288000 (500 MB)',
        )
      }
    } catch (errKb) {
      console.warn('[MIG_0281] Erro ao atualizar maxSize em ai_knowledge_files:', errKb)
    }

    // 2. Garantir limites de 500 MB também em attachments e images de launches
    try {
      const launchesCol = app.findCollectionByNameOrId('launches')
      if (launchesCol) {
        const attField = launchesCol.fields.getByName('attachments')
        if (attField) attField.maxSize = 524288000
        const imgField = launchesCol.fields.getByName('images')
        if (imgField) imgField.maxSize = 524288000
        app.save(launchesCol)
        console.log('[MIG_0281] launches attachments/images maxSize configurados para 500 MB')
      }
    } catch (errLaunches) {
      console.warn('[MIG_0281] Erro ao atualizar maxSize em launches:', errLaunches)
    }

    // 3. Garantir limites de 500 MB no campo ai_knowledge_files de users
    try {
      const usersCol = app.findCollectionByNameOrId('users')
      if (usersCol) {
        const userKbField = usersCol.fields.getByName('ai_knowledge_files')
        if (userKbField) userKbField.maxSize = 524288000
        app.save(usersCol)
        console.log('[MIG_0281] users ai_knowledge_files maxSize configurado para 500 MB')
      }
    } catch (errUsers) {
      console.warn('[MIG_0281] Erro ao atualizar maxSize em users:', errUsers)
    }
  },
  (app) => {
    // down migration
  },
)
