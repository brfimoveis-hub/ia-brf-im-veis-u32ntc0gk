/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Aumentar limite individual de arquivo na coleção ai_knowledge_files para 200 MB (209715200 bytes)
    try {
      const kbCol = app.findCollectionByNameOrId('ai_knowledge_files')
      const fileField = kbCol.fields.getByName('file')
      if (fileField) {
        fileField.maxSize = 209715200 // 200 MB
      }
      app.save(kbCol)
    } catch (err) {
      console.warn('Aviso migration 0265 ai_knowledge_files file size:', err)
    }

    // 2. Aumentar limite individual na coleção launches para 200 MB
    try {
      const launchesCol = app.findCollectionByNameOrId('launches')
      const attachmentsField = launchesCol.fields.getByName('attachments')
      if (attachmentsField) {
        attachmentsField.maxSize = 209715200 // 200 MB
      }
      const imagesField = launchesCol.fields.getByName('images')
      if (imagesField) {
        imagesField.maxSize = 209715200 // 200 MB
      }
      app.save(launchesCol)
    } catch (err) {
      console.warn('Aviso migration 0265 launches attachments size:', err)
    }

    // 3. Aumentar limite no campo ai_knowledge_files da coleção users para 200 MB
    try {
      const usersCol = app.findCollectionByNameOrId('users')
      const userKbField = usersCol.fields.getByName('ai_knowledge_files')
      if (userKbField) {
        userKbField.maxSize = 209715200 // 200 MB
      }
      app.save(usersCol)
    } catch (err) {
      console.warn('Aviso migration 0265 users ai_knowledge_files size:', err)
    }
  },
  (app) => {
    try {
      const kbCol = app.findCollectionByNameOrId('ai_knowledge_files')
      const fileField = kbCol.fields.getByName('file')
      if (fileField) {
        fileField.maxSize = 104857600 // Reverte para 100 MB
      }
      app.save(kbCol)
    } catch (_) {}

    try {
      const launchesCol = app.findCollectionByNameOrId('launches')
      const attachmentsField = launchesCol.fields.getByName('attachments')
      if (attachmentsField) {
        attachmentsField.maxSize = 104857600
      }
      const imagesField = launchesCol.fields.getByName('images')
      if (imagesField) {
        imagesField.maxSize = 104857600
      }
      app.save(launchesCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('users')
      const userKbField = usersCol.fields.getByName('ai_knowledge_files')
      if (userKbField) {
        userKbField.maxSize = 104857600
      }
      app.save(usersCol)
    } catch (_) {}
  },
)
