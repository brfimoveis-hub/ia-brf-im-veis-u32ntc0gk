/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Garantir que o campo 'file' de ai_knowledge_files suporta arquivos de até 100MB (104857600 bytes)
    try {
      const kbCol = app.findCollectionByNameOrId('ai_knowledge_files')
      const fileField = kbCol.fields.getByName('file')
      if (fileField) {
        fileField.maxSize = 104857600 // 100 MB
      }
      app.save(kbCol)
    } catch (err) {
      console.warn('Aviso migration ai_knowledge_files file size:', err)
    }

    // 2. Garantir que launches suporta anexos e arquivos de até 100MB
    try {
      const launchesCol = app.findCollectionByNameOrId('launches')
      const attachmentsField = launchesCol.fields.getByName('attachments')
      if (attachmentsField) {
        attachmentsField.maxSize = 104857600 // 100 MB
        attachmentsField.maxSelect = 20
        attachmentsField.mimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'image/jpeg',
          'image/png',
          'image/webp',
        ]
      }
      const imagesField = launchesCol.fields.getByName('images')
      if (imagesField) {
        imagesField.maxSize = 104857600 // 100 MB
        imagesField.maxSelect = 50
      }
      app.save(launchesCol)
    } catch (err) {
      console.warn('Aviso migration launches attachments size:', err)
    }
  },
  (app) => {
    try {
      const kbCol = app.findCollectionByNameOrId('ai_knowledge_files')
      const fileField = kbCol.fields.getByName('file')
      if (fileField) {
        fileField.maxSize = 104857600
      }
      app.save(kbCol)
    } catch (_) {}
  },
)
